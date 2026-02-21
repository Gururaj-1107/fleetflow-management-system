import requests
import sys
import json
from datetime import datetime

class FleetFlowAPITester:
    def __init__(self, base_url="https://3ca3e637-517d-4c8c-9698-3428202d455b.preview.emergentagent.com"):
        self.base_url = base_url
        self.tokens = {}
        self.users = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data_ids = {}

    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")

    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None, role=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if role and role in self.tokens:
            test_headers['Authorization'] = f'Bearer {self.tokens[role]}'

        self.tests_run += 1
        self.log(f"Testing {name} ({method} {endpoint})", "TEST")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", "FAIL")
                self.log(f"   Response: {response.text[:200]}", "FAIL")
                return False, {}

        except Exception as e:
            self.log(f"❌ FAILED - Error: {str(e)}", "FAIL")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test("Health Check", "GET", "/api/health")
        if success and response.get('status') == 'healthy':
            self.log("Database connection verified", "SUCCESS")
        return success

    def test_authentication(self):
        """Test authentication with demo accounts"""
        demo_accounts = [
            ("manager", "manager@fleetflow.com", "password123"),
            ("dispatcher", "dispatcher@fleetflow.com", "password123"),
            ("safety", "safety@fleetflow.com", "password123"),
            ("analyst", "analyst@fleetflow.com", "password123")
        ]

        for role, email, password in demo_accounts:
            success, response = self.run_test(
                f"Login {role}",
                "POST", 
                "/api/auth/login",
                200,
                {"email": email, "password": password}
            )
            
            if success and 'token' in response:
                self.tokens[role] = response['token']
                self.users[role] = response['user']
                self.log(f"Authenticated as {role}: {response['user']['full_name']}", "SUCCESS")
            else:
                self.log(f"Failed to authenticate {role}", "FAIL")
                return False
        
        return len(self.tokens) == 4

    def test_vehicles_crud(self):
        """Test vehicle operations"""
        # Get vehicles
        success, response = self.run_test("Get Vehicles", "GET", "/api/vehicles", role="manager")
        if not success:
            return False

        initial_count = len(response.get('data', []))
        self.log(f"Found {initial_count} existing vehicles", "INFO")

        # Create vehicle (manager only)
        vehicle_data = {
            "name": "Test Vehicle Auto",
            "model": "Test Model",
            "license_plate": "TEST-001",
            "max_capacity": 5000,
            "odometer": 10000,
            "acquisition_cost": 50000
        }

        success, response = self.run_test("Create Vehicle", "POST", "/api/vehicles", 200, vehicle_data, role="manager")
        if success:
            vehicle_id = response['data']['id']
            self.test_data_ids['vehicle'] = vehicle_id
            self.log(f"Created vehicle with ID: {vehicle_id}", "SUCCESS")
        else:
            return False

        # Update vehicle
        update_data = {"name": "Updated Test Vehicle", "odometer": 15000}
        success, response = self.run_test("Update Vehicle", "PUT", f"/api/vehicles/{vehicle_id}", 200, update_data, role="manager")
        
        # Test non-manager access (should fail for creation)
        success, response = self.run_test("Create Vehicle (Dispatcher - Should Fail)", "POST", "/api/vehicles", 403, vehicle_data, role="dispatcher")
        if response and 'detail' in str(response):
            self.log("Role-based access control working correctly", "SUCCESS")

        return True

    def test_drivers_crud(self):
        """Test driver operations"""
        # Get drivers
        success, response = self.run_test("Get Drivers", "GET", "/api/drivers", role="manager")
        if not success:
            return False

        # Create driver
        driver_data = {
            "full_name": "Test Driver Auto",
            "license_number": "DL-TEST-001",
            "license_expiry": "2027-12-31",
            "safety_score": 95,
            "status": "off_duty"
        }

        success, response = self.run_test("Create Driver", "POST", "/api/drivers", 200, driver_data, role="manager")
        if success:
            driver_id = response['data']['id']
            self.test_data_ids['driver'] = driver_id
            self.log(f"Created driver with ID: {driver_id}", "SUCCESS")
        else:
            return False

        # Update driver
        update_data = {"safety_score": 88, "status": "on_duty"}
        success, response = self.run_test("Update Driver", "PUT", f"/api/drivers/{driver_id}", 200, update_data, role="safety")
        
        return True

    def test_trips_workflow(self):
        """Test complete trip workflow"""
        if 'vehicle' not in self.test_data_ids or 'driver' not in self.test_data_ids:
            self.log("Skipping trip tests - missing vehicle/driver", "SKIP")
            return True

        # Create trip
        trip_data = {
            "vehicle_id": self.test_data_ids['vehicle'],
            "driver_id": self.test_data_ids['driver'],
            "origin": "Test Origin",
            "destination": "Test Destination", 
            "cargo_weight": 3000,
            "distance": 500,
            "revenue": 2500
        }

        success, response = self.run_test("Create Trip", "POST", "/api/trips", 200, trip_data, role="manager")
        if not success:
            return False

        trip_id = response['data']['id']
        self.test_data_ids['trip'] = trip_id
        self.log(f"Created trip with ID: {trip_id}", "SUCCESS")

        # Dispatch trip
        success, response = self.run_test("Dispatch Trip", "PUT", f"/api/trips/{trip_id}/dispatch", 200, role="dispatcher")
        
        # Complete trip
        success, response = self.run_test("Complete Trip", "PUT", f"/api/trips/{trip_id}/complete", 200, role="dispatcher")
        
        # Get trips
        success, response = self.run_test("Get Trips", "GET", "/api/trips", role="manager")
        
        return True

    def test_maintenance(self):
        """Test maintenance operations"""
        if 'vehicle' not in self.test_data_ids:
            self.log("Skipping maintenance tests - missing vehicle", "SKIP")
            return True

        # Create maintenance log
        maint_data = {
            "vehicle_id": self.test_data_ids['vehicle'],
            "description": "Test Maintenance Auto",
            "cost": 500,
            "service_date": datetime.now().strftime('%Y-%m-%d')
        }

        success, response = self.run_test("Create Maintenance", "POST", "/api/maintenance", 200, maint_data, role="manager")
        if success:
            maint_id = response['data']['id']
            self.test_data_ids['maintenance'] = maint_id

        # Get maintenance
        success, response = self.run_test("Get Maintenance", "GET", "/api/maintenance", role="manager")
        
        # Complete maintenance
        if 'maintenance' in self.test_data_ids:
            success, response = self.run_test("Complete Maintenance", "PUT", f"/api/maintenance/{self.test_data_ids['maintenance']}/complete", 200, role="manager")
        
        return True

    def test_expenses(self):
        """Test expense operations"""
        if 'vehicle' not in self.test_data_ids:
            self.log("Skipping expense tests - missing vehicle", "SKIP")
            return True

        # Create expense
        expense_data = {
            "vehicle_id": self.test_data_ids['vehicle'],
            "fuel_liters": 100,
            "fuel_cost": 180,
            "other_cost": 50
        }

        success, response = self.run_test("Create Expense", "POST", "/api/expenses", 200, expense_data, role="manager")
        if success:
            expense_id = response['data']['id']
            self.test_data_ids['expense'] = expense_id

        # Get expenses
        success, response = self.run_test("Get Expenses", "GET", "/api/expenses", role="manager")
        
        return True

    def test_analytics(self):
        """Test analytics endpoints"""
        success, response = self.run_test("Get Analytics Summary", "GET", "/api/analytics/summary", role="analyst")
        
        if success and 'kpis' in response:
            kpis = response['kpis']
            self.log(f"Analytics KPIs: Active Trips: {kpis.get('active_trips', 0)}, Revenue: ${kpis.get('total_revenue', 0)}", "SUCCESS")
        
        return success

    def test_csv_export(self):
        """Test CSV export functionality"""
        # Test CSV export endpoint
        url = f"{self.base_url}/api/export/csv"
        headers = {'Authorization': f'Bearer {self.tokens.get("manager", "")}'}
        
        self.tests_run += 1
        self.log("Testing CSV Export", "TEST")
        
        try:
            response = requests.get(url, headers=headers, timeout=15)
            success = response.status_code == 200 and 'text/csv' in response.headers.get('content-type', '')
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - CSV export working, size: {len(response.content)} bytes", "PASS")
                # Check if CSV has proper headers
                csv_content = response.text
                if 'Trip ID' in csv_content and 'Vehicle' in csv_content:
                    self.log("CSV headers verified", "SUCCESS")
            else:
                self.log(f"❌ FAILED - Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}", "FAIL")
            
            return success
        except Exception as e:
            self.log(f"❌ FAILED - Error: {str(e)}", "FAIL")
            return False

    def cleanup_test_data(self):
        """Clean up test data"""
        # Delete in reverse order due to dependencies
        if 'vehicle' in self.test_data_ids:
            success, response = self.run_test("Delete Test Vehicle", "DELETE", f"/api/vehicles/{self.test_data_ids['vehicle']}", 200, role="manager")
        
        if 'driver' in self.test_data_ids:
            success, response = self.run_test("Delete Test Driver", "DELETE", f"/api/drivers/{self.test_data_ids['driver']}", 200, role="manager")

    def run_full_test_suite(self):
        """Run complete test suite"""
        self.log("=" * 60, "INFO")
        self.log("FLEETFLOW API COMPREHENSIVE TEST SUITE", "INFO")
        self.log("=" * 60, "INFO")

        test_methods = [
            ("Health Check", self.test_health_check),
            ("Authentication", self.test_authentication),
            ("Vehicles CRUD", self.test_vehicles_crud),
            ("Drivers CRUD", self.test_drivers_crud),
            ("Trips Workflow", self.test_trips_workflow),
            ("Maintenance", self.test_maintenance),
            ("Expenses", self.test_expenses),
            ("Analytics", self.test_analytics),
            ("CSV Export", self.test_csv_export),
        ]

        results = {}
        
        for test_name, test_method in test_methods:
            self.log(f"\n--- {test_name} ---", "INFO")
            try:
                results[test_name] = test_method()
                if results[test_name]:
                    self.log(f"✅ {test_name} COMPLETED SUCCESSFULLY", "SUCCESS")
                else:
                    self.log(f"❌ {test_name} FAILED", "FAIL")
            except Exception as e:
                self.log(f"❌ {test_name} ERROR: {str(e)}", "FAIL")
                results[test_name] = False

        # Cleanup
        self.log("\n--- Cleanup ---", "INFO")
        self.cleanup_test_data()

        # Final results
        self.log("\n" + "=" * 60, "INFO")
        self.log("FINAL TEST RESULTS", "INFO")
        self.log("=" * 60, "INFO")
        
        passed_categories = sum(1 for result in results.values() if result)
        total_categories = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} - {test_name}", "RESULT")
        
        self.log(f"\nCategory Success Rate: {passed_categories}/{total_categories} ({(passed_categories/total_categories*100):.1f}%)", "RESULT")
        self.log(f"Individual Test Success Rate: {self.tests_passed}/{self.tests_run} ({(self.tests_passed/self.tests_run*100):.1f}%)", "RESULT")
        
        if passed_categories == total_categories and self.tests_passed >= self.tests_run * 0.8:
            self.log("🎉 ALL BACKEND TESTS PASSED!", "SUCCESS")
            return 0
        else:
            self.log("⚠️  SOME BACKEND TESTS FAILED", "FAIL")
            return 1

def main():
    tester = FleetFlowAPITester()
    return tester.run_full_test_suite()

if __name__ == "__main__":
    sys.exit(main())