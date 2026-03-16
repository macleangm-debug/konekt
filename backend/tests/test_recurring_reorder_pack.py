"""
Test Recurring Services + Reorder Pack
- Reorder Routes: Repeat order, customer order history
- Repeat Service Requests: Repeat service request, customer history
- Recurring Service Plans: CRUD operations
- Recurring Supply Plans: CRUD operations
- Account Manager Routes: Assign, unassign, notes, key accounts
- SLA Alerts: Get alerts, get summary
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "customer@test.com"
CUSTOMER_PASSWORD = "password123"


class TestReorderRoutes:
    """Test /api/reorders endpoints"""

    def test_repeat_order_not_found(self):
        """Test repeating a non-existent order returns 404"""
        response = requests.post(f"{BASE_URL}/api/reorders/order/000000000000000000000000")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Repeat non-existent order returns 404")

    def test_customer_order_history_empty(self):
        """Test fetching order history for a non-existent customer"""
        response = requests.get(f"{BASE_URL}/api/reorders/customer/TEST_customer_123/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print("PASS: Customer order history returns empty list for non-existent customer")


class TestRepeatServiceRequestRoutes:
    """Test /api/repeat-service-requests endpoints"""

    def test_repeat_service_request_not_found(self):
        """Test repeating a non-existent service request returns 404"""
        response = requests.post(f"{BASE_URL}/api/repeat-service-requests/000000000000000000000000")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Repeat non-existent service request returns 404")

    def test_customer_service_request_history_empty(self):
        """Test fetching service request history for a non-existent customer"""
        response = requests.get(f"{BASE_URL}/api/repeat-service-requests/customer/TEST_customer_456/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print("PASS: Customer service request history returns empty list for non-existent customer")


class TestRecurringServicePlansCRUD:
    """Test /api/recurring-service-plans CRUD endpoints"""
    
    created_plan_id = None
    
    def test_01_list_recurring_service_plans(self):
        """Test listing recurring service plans"""
        response = requests.get(f"{BASE_URL}/api/recurring-service-plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: List recurring service plans returns {len(data)} plans")
    
    def test_02_create_recurring_service_plan(self):
        """Test creating a recurring service plan"""
        payload = {
            "customer_id": "TEST_cust_recurring_svc",
            "customer_email": "test_recurring@example.com",
            "customer_name": "Test Recurring Customer",
            "customer_phone": "+255123456789",
            "company_name": "TEST Company Ltd",
            "service_key": "cleaning",
            "service_name": "Office Cleaning",
            "plan_type": "cleaning",
            "frequency": "weekly",
            "preferred_day": "monday",
            "preferred_time_window": "morning",
            "country_code": "TZ",
            "region": "Dar es Salaam",
            "address": "123 Test Street, Dar es Salaam",
            "special_instructions": "Please use eco-friendly products",
            "status": "active",
            "price_per_visit": 50000
        }
        response = requests.post(f"{BASE_URL}/api/recurring-service-plans", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data, "Response should have id"
        assert data["customer_email"] == payload["customer_email"]
        assert data["service_key"] == payload["service_key"]
        assert data["frequency"] == payload["frequency"]
        assert data["status"] == "active"
        
        TestRecurringServicePlansCRUD.created_plan_id = data["id"]
        print(f"PASS: Created recurring service plan with id: {data['id']}")
    
    def test_03_get_recurring_service_plan(self):
        """Test getting a specific recurring service plan"""
        plan_id = TestRecurringServicePlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to fetch")
        
        response = requests.get(f"{BASE_URL}/api/recurring-service-plans/{plan_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["id"] == plan_id
        print(f"PASS: Get recurring service plan {plan_id}")
    
    def test_04_update_recurring_service_plan(self):
        """Test updating a recurring service plan"""
        plan_id = TestRecurringServicePlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to update")
        
        payload = {
            "frequency": "biweekly",
            "price_per_visit": 60000,
            "special_instructions": "Updated instructions"
        }
        response = requests.put(f"{BASE_URL}/api/recurring-service-plans/{plan_id}", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["frequency"] == "biweekly"
        assert data["price_per_visit"] == 60000
        print(f"PASS: Updated recurring service plan {plan_id}")
    
    def test_05_pause_recurring_service_plan(self):
        """Test pausing a recurring service plan"""
        plan_id = TestRecurringServicePlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to pause")
        
        response = requests.post(f"{BASE_URL}/api/recurring-service-plans/{plan_id}/pause")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "paused"
        print(f"PASS: Paused recurring service plan {plan_id}")
    
    def test_06_resume_recurring_service_plan(self):
        """Test resuming a recurring service plan"""
        plan_id = TestRecurringServicePlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to resume")
        
        response = requests.post(f"{BASE_URL}/api/recurring-service-plans/{plan_id}/resume")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "active"
        print(f"PASS: Resumed recurring service plan {plan_id}")
    
    def test_07_cancel_recurring_service_plan(self):
        """Test cancelling a recurring service plan"""
        plan_id = TestRecurringServicePlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to cancel")
        
        response = requests.post(f"{BASE_URL}/api/recurring-service-plans/{plan_id}/cancel")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "cancelled"
        print(f"PASS: Cancelled recurring service plan {plan_id}")
    
    def test_08_delete_recurring_service_plan(self):
        """Test deleting a recurring service plan"""
        plan_id = TestRecurringServicePlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to delete")
        
        response = requests.delete(f"{BASE_URL}/api/recurring-service-plans/{plan_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/recurring-service-plans/{plan_id}")
        assert get_response.status_code == 404
        print(f"PASS: Deleted recurring service plan {plan_id}")
    
    def test_09_get_nonexistent_plan(self):
        """Test getting a non-existent plan returns 404"""
        response = requests.get(f"{BASE_URL}/api/recurring-service-plans/000000000000000000000000")
        assert response.status_code == 404
        print("PASS: Get non-existent recurring service plan returns 404")


class TestRecurringSupplyPlansCRUD:
    """Test /api/recurring-supply-plans CRUD endpoints"""
    
    created_plan_id = None
    
    def test_01_list_recurring_supply_plans(self):
        """Test listing recurring supply plans"""
        response = requests.get(f"{BASE_URL}/api/recurring-supply-plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: List recurring supply plans returns {len(data)} plans")
    
    def test_02_create_recurring_supply_plan(self):
        """Test creating a recurring supply plan"""
        payload = {
            "customer_id": "TEST_cust_recurring_supply",
            "customer_email": "test_supply@example.com",
            "customer_name": "Test Supply Customer",
            "customer_phone": "+255987654321",
            "company_name": "TEST Supply Co",
            "plan_name": "Monthly Office Supplies",
            "items": [
                {"sku": "PAPER-A4", "name": "A4 Paper", "quantity": 10, "unit_price": 15000},
                {"sku": "PEN-BLUE", "name": "Blue Pens", "quantity": 50, "unit_price": 500}
            ],
            "frequency": "monthly",
            "preferred_day": 15,
            "country_code": "TZ",
            "region": "Dar es Salaam",
            "delivery_address": "456 Supply Street, Dar es Salaam",
            "special_instructions": "Deliver to reception",
            "estimated_total": 175000,
            "status": "active",
            "auto_invoice": True,
            "payment_terms": "net_30"
        }
        response = requests.post(f"{BASE_URL}/api/recurring-supply-plans", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data, "Response should have id"
        assert data["customer_email"] == payload["customer_email"]
        assert data["plan_name"] == payload["plan_name"]
        assert data["frequency"] == payload["frequency"]
        assert len(data["items"]) == 2
        
        TestRecurringSupplyPlansCRUD.created_plan_id = data["id"]
        print(f"PASS: Created recurring supply plan with id: {data['id']}")
    
    def test_03_get_recurring_supply_plan(self):
        """Test getting a specific recurring supply plan"""
        plan_id = TestRecurringSupplyPlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to fetch")
        
        response = requests.get(f"{BASE_URL}/api/recurring-supply-plans/{plan_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["id"] == plan_id
        print(f"PASS: Get recurring supply plan {plan_id}")
    
    def test_04_update_recurring_supply_plan(self):
        """Test updating a recurring supply plan"""
        plan_id = TestRecurringSupplyPlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to update")
        
        payload = {
            "frequency": "biweekly",
            "estimated_total": 200000,
            "items": [
                {"sku": "PAPER-A4", "name": "A4 Paper", "quantity": 15, "unit_price": 15000}
            ]
        }
        response = requests.put(f"{BASE_URL}/api/recurring-supply-plans/{plan_id}", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["frequency"] == "biweekly"
        assert len(data["items"]) == 1
        print(f"PASS: Updated recurring supply plan {plan_id}")
    
    def test_05_pause_recurring_supply_plan(self):
        """Test pausing a recurring supply plan"""
        plan_id = TestRecurringSupplyPlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to pause")
        
        response = requests.post(f"{BASE_URL}/api/recurring-supply-plans/{plan_id}/pause")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "paused"
        print(f"PASS: Paused recurring supply plan {plan_id}")
    
    def test_06_resume_recurring_supply_plan(self):
        """Test resuming a recurring supply plan"""
        plan_id = TestRecurringSupplyPlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to resume")
        
        response = requests.post(f"{BASE_URL}/api/recurring-supply-plans/{plan_id}/resume")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "active"
        print(f"PASS: Resumed recurring supply plan {plan_id}")
    
    def test_07_cancel_recurring_supply_plan(self):
        """Test cancelling a recurring supply plan"""
        plan_id = TestRecurringSupplyPlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to cancel")
        
        response = requests.post(f"{BASE_URL}/api/recurring-supply-plans/{plan_id}/cancel")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "cancelled"
        print(f"PASS: Cancelled recurring supply plan {plan_id}")
    
    def test_08_delete_recurring_supply_plan(self):
        """Test deleting a recurring supply plan"""
        plan_id = TestRecurringSupplyPlansCRUD.created_plan_id
        if not plan_id:
            pytest.skip("No plan created to delete")
        
        response = requests.delete(f"{BASE_URL}/api/recurring-supply-plans/{plan_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/recurring-supply-plans/{plan_id}")
        assert get_response.status_code == 404
        print(f"PASS: Deleted recurring supply plan {plan_id}")


class TestAccountManagerRoutes:
    """Test /api/admin/account-managers endpoints"""
    
    test_customer_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test customer for account manager assignment"""
        # First try to find or create a test customer
        response = requests.get(f"{BASE_URL}/api/admin/customers")
        if response.status_code == 200:
            customers = response.json()
            if customers and len(customers) > 0:
                # Use first customer for testing
                TestAccountManagerRoutes.test_customer_id = customers[0].get("id")
    
    def test_01_assign_customer_validation(self):
        """Test assigning account manager requires customer_id and email"""
        response = requests.post(f"{BASE_URL}/api/admin/account-managers/assign-customer", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Assign customer requires customer_id and account_manager_email")
    
    def test_02_assign_customer_not_found(self):
        """Test assigning to non-existent customer returns 404"""
        payload = {
            "customer_id": "000000000000000000000000",
            "account_manager_email": "manager@test.com"
        }
        response = requests.post(f"{BASE_URL}/api/admin/account-managers/assign-customer", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Assign to non-existent customer returns 404")
    
    def test_03_get_my_accounts(self):
        """Test getting accounts assigned to a manager"""
        response = requests.get(f"{BASE_URL}/api/admin/account-managers/my-accounts?account_manager_email=test@example.com")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print("PASS: Get my accounts returns list")
    
    def test_04_get_key_accounts(self):
        """Test getting all key accounts"""
        response = requests.get(f"{BASE_URL}/api/admin/account-managers/key-accounts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print("PASS: Get key accounts returns list")
    
    def test_05_add_note_validation(self):
        """Test adding note requires customer_id and note"""
        response = requests.post(f"{BASE_URL}/api/admin/account-managers/add-note", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Add note requires customer_id and note")
    
    def test_06_get_notes_for_customer(self):
        """Test getting notes for a customer"""
        response = requests.get(f"{BASE_URL}/api/admin/account-managers/notes/000000000000000000000000")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print("PASS: Get notes for customer returns list")


class TestSlaAlertsRoutes:
    """Test /api/admin/sla-alerts endpoints"""
    
    def test_01_get_sla_alerts(self):
        """Test getting SLA alerts list"""
        response = requests.get(f"{BASE_URL}/api/admin/sla-alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are alerts, verify structure
        if len(data) > 0:
            alert = data[0]
            assert "alert_type" in alert, "Alert should have alert_type"
            assert "entity_type" in alert, "Alert should have entity_type"
            assert "entity_id" in alert, "Alert should have entity_id"
            assert "priority" in alert, "Alert should have priority"
            assert "reason" in alert, "Alert should have reason"
            print(f"PASS: Get SLA alerts returns {len(data)} alerts with proper structure")
        else:
            print("PASS: Get SLA alerts returns empty list (no active alerts)")
    
    def test_02_get_sla_summary(self):
        """Test getting SLA summary"""
        response = requests.get(f"{BASE_URL}/api/admin/sla-alerts/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify summary structure
        assert "total_alerts" in data, "Summary should have total_alerts"
        assert "delayed_orders" in data, "Summary should have delayed_orders"
        assert "stale_service_requests" in data, "Summary should have stale_service_requests"
        assert "overdue_recurring_plans" in data, "Summary should have overdue_recurring_plans"
        assert "health_status" in data, "Summary should have health_status"
        assert data["health_status"] in ["healthy", "at_risk", "critical"], f"Invalid health_status: {data['health_status']}"
        
        print(f"PASS: SLA Summary - Total: {data['total_alerts']}, Delayed: {data['delayed_orders']}, Stale: {data['stale_service_requests']}, Health: {data['health_status']}")


class TestFilteredQueries:
    """Test filtering capabilities of recurring plan endpoints"""
    
    def test_filter_service_plans_by_status(self):
        """Test filtering service plans by status"""
        response = requests.get(f"{BASE_URL}/api/recurring-service-plans?status=active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Verify all returned plans have active status
        for plan in data:
            assert plan.get("status") == "active", f"Expected active status, got {plan.get('status')}"
        print(f"PASS: Filter service plans by status=active returns {len(data)} plans")
    
    def test_filter_service_plans_by_email(self):
        """Test filtering service plans by customer email"""
        response = requests.get(f"{BASE_URL}/api/recurring-service-plans?customer_email=test@example.com")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Filter service plans by customer_email returns {len(data)} plans")
    
    def test_filter_supply_plans_by_status(self):
        """Test filtering supply plans by status"""
        response = requests.get(f"{BASE_URL}/api/recurring-supply-plans?status=active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        for plan in data:
            assert plan.get("status") == "active", f"Expected active status, got {plan.get('status')}"
        print(f"PASS: Filter supply plans by status=active returns {len(data)} plans")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
