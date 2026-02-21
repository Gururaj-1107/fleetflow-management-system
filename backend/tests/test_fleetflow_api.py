"""
FleetFlow API Test Suite
Tests authentication, CRUD operations, business logic workflows, and export functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vehicle-ops-dev.preview.emergentagent.com')

# Demo credentials
DEMO_MANAGER = {"email": "manager@fleetflow.com", "password": "password123"}
DEMO_DISPATCHER = {"email": "dispatcher@fleetflow.com", "password": "password123"}
DEMO_SAFETY = {"email": "safety@fleetflow.com", "password": "password123"}
DEMO_ANALYST = {"email": "analyst@fleetflow.com", "password": "password123"}


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["db_connected"] is True
        print("✓ Health check passed - database connected")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_login_manager(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_MANAGER)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "manager"
        assert data["user"]["email"] == DEMO_MANAGER["email"]
        print(f"✓ Manager login successful: {data['user']['full_name']}")
        
    def test_login_dispatcher(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_DISPATCHER)
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "dispatcher"
        print(f"✓ Dispatcher login successful: {data['user']['full_name']}")
        
    def test_login_safety(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_SAFETY)
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "safety"
        print(f"✓ Safety officer login successful: {data['user']['full_name']}")
        
    def test_login_analyst(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_ANALYST)
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "analyst"
        print(f"✓ Analyst login successful: {data['user']['full_name']}")
        
    def test_login_invalid_credentials(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com", 
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")
        
    def test_get_current_user(self):
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_MANAGER)
        token = login_res.json()["token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me", 
                               headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == DEMO_MANAGER["email"]
        print("✓ Get current user successful")
        
    def test_forgot_password_mock(self):
        """Test forgot password mock endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", 
                                json={"email": "test@example.com"})
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "email" in data
        print("✓ Forgot password mock endpoint working")


class TestVehicles:
    """Vehicle CRUD tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_MANAGER)
        token = login_res.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_vehicles(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        print(f"✓ Get vehicles returned {len(data['data'])} vehicles")
        
    def test_vehicle_data_structure(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=auth_headers)
        data = response.json()
        if data["data"]:
            vehicle = data["data"][0]
            assert "id" in vehicle
            assert "name" in vehicle
            assert "model" in vehicle
            assert "license_plate" in vehicle
            assert "max_capacity" in vehicle
            assert "status" in vehicle
            print(f"✓ Vehicle data structure valid: {vehicle['name']}")


class TestDrivers:
    """Driver CRUD tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_MANAGER)
        token = login_res.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_drivers(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/drivers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        print(f"✓ Get drivers returned {len(data['data'])} drivers")
        
    def test_driver_data_structure(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/drivers", headers=auth_headers)
        data = response.json()
        if data["data"]:
            driver = data["data"][0]
            assert "id" in driver
            assert "full_name" in driver
            assert "license_number" in driver
            assert "safety_score" in driver
            assert "status" in driver
            print(f"✓ Driver data structure valid: {driver['full_name']}")


class TestTrips:
    """Trip workflow tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_MANAGER)
        token = login_res.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_trips(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/trips", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        print(f"✓ Get trips returned {len(data['data'])} trips")
        
    def test_trip_includes_relations(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/trips", headers=auth_headers)
        data = response.json()
        if data["data"]:
            trip = data["data"][0]
            assert "vehicles" in trip or trip.get("vehicle_id")
            assert "drivers" in trip or trip.get("driver_id")
            print(f"✓ Trip includes relations: {trip.get('origin')} → {trip.get('destination')}")


class TestMaintenance:
    """Maintenance log tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_MANAGER)
        token = login_res.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_maintenance(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/maintenance", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        print(f"✓ Get maintenance returned {len(data['data'])} logs")


class TestExpenses:
    """Expense log tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_MANAGER)
        token = login_res.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_expenses(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/expenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        print(f"✓ Get expenses returned {len(data['data'])} expense records")


class TestAnalytics:
    """Analytics endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_MANAGER)
        token = login_res.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_analytics_summary(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/analytics/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify KPIs structure
        assert "kpis" in data
        kpis = data["kpis"]
        assert "total_vehicles" in kpis
        assert "active_trips" in kpis
        assert "total_revenue" in kpis
        assert "utilization" in kpis
        
        # Verify additional analytics data
        assert "revenue_by_day" in data
        assert "vehicle_roi" in data
        assert "cost_breakdown" in data
        
        print(f"✓ Analytics summary: {kpis['total_vehicles']} vehicles, ${kpis['total_revenue']} revenue")


class TestExport:
    """Export functionality tests"""
    
    @pytest.fixture
    def auth_headers(self):
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_MANAGER)
        token = login_res.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_csv_export(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/export/csv", headers=auth_headers)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        # Verify CSV content
        content = response.text
        assert "Trip ID" in content
        assert "Vehicle" in content
        assert "Driver" in content
        print("✓ CSV export working with proper headers")


class TestRoleBasedAccess:
    """Role-based access control tests"""
    
    def test_analyst_cannot_create_vehicle(self):
        # Login as analyst
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_ANALYST)
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to create vehicle
        response = requests.post(f"{BASE_URL}/api/vehicles", 
                                headers=headers,
                                json={
                                    "name": "Test Vehicle",
                                    "model": "Test",
                                    "license_plate": "TEST-001",
                                    "max_capacity": 1000
                                })
        assert response.status_code == 403
        print("✓ Analyst cannot create vehicles (403 Forbidden)")
        
    def test_dispatcher_can_read_vehicles(self):
        # Login as dispatcher
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_DISPATCHER)
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Read vehicles
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=headers)
        assert response.status_code == 200
        print("✓ Dispatcher can read vehicles (200 OK)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
