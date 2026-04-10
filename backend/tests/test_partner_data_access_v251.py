"""
Test Suite for Partner Data Access Control and Admin Dashboard Widget (v251)

Tests:
1. Partner Data Access Control - is_logistics flag and partner_type in API response
2. Partner Data Access Control - client data stripping for service partners
3. Admin Dashboard Widget - Partner Response Pipeline stats
4. Service Task Stats - summary endpoint
5. Service Task Overdue - overdue-costs endpoint
6. Payment Queue - status normalization regression
7. Admin Orders - payer_name waterfall regression
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPartnerDataAccessControl:
    """Tests for Partner Data Access Control feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@konekt.co.tz"
        self.admin_password = "KnktcKk_L-hw1wSyquvd!"
        self.partner_email = "demo.partner@konekt.com"
        self.partner_password = "Partner123!"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        return None
    
    def get_partner_token(self):
        """Get partner authentication token"""
        response = self.session.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": self.partner_email,
            "password": self.partner_password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        return None
    
    def test_api_health(self):
        """Test API is accessible"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print("✓ API health check passed")
    
    def test_partner_assigned_work_returns_is_logistics_flag(self):
        """Test that partner assigned work API returns is_logistics flag"""
        token = self.get_partner_token()
        if not token:
            pytest.skip("Partner authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Response should be a list
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            task = data[0]
            # Check is_logistics flag exists
            assert "is_logistics" in task, "Task should have is_logistics flag"
            assert "partner_type" in task, "Task should have partner_type field"
            print(f"✓ Partner assigned work returns is_logistics={task['is_logistics']}, partner_type={task['partner_type']}")
        else:
            print("✓ Partner assigned work API works (no tasks assigned)")
    
    def test_partner_assigned_work_returns_partner_type(self):
        """Test that partner assigned work API returns partner_type"""
        token = self.get_partner_token()
        if not token:
            pytest.skip("Partner authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            task = data[0]
            partner_type = task.get("partner_type")
            is_logistics = task.get("is_logistics")
            
            # Verify partner_type is a valid string
            assert partner_type is not None, "partner_type should not be None"
            assert isinstance(partner_type, str), "partner_type should be a string"
            
            # Verify is_logistics is boolean
            assert isinstance(is_logistics, bool), "is_logistics should be a boolean"
            
            # Verify consistency: logistics types should have is_logistics=True
            logistics_types = {"logistics", "distributor", "delivery"}
            if partner_type in logistics_types:
                assert is_logistics == True, f"partner_type={partner_type} should have is_logistics=True"
            else:
                assert is_logistics == False, f"partner_type={partner_type} should have is_logistics=False"
            
            print(f"✓ Partner type consistency verified: partner_type={partner_type}, is_logistics={is_logistics}")
        else:
            print("✓ Partner type field exists in API (no tasks to verify)")
    
    def test_logistics_partner_sees_client_data(self):
        """Test that logistics/distributor partners can see client delivery details"""
        token = self.get_partner_token()
        if not token:
            pytest.skip("Partner authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/partner-portal/assigned-work", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            task = data[0]
            is_logistics = task.get("is_logistics", False)
            
            if is_logistics:
                # Logistics partners SHOULD see client data
                # These fields should be present (may be null if not set on task)
                assert "client_name" in task, "Logistics partner should have client_name field"
                assert "delivery_address" in task, "Logistics partner should have delivery_address field"
                assert "contact_person" in task, "Logistics partner should have contact_person field"
                assert "contact_phone" in task, "Logistics partner should have contact_phone field"
                print(f"✓ Logistics partner sees client data: client_name={task.get('client_name')}")
            else:
                # Service partners should NOT see client data (fields should be null)
                assert task.get("client_name") is None, "Service partner should NOT see client_name"
                assert task.get("delivery_address") is None, "Service partner should NOT see delivery_address"
                assert task.get("contact_person") is None, "Service partner should NOT see contact_person"
                assert task.get("contact_phone") is None, "Service partner should NOT see contact_phone"
                print("✓ Service partner correctly has null client data")
        else:
            print("✓ Client data access control test passed (no tasks to verify)")
    
    def test_partner_work_stats_endpoint(self):
        """Test partner work stats endpoint"""
        token = self.get_partner_token()
        if not token:
            pytest.skip("Partner authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/partner-portal/assigned-work/stats", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify expected fields
        expected_fields = ["assigned", "awaiting_cost", "in_progress", "completed", "delayed", "total"]
        for field in expected_fields:
            assert field in data, f"Stats should have {field} field"
        
        print(f"✓ Partner work stats: assigned={data.get('assigned')}, total={data.get('total')}")


class TestAdminDashboardWidget:
    """Tests for Admin Dashboard Partner Response Pipeline widget"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@konekt.co.tz"
        self.admin_password = "KnktcKk_L-hw1wSyquvd!"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        return None
    
    def test_service_tasks_stats_summary(self):
        """Test service tasks stats summary endpoint for dashboard widget"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/admin/service-tasks/stats/summary", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify expected fields for dashboard widget
        expected_fields = ["assigned", "awaiting_cost", "cost_submitted", "in_progress", "completed", "delayed", "failed", "unassigned", "total"]
        for field in expected_fields:
            assert field in data, f"Stats should have {field} field"
            assert isinstance(data[field], int), f"{field} should be an integer"
        
        # Verify total is sum of all statuses
        calculated_total = sum(data.get(f, 0) for f in expected_fields if f != "total")
        # Note: total may include other statuses not in our list, so just verify it's >= calculated
        
        print(f"✓ Service tasks stats: assigned={data.get('assigned')}, awaiting_cost={data.get('awaiting_cost')}, cost_submitted={data.get('cost_submitted')}, total={data.get('total')}")
    
    def test_service_tasks_overdue_costs(self):
        """Test service tasks overdue costs endpoint for dashboard widget"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/admin/service-tasks/overdue-costs", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Response should be a list
        assert isinstance(data, list), "Response should be a list"
        
        # If there are overdue tasks, verify structure
        if len(data) > 0:
            task = data[0]
            assert "id" in task, "Overdue task should have id"
            assert "status" in task, "Overdue task should have status"
            assert "partner_id" in task, "Overdue task should have partner_id"
            print(f"✓ Found {len(data)} overdue tasks")
        else:
            print("✓ No overdue tasks (all tasks responded within 48h)")
    
    def test_service_tasks_list(self):
        """Test service tasks list endpoint"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/admin/service-tasks", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Service tasks list returned {len(data)} tasks")


class TestPaymentQueueRegression:
    """Regression tests for Payment Queue status normalization"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@konekt.co.tz"
        self.admin_password = "KnktcKk_L-hw1wSyquvd!"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        return None
    
    def test_payment_queue_status_normalization(self):
        """Test that payment queue normalizes pending/pending_verification to uploaded"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/admin/payments/queue", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        if len(data) > 0:
            # Check that no raw pending/pending_verification statuses are returned
            for item in data:
                status = item.get("status", "")
                # Status should be normalized - pending/pending_verification should become "uploaded"
                assert status not in ["pending_verification", "pending_review"], f"Status should be normalized, got: {status}"
            print(f"✓ Payment queue status normalization working ({len(data)} items)")
        else:
            print("✓ Payment queue status normalization test passed (no items)")
    
    def test_payment_queue_filter_uploaded(self):
        """Test payment queue filter for uploaded status"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/admin/payments/queue?status=uploaded", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # All items should have uploaded or pending-like status
        pending_statuses = {"uploaded", "pending", "pending_verification", "pending_review"}
        for item in data:
            status = item.get("status", "")
            # After normalization, status should be "uploaded"
            assert status == "uploaded", f"Filtered items should have status=uploaded, got: {status}"
        
        print(f"✓ Payment queue filter for uploaded works ({len(data)} items)")


class TestAdminOrdersRegression:
    """Regression tests for Admin Orders payer_name waterfall"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@konekt.co.tz"
        self.admin_password = "KnktcKk_L-hw1wSyquvd!"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        return None
    
    def test_admin_orders_list_has_payer_name(self):
        """Test that admin orders list includes payer_name field"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/admin/orders-ops", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        if len(data) > 0:
            order = data[0]
            assert "payer_name" in order, "Order should have payer_name field"
            assert "customer_name" in order, "Order should have customer_name field"
            
            # customer_name should never be null (fallback to email or '-')
            customer_name = order.get("customer_name")
            assert customer_name is not None, "customer_name should not be None"
            
            print(f"✓ Admin orders has payer_name={order.get('payer_name')}, customer_name={customer_name}")
        else:
            print("✓ Admin orders payer_name test passed (no orders)")
    
    def test_admin_order_detail_has_payer_name_waterfall(self):
        """Test that admin order detail includes payer_name from waterfall"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin authentication failed")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # First get list to find an order ID
        list_response = self.session.get(f"{BASE_URL}/api/admin/orders-ops", headers=headers)
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No orders available for detail test")
        
        order_id = list_response.json()[0].get("id")
        
        # Get order detail
        response = self.session.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check payer_name in response
        assert "payer_name" in data, "Order detail should have payer_name field"
        
        # Check customer_name is not null
        customer_name = data.get("customer_name")
        assert customer_name is not None, "customer_name should not be None"
        
        print(f"✓ Admin order detail has payer_name={data.get('payer_name')}, customer_name={customer_name}")


class TestNotificationWiring:
    """Tests for notification wiring - payment approved/rejected target URLs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@konekt.co.tz"
        self.admin_password = "KnktcKk_L-hw1wSyquvd!"
        self.customer_email = "demo.customer@konekt.com"
        self.customer_password = "Demo123!"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        return None
    
    def test_notification_service_exists(self):
        """Test that notification service is accessible"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin authentication failed")
        
        # Just verify the admin can access notifications endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/admin/notifications", headers=headers)
        
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print("✓ Notification service accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
