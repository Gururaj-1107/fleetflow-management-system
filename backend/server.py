import os
import jwt
import bcrypt
import csv
import io
from datetime import datetime, timezone, timedelta, date
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FleetFlow API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
JWT_SECRET = os.environ.get("JWT_SECRET", "fleetflow-jwt-secret-2024")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# --- Pydantic Models ---
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str

class LoginRequest(BaseModel):
    email: str
    password: str

class VehicleCreate(BaseModel):
    name: str
    model: Optional[str] = ""
    license_plate: str
    max_capacity: float
    odometer: float = 0
    acquisition_cost: float = 0

class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    license_plate: Optional[str] = None
    max_capacity: Optional[float] = None
    odometer: Optional[float] = None
    status: Optional[str] = None
    acquisition_cost: Optional[float] = None

class DriverCreate(BaseModel):
    full_name: str
    license_number: str
    license_expiry: str
    safety_score: float = 100
    status: str = "off_duty"

class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    safety_score: Optional[float] = None
    status: Optional[str] = None

class TripCreate(BaseModel):
    vehicle_id: str
    driver_id: str
    origin: str
    destination: str
    cargo_weight: float
    distance: float = 0
    revenue: float = 0

class MaintenanceCreate(BaseModel):
    vehicle_id: str
    description: str
    cost: float
    service_date: str

class ExpenseCreate(BaseModel):
    vehicle_id: str
    trip_id: Optional[str] = None
    fuel_liters: float = 0
    fuel_cost: float = 0
    other_cost: float = 0

# --- Auth Helpers ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str, email: str, full_name: str) -> str:
    payload = {"user_id": user_id, "role": role, "email": email, "full_name": full_name, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = auth_header[7:]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles):
    def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker

# --- Health & Setup ---
@app.get("/api/health")
async def health():
    try:
        result = supabase.table('vehicles').select('id').limit(1).execute()
        return {"status": "healthy", "db_connected": True}
    except Exception as e:
        return {"status": "setup_required", "db_connected": False, "error": str(e)}

@app.get("/api/setup/schema")
async def get_schema():
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    try:
        with open(schema_path, 'r') as f:
            return {"sql": f.read(), "instructions": "Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New query)"}
    except Exception:
        return {"error": "schema.sql not found"}

# --- Auth Endpoints ---
@app.post("/api/auth/register")
async def register(data: RegisterRequest):
    if data.role not in ['manager', 'dispatcher', 'safety', 'analyst']:
        raise HTTPException(400, "Invalid role. Must be: manager, dispatcher, safety, analyst")
    try:
        existing = supabase.table('users').select('id').eq('email', data.email).execute()
        if existing.data:
            raise HTTPException(409, "Email already registered")
    except HTTPException:
        raise
    except Exception as e:
        if "relation" in str(e).lower() and "does not exist" in str(e).lower():
            raise HTTPException(503, "Database not set up. Please run schema.sql in Supabase SQL Editor.")
        raise HTTPException(500, str(e))
    
    password_hash = hash_password(data.password)
    user_data = {"email": data.email, "password_hash": password_hash, "full_name": data.full_name, "role": data.role, "status": "active"}
    result = supabase.table('users').insert(user_data).execute()
    user = result.data[0]
    token = create_token(user['id'], user['role'], user['email'], user['full_name'])
    return {"token": token, "user": {"id": user['id'], "email": user['email'], "full_name": user['full_name'], "role": user['role']}}

@app.post("/api/auth/login")
async def login(data: LoginRequest):
    try:
        result = supabase.table('users').select('*').eq('email', data.email).execute()
    except Exception as e:
        if "does not exist" in str(e).lower():
            raise HTTPException(503, "Database not set up")
        raise HTTPException(500, str(e))
    if not result.data:
        raise HTTPException(401, "Invalid credentials")
    user = result.data[0]
    if not verify_password(data.password, user['password_hash']):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user['id'], user['role'], user['email'], user['full_name'])
    return {"token": token, "user": {"id": user['id'], "email": user['email'], "full_name": user['full_name'], "role": user['role']}}

@app.get("/api/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {"user": user}

# --- Vehicles ---
@app.get("/api/vehicles")
async def get_vehicles(user=Depends(get_current_user)):
    result = supabase.table('vehicles').select('*').order('created_at', desc=True).execute()
    return {"data": result.data}

@app.post("/api/vehicles")
async def create_vehicle(data: VehicleCreate, user=Depends(require_role('manager'))):
    vehicle_data = data.model_dump()
    vehicle_data['status'] = 'available'
    result = supabase.table('vehicles').insert(vehicle_data).execute()
    return {"data": result.data[0]}

@app.put("/api/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: VehicleUpdate, user=Depends(require_role('manager'))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")
    result = supabase.table('vehicles').update(update_data).eq('id', vehicle_id).execute()
    return {"data": result.data[0] if result.data else None}

@app.delete("/api/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user=Depends(require_role('manager'))):
    trips = supabase.table('trips').select('id').eq('vehicle_id', vehicle_id).eq('status', 'dispatched').execute()
    if trips.data:
        raise HTTPException(400, "Cannot delete vehicle with active trips")
    try:
        supabase.table('expenses').delete().eq('vehicle_id', vehicle_id).execute()
        supabase.table('maintenance_logs').delete().eq('vehicle_id', vehicle_id).execute()
        supabase.table('trips').delete().eq('vehicle_id', vehicle_id).execute()
        supabase.table('vehicles').delete().eq('id', vehicle_id).execute()
    except Exception as e:
        raise HTTPException(400, f"Cannot delete vehicle: {str(e)}")
    return {"success": True}

# --- Drivers ---
@app.get("/api/drivers")
async def get_drivers(user=Depends(get_current_user)):
    result = supabase.table('drivers').select('*').order('created_at', desc=True).execute()
    return {"data": result.data}

@app.post("/api/drivers")
async def create_driver(data: DriverCreate, user=Depends(require_role('manager', 'safety'))):
    result = supabase.table('drivers').insert(data.model_dump()).execute()
    return {"data": result.data[0]}

@app.put("/api/drivers/{driver_id}")
async def update_driver(driver_id: str, data: DriverUpdate, user=Depends(require_role('manager', 'safety'))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = supabase.table('drivers').update(update_data).eq('id', driver_id).execute()
    return {"data": result.data[0] if result.data else None}

@app.delete("/api/drivers/{driver_id}")
async def delete_driver(driver_id: str, user=Depends(require_role('manager'))):
    trips = supabase.table('trips').select('id').eq('driver_id', driver_id).eq('status', 'dispatched').execute()
    if trips.data:
        raise HTTPException(400, "Cannot delete driver with active trips")
    try:
        supabase.table('trips').update({'driver_id': None}).eq('driver_id', driver_id).execute()
        supabase.table('drivers').delete().eq('id', driver_id).execute()
    except Exception as e:
        raise HTTPException(400, f"Cannot delete driver: {str(e)}")
    return {"success": True}

# --- Trips (Business Logic) ---
@app.get("/api/trips")
async def get_trips(user=Depends(get_current_user)):
    result = supabase.table('trips').select('*, vehicles(*), drivers(*)').order('created_at', desc=True).execute()
    return {"data": result.data}

@app.post("/api/trips")
async def create_trip(data: TripCreate, user=Depends(require_role('manager', 'dispatcher'))):
    vehicle = supabase.table('vehicles').select('*').eq('id', data.vehicle_id).execute()
    if not vehicle.data:
        raise HTTPException(404, "Vehicle not found")
    v = vehicle.data[0]
    if v['status'] != 'available':
        raise HTTPException(400, f"Vehicle is '{v['status']}', must be 'available'")
    
    driver = supabase.table('drivers').select('*').eq('id', data.driver_id).execute()
    if not driver.data:
        raise HTTPException(404, "Driver not found")
    d = driver.data[0]
    if d['status'] == 'suspended':
        raise HTTPException(400, "Driver is suspended")
    if d['license_expiry']:
        expiry = datetime.strptime(d['license_expiry'], '%Y-%m-%d').date()
        if expiry < date.today():
            raise HTTPException(400, "Driver's license has expired")
    if data.cargo_weight > v['max_capacity']:
        raise HTTPException(400, f"Cargo weight ({data.cargo_weight}kg) exceeds vehicle capacity ({v['max_capacity']}kg)")
    
    trip_data = data.model_dump()
    trip_data['status'] = 'draft'
    result = supabase.table('trips').insert(trip_data).execute()
    return {"data": result.data[0]}

@app.put("/api/trips/{trip_id}/dispatch")
async def dispatch_trip(trip_id: str, user=Depends(require_role('manager', 'dispatcher'))):
    trip = supabase.table('trips').select('*').eq('id', trip_id).execute()
    if not trip.data:
        raise HTTPException(404, "Trip not found")
    t = trip.data[0]
    if t['status'] != 'draft':
        raise HTTPException(400, f"Trip is '{t['status']}', must be 'draft' to dispatch")
    
    vehicle = supabase.table('vehicles').select('status').eq('id', t['vehicle_id']).execute()
    if vehicle.data and vehicle.data[0]['status'] != 'available':
        raise HTTPException(400, "Vehicle is no longer available")
    
    now = datetime.now(timezone.utc).isoformat()
    supabase.table('trips').update({'status': 'dispatched', 'start_time': now}).eq('id', trip_id).execute()
    supabase.table('vehicles').update({'status': 'on_trip'}).eq('id', t['vehicle_id']).execute()
    supabase.table('drivers').update({'status': 'on_duty'}).eq('id', t['driver_id']).execute()
    
    result = supabase.table('trips').select('*, vehicles(*), drivers(*)').eq('id', trip_id).execute()
    return {"data": result.data[0]}

@app.put("/api/trips/{trip_id}/complete")
async def complete_trip(trip_id: str, user=Depends(require_role('manager', 'dispatcher'))):
    trip = supabase.table('trips').select('*').eq('id', trip_id).execute()
    if not trip.data:
        raise HTTPException(404, "Trip not found")
    t = trip.data[0]
    if t['status'] != 'dispatched':
        raise HTTPException(400, "Trip must be dispatched to complete")
    
    now = datetime.now(timezone.utc).isoformat()
    supabase.table('trips').update({'status': 'completed', 'end_time': now}).eq('id', trip_id).execute()
    supabase.table('vehicles').update({'status': 'available'}).eq('id', t['vehicle_id']).execute()
    supabase.table('drivers').update({'status': 'off_duty'}).eq('id', t['driver_id']).execute()
    
    result = supabase.table('trips').select('*, vehicles(*), drivers(*)').eq('id', trip_id).execute()
    return {"data": result.data[0]}

@app.put("/api/trips/{trip_id}/cancel")
async def cancel_trip(trip_id: str, user=Depends(require_role('manager', 'dispatcher'))):
    trip = supabase.table('trips').select('*').eq('id', trip_id).execute()
    if not trip.data:
        raise HTTPException(404, "Trip not found")
    t = trip.data[0]
    if t['status'] not in ['draft', 'dispatched']:
        raise HTTPException(400, "Only draft or dispatched trips can be cancelled")
    
    if t['status'] == 'dispatched':
        supabase.table('vehicles').update({'status': 'available'}).eq('id', t['vehicle_id']).execute()
        supabase.table('drivers').update({'status': 'off_duty'}).eq('id', t['driver_id']).execute()
    
    supabase.table('trips').update({'status': 'cancelled'}).eq('id', trip_id).execute()
    result = supabase.table('trips').select('*, vehicles(*), drivers(*)').eq('id', trip_id).execute()
    return {"data": result.data[0]}

# --- Maintenance ---
@app.get("/api/maintenance")
async def get_maintenance(user=Depends(get_current_user)):
    result = supabase.table('maintenance_logs').select('*, vehicles(*)').order('created_at', desc=True).execute()
    return {"data": result.data}

@app.post("/api/maintenance")
async def create_maintenance(data: MaintenanceCreate, user=Depends(require_role('manager'))):
    maint_data = data.model_dump()
    maint_data['status'] = 'in_progress'
    result = supabase.table('maintenance_logs').insert(maint_data).execute()
    supabase.table('vehicles').update({'status': 'in_shop'}).eq('id', data.vehicle_id).execute()
    return {"data": result.data[0]}

@app.put("/api/maintenance/{maint_id}/complete")
async def complete_maintenance(maint_id: str, user=Depends(require_role('manager'))):
    maint = supabase.table('maintenance_logs').select('*').eq('id', maint_id).execute()
    if not maint.data:
        raise HTTPException(404, "Maintenance log not found")
    supabase.table('maintenance_logs').update({'status': 'completed'}).eq('id', maint_id).execute()
    supabase.table('vehicles').update({'status': 'available'}).eq('id', maint.data[0]['vehicle_id']).execute()
    result = supabase.table('maintenance_logs').select('*, vehicles(*)').eq('id', maint_id).execute()
    return {"data": result.data[0]}

# --- Expenses ---
@app.get("/api/expenses")
async def get_expenses(user=Depends(get_current_user)):
    result = supabase.table('expenses').select('*, vehicles(*), trips(*)').order('created_at', desc=True).execute()
    return {"data": result.data}

@app.post("/api/expenses")
async def create_expense(data: ExpenseCreate, user=Depends(require_role('manager', 'dispatcher'))):
    expense_data = data.model_dump()
    if expense_data.get('trip_id') == '':
        expense_data['trip_id'] = None
    result = supabase.table('expenses').insert(expense_data).execute()
    return {"data": result.data[0]}

# --- Analytics ---
@app.get("/api/analytics/summary")
async def get_analytics_summary(user=Depends(get_current_user)):
    vehicles = supabase.table('vehicles').select('*').execute().data
    trips = supabase.table('trips').select('*').execute().data
    drivers = supabase.table('drivers').select('*').execute().data
    expenses = supabase.table('expenses').select('*').execute().data
    maintenance = supabase.table('maintenance_logs').select('*').execute().data
    
    total_vehicles = len(vehicles)
    available = len([v for v in vehicles if v['status'] == 'available'])
    on_trip = len([v for v in vehicles if v['status'] == 'on_trip'])
    in_shop = len([v for v in vehicles if v['status'] == 'in_shop'])
    active_trips = len([t for t in trips if t['status'] == 'dispatched'])
    completed_trips = len([t for t in trips if t['status'] == 'completed'])
    total_revenue = sum(float(t.get('revenue', 0) or 0) for t in trips if t['status'] == 'completed')
    total_fuel_cost = sum(float(e.get('fuel_cost', 0) or 0) for e in expenses)
    total_maint_cost = sum(float(m.get('cost', 0) or 0) for m in maintenance)
    total_other_cost = sum(float(e.get('other_cost', 0) or 0) for e in expenses)
    utilization = (on_trip / total_vehicles * 100) if total_vehicles > 0 else 0
    total_fuel_liters = sum(float(e.get('fuel_liters', 0) or 0) for e in expenses)
    total_distance = sum(float(t.get('distance', 0) or 0) for t in trips if t['status'] == 'completed')
    fuel_efficiency = (total_distance / total_fuel_liters) if total_fuel_liters > 0 else 0
    
    from collections import defaultdict
    revenue_by_day = defaultdict(float)
    expense_by_day = defaultdict(float)
    for t in trips:
        if t['status'] == 'completed' and t.get('end_time'):
            day = t['end_time'][:10]
            revenue_by_day[day] += float(t.get('revenue', 0) or 0)
    for e in expenses:
        if e.get('created_at'):
            day = e['created_at'][:10]
            expense_by_day[day] += float(e.get('fuel_cost', 0) or 0) + float(e.get('other_cost', 0) or 0)
    
    vehicle_roi = []
    for v in vehicles:
        v_trips = [t for t in trips if t.get('vehicle_id') == v['id'] and t['status'] == 'completed']
        v_expenses = [e for e in expenses if e.get('vehicle_id') == v['id']]
        v_maint = [m for m in maintenance if m.get('vehicle_id') == v['id']]
        v_revenue = sum(float(t.get('revenue', 0) or 0) for t in v_trips)
        v_cost = sum(float(e.get('fuel_cost', 0) or 0) + float(e.get('other_cost', 0) or 0) for e in v_expenses) + sum(float(m.get('cost', 0) or 0) for m in v_maint)
        acq = float(v.get('acquisition_cost', 1) or 1)
        roi = ((v_revenue - v_cost) / acq * 100) if acq > 0 else 0
        vehicle_roi.append({"id": v['id'], "name": v['name'], "revenue": v_revenue, "cost": v_cost, "roi": round(roi, 1)})
    
    return {
        "kpis": {
            "total_vehicles": total_vehicles, "available_vehicles": available, "on_trip_vehicles": on_trip,
            "in_shop_vehicles": in_shop, "active_trips": active_trips, "completed_trips": completed_trips,
            "total_revenue": total_revenue, "total_fuel_cost": total_fuel_cost, "total_maintenance_cost": total_maint_cost,
            "total_expenses": total_fuel_cost + total_maint_cost + total_other_cost,
            "utilization": round(utilization, 1), "fuel_efficiency": round(fuel_efficiency, 2),
            "on_duty_drivers": len([d for d in drivers if d['status'] == 'on_duty']), "total_drivers": len(drivers)
        },
        "revenue_by_day": dict(revenue_by_day),
        "expense_by_day": dict(expense_by_day),
        "vehicle_roi": vehicle_roi,
        "cost_breakdown": {"fuel": total_fuel_cost, "maintenance": total_maint_cost, "other": total_other_cost}
    }

# --- Export ---
@app.get("/api/export/csv")
async def export_csv(user=Depends(get_current_user)):
    trips = supabase.table('trips').select('*, vehicles(name), drivers(full_name)').execute().data
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Trip ID', 'Vehicle', 'Driver', 'Origin', 'Destination', 'Cargo Weight', 'Distance', 'Revenue', 'Status', 'Start Time', 'End Time'])
    for t in trips:
        writer.writerow([t['id'], (t.get('vehicles') or {}).get('name', ''), (t.get('drivers') or {}).get('full_name', ''),
            t['origin'], t['destination'], t['cargo_weight'], t.get('distance', 0), t.get('revenue', 0),
            t['status'], t.get('start_time', ''), t.get('end_time', '')])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=fleetflow_report.csv"})

# --- Seed Data ---
@app.post("/api/seed")
async def seed_data():
    try:
        existing = supabase.table('vehicles').select('id').limit(1).execute()
        if existing.data:
            return {"message": "Data already exists", "skipped": True}
    except Exception as e:
        raise HTTPException(503, f"Database tables not created. Please run schema.sql first. Error: {str(e)}")
    
    users = [
        {"email": "manager@fleetflow.com", "password_hash": hash_password("password123"), "full_name": "Alex Thompson", "role": "manager"},
        {"email": "dispatcher@fleetflow.com", "password_hash": hash_password("password123"), "full_name": "Sarah Chen", "role": "dispatcher"},
        {"email": "safety@fleetflow.com", "password_hash": hash_password("password123"), "full_name": "Mike Rodriguez", "role": "safety"},
        {"email": "analyst@fleetflow.com", "password_hash": hash_password("password123"), "full_name": "Emily Park", "role": "analyst"},
    ]
    supabase.table('users').insert(users).execute()
    
    vehicles_data = [
        {"name": "Falcon X Truck", "model": "Ford F-750", "license_plate": "FL-001-TX", "max_capacity": 8000, "odometer": 45230, "status": "on_trip", "acquisition_cost": 85000},
        {"name": "Atlas Cargo Van", "model": "Mercedes Sprinter", "license_plate": "FL-002-AC", "max_capacity": 3500, "odometer": 32100, "status": "on_trip", "acquisition_cost": 52000},
        {"name": "Titan Heavy Loader", "model": "Volvo FH16", "license_plate": "FL-003-TH", "max_capacity": 15000, "odometer": 78500, "status": "on_trip", "acquisition_cost": 125000},
        {"name": "SwiftCity Delivery", "model": "Toyota Dyna", "license_plate": "FL-004-SC", "max_capacity": 2000, "odometer": 18700, "status": "in_shop", "acquisition_cost": 35000},
        {"name": "Horizon Transport", "model": "Kenworth T680", "license_plate": "FL-005-HT", "max_capacity": 12000, "odometer": 92300, "status": "in_shop", "acquisition_cost": 110000},
        {"name": "Metro Express", "model": "Isuzu NPR", "license_plate": "FL-006-ME", "max_capacity": 4500, "odometer": 28400, "status": "available", "acquisition_cost": 42000},
        {"name": "Thunder Hauler", "model": "Peterbilt 579", "license_plate": "FL-007-TH", "max_capacity": 18000, "odometer": 115000, "status": "retired", "acquisition_cost": 145000},
        {"name": "Blaze Runner", "model": "Freightliner Cascadia", "license_plate": "FL-008-BR", "max_capacity": 10000, "odometer": 56700, "status": "available", "acquisition_cost": 95000},
    ]
    v_res = supabase.table('vehicles').insert(vehicles_data).execute()
    vids = [v['id'] for v in v_res.data]
    
    drivers_data = [
        {"full_name": "Alex Martinez", "license_number": "DL-2024-001", "license_expiry": "2027-06-15", "safety_score": 95, "status": "on_duty"},
        {"full_name": "Priya Shah", "license_number": "DL-2024-002", "license_expiry": "2026-11-30", "safety_score": 88, "status": "on_duty"},
        {"full_name": "Daniel Kim", "license_number": "DL-2024-003", "license_expiry": "2027-03-22", "safety_score": 92, "status": "on_duty"},
        {"full_name": "Fatima Noor", "license_number": "DL-2024-004", "license_expiry": "2026-02-28", "safety_score": 78, "status": "off_duty"},
        {"full_name": "Marcus Johnson", "license_number": "DL-2024-005", "license_expiry": "2026-08-10", "safety_score": 55, "status": "suspended"},
        {"full_name": "Lisa Wong", "license_number": "DL-2024-006", "license_expiry": "2027-12-01", "safety_score": 97, "status": "off_duty"},
    ]
    d_res = supabase.table('drivers').insert(drivers_data).execute()
    dids = [d['id'] for d in d_res.data]
    
    now = datetime.now(timezone.utc)
    trips_data = [
        {"vehicle_id": vids[0], "driver_id": dids[0], "origin": "Los Angeles, CA", "destination": "San Francisco, CA", "cargo_weight": 5500, "distance": 615, "revenue": 4200, "status": "dispatched", "start_time": now.isoformat()},
        {"vehicle_id": vids[1], "driver_id": dids[1], "origin": "Chicago, IL", "destination": "Detroit, MI", "cargo_weight": 2800, "distance": 450, "revenue": 3100, "status": "dispatched", "start_time": (now - timedelta(hours=3)).isoformat()},
        {"vehicle_id": vids[2], "driver_id": dids[2], "origin": "Houston, TX", "destination": "Dallas, TX", "cargo_weight": 12000, "distance": 385, "revenue": 5800, "status": "dispatched", "start_time": (now - timedelta(hours=5)).isoformat()},
        {"vehicle_id": vids[5], "driver_id": dids[3], "origin": "New York, NY", "destination": "Boston, MA", "cargo_weight": 1500, "distance": 340, "revenue": 2400, "status": "draft"},
        {"vehicle_id": vids[0], "driver_id": dids[0], "origin": "Seattle, WA", "destination": "Portland, OR", "cargo_weight": 4200, "distance": 280, "revenue": 1800, "status": "completed", "start_time": (now - timedelta(days=1)).isoformat(), "end_time": (now - timedelta(hours=18)).isoformat()},
        {"vehicle_id": vids[1], "driver_id": dids[1], "origin": "Miami, FL", "destination": "Atlanta, GA", "cargo_weight": 3000, "distance": 1065, "revenue": 7500, "status": "completed", "start_time": (now - timedelta(days=2)).isoformat(), "end_time": (now - timedelta(days=1, hours=6)).isoformat()},
        {"vehicle_id": vids[2], "driver_id": dids[2], "origin": "Denver, CO", "destination": "Phoenix, AZ", "cargo_weight": 9800, "distance": 945, "revenue": 6200, "status": "completed", "start_time": (now - timedelta(days=3)).isoformat(), "end_time": (now - timedelta(days=2)).isoformat()},
        {"vehicle_id": vids[5], "driver_id": dids[5], "origin": "Austin, TX", "destination": "San Antonio, TX", "cargo_weight": 1200, "distance": 130, "revenue": 950, "status": "cancelled"},
    ]
    supabase.table('trips').insert(trips_data).execute()
    
    maint_data = [
        {"vehicle_id": vids[3], "description": "Brake Replacement - Front axle", "cost": 1200, "service_date": str(date.today()), "status": "in_progress"},
        {"vehicle_id": vids[4], "description": "Engine Diagnostics & Tune-up", "cost": 800, "service_date": str(date.today()), "status": "in_progress"},
        {"vehicle_id": vids[0], "description": "Oil Change & Filter", "cost": 250, "service_date": str(date.today() - timedelta(days=15)), "status": "completed"},
        {"vehicle_id": vids[1], "description": "Tire Rotation", "cost": 180, "service_date": str(date.today() - timedelta(days=10)), "status": "completed"},
        {"vehicle_id": vids[2], "description": "Transmission Service", "cost": 2500, "service_date": str(date.today() - timedelta(days=20)), "status": "completed"},
    ]
    supabase.table('maintenance_logs').insert(maint_data).execute()
    
    exp_data = [
        {"vehicle_id": vids[0], "fuel_liters": 120, "fuel_cost": 210, "other_cost": 45},
        {"vehicle_id": vids[1], "fuel_liters": 85, "fuel_cost": 148, "other_cost": 30},
        {"vehicle_id": vids[2], "fuel_liters": 200, "fuel_cost": 350, "other_cost": 80},
        {"vehicle_id": vids[5], "fuel_liters": 60, "fuel_cost": 105, "other_cost": 15},
        {"vehicle_id": vids[0], "fuel_liters": 95, "fuel_cost": 166, "other_cost": 25},
    ]
    supabase.table('expenses').insert(exp_data).execute()
    
    return {"message": "Demo data seeded successfully", "counts": {"users": 4, "vehicles": 8, "drivers": 6, "trips": 8, "maintenance": 5, "expenses": 5}}
