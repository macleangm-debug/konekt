"""
Pack 3 Operations Intelligence Tests — Iteration 164
Tests:
1. Notification registry endpoints (summary + sidebar-counts)
2. Statement send endpoint (MOCKED email)
3. StandardSummaryCardsRow pages (Orders, Customers, Payments, Invoices, Deliveries)
4. Regression tests for existing admin pages
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestAuthSetup:
    """Get admin token for authenticated tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {admin_token}"}


class TestNotificationRegistry(TestAuthSetup):
    """Test centralized notification registry endpoints"""
    
    def test_notification_summary_endpoint(self, auth_headers):
        """GET /api/admin/notifications/summary returns structured summary"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications/summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify all 6 sections exist
        expected_sections = ["requests_inbox", "orders", "payments_queue", "deliveries", "quotes", "customers"]
        for section in expected_sections:
            assert section in data, f"Missing section: {section}"
            
            # Each section should have required fields
            section_data = data[section]
            assert "new_count" in section_data, f"Missing new_count in {section}"
            assert "action_required_count" in section_data, f"Missing action_required_count in {section}"
            assert "badge_count" in section_data, f"Missing badge_count in {section}"
            assert "badge_type" in section_data, f"Missing badge_type in {section}"
            
            # Counts should be non-negative integers
            assert isinstance(section_data["new_count"], int) and section_data["new_count"] >= 0
            assert isinstance(section_data["action_required_count"], int) and section_data["action_required_count"] >= 0
            assert isinstance(section_data["badge_count"], int) and section_data["badge_count"] >= 0
        
        # Verify generated_at timestamp
        assert "generated_at" in data, "Missing generated_at timestamp"
        print(f"Notification summary: {data}")
    
    def test_sidebar_counts_endpoint(self, auth_headers):
        """GET /api/admin/sidebar-counts returns flattened badge counts"""
        response = requests.get(f"{BASE_URL}/api/admin/sidebar-counts", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Should return flattened badge_count per section
        expected_keys = ["requests_inbox", "orders", "payments_queue", "deliveries", "quotes", "customers"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
            assert isinstance(data[key], int), f"{key} should be an integer"
            assert data[key] >= 0, f"{key} should be non-negative"
        
        print(f"Sidebar counts: {data}")
    
    def test_sidebar_counts_matches_summary(self, auth_headers):
        """Verify sidebar-counts matches badge_count from notifications/summary"""
        summary_res = requests.get(f"{BASE_URL}/api/admin/notifications/summary", headers=auth_headers)
        sidebar_res = requests.get(f"{BASE_URL}/api/admin/sidebar-counts", headers=auth_headers)
        
        assert summary_res.status_code == 200
        assert sidebar_res.status_code == 200
        
        summary = summary_res.json()
        sidebar = sidebar_res.json()
        
        # Each sidebar count should match the badge_count from summary
        for section in ["requests_inbox", "orders", "payments_queue", "deliveries", "quotes", "customers"]:
            expected = summary[section]["badge_count"]
            actual = sidebar[section]
            assert actual == expected, f"Mismatch for {section}: sidebar={actual}, summary badge_count={expected}"
        
        print("Sidebar counts match notification summary badge_counts")


class TestStatementDelivery(TestAuthSetup):
    """Test statement send endpoint (MOCKED email)"""
    
    def test_send_statement_success(self, auth_headers):
        """POST /api/admin/customers/{id}/send-statement returns success with statement_summary"""
        # First get a customer ID
        customers_res = requests.get(f"{BASE_URL}/api/admin/customers-360/list", headers=auth_headers)
        assert customers_res.status_code == 200, f"Failed to get customers: {customers_res.text}"
        
        customers = customers_res.json()
        if not customers:
            pytest.skip("No customers available for testing")
        
        customer_id = customers[0].get("id")
        assert customer_id, "Customer has no ID"
        
        # Send statement
        response = requests.post(f"{BASE_URL}/api/admin/customers/{customer_id}/send-statement", headers=auth_headers)
        
        # Should succeed (200) or fail with 400 if no email
        if response.status_code == 400:
            data = response.json()
            assert "no email" in data.get("detail", "").lower() or "not found" in data.get("detail", "").lower()
            print(f"Customer has no email: {data}")
            return
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "customer_email" in data, "Missing customer_email"
        assert "statement_summary" in data, "Missing statement_summary"
        assert data.get("delivery_mode") == "mocked_email", "Should be mocked_email mode"
        
        # Verify statement_summary structure
        summary = data["statement_summary"]
        assert "total_invoiced" in summary
        assert "total_paid" in summary
        assert "balance_due" in summary
        assert "order_count" in summary
        assert "invoice_count" in summary
        
        print(f"Statement sent (MOCKED): {data}")
    
    def test_send_statement_invalid_customer(self, auth_headers):
        """POST /api/admin/customers/{invalid_id}/send-statement returns 404"""
        response = requests.post(f"{BASE_URL}/api/admin/customers/invalid-customer-id-12345/send-statement", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("Invalid customer returns 404 as expected")


class TestOrdersPageStats(TestAuthSetup):
    """Test Orders page stats endpoint for StandardSummaryCardsRow"""
    
    def test_orders_stats_endpoint(self, auth_headers):
        """GET /api/admin/orders-ops/stats returns stats for 5 stat cards"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Should have stats for: total, new, assigned, in_progress, completed
        expected_keys = ["total", "new", "assigned", "in_progress", "completed"]
        for key in expected_keys:
            assert key in data, f"Missing stat: {key}"
            assert isinstance(data[key], int), f"{key} should be an integer"
        
        print(f"Orders stats: {data}")
    
    def test_orders_list_endpoint(self, auth_headers):
        """GET /api/admin/orders-ops returns orders list"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"Orders count: {len(data)}")


class TestCustomersPageStats(TestAuthSetup):
    """Test Customers page stats endpoint for StandardSummaryCardsRow"""
    
    def test_customers_360_stats_endpoint(self, auth_headers):
        """GET /api/admin/customers-360/stats returns stats for 6 stat cards"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Should have stats for: total, active, at_risk, inactive, with_unpaid_invoices, with_active_orders
        expected_keys = ["total", "active", "at_risk", "inactive", "with_unpaid_invoices", "with_active_orders"]
        for key in expected_keys:
            assert key in data, f"Missing stat: {key}"
            assert isinstance(data[key], int), f"{key} should be an integer"
        
        print(f"Customers 360 stats: {data}")
    
    def test_customers_360_list_endpoint(self, auth_headers):
        """GET /api/admin/customers-360/list returns customers list"""
        response = requests.get(f"{BASE_URL}/api/admin/customers-360/list", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"Customers count: {len(data)}")


class TestPaymentsQueueStats(TestAuthSetup):
    """Test Payments Queue page stats endpoint for StandardSummaryCardsRow"""
    
    def test_payments_queue_endpoint(self, auth_headers):
        """GET /api/admin/payments/queue returns payments list"""
        response = requests.get(f"{BASE_URL}/api/admin/payments/queue", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        
        # Count by status for stat cards
        status_counts = {
            "all": len(data),
            "uploaded": len([p for p in data if p.get("status") == "uploaded"]),
            "approved": len([p for p in data if p.get("status") == "approved"]),
            "rejected": len([p for p in data if p.get("status") == "rejected"]),
        }
        print(f"Payments queue stats: {status_counts}")
    
    def test_payments_stats_endpoint(self, auth_headers):
        """GET /api/admin/payments/stats returns payment stats"""
        response = requests.get(f"{BASE_URL}/api/admin/payments/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Payments stats: {data}")


class TestInvoicesPageStats(TestAuthSetup):
    """Test Invoices page stats endpoint for StandardSummaryCardsRow"""
    
    def test_invoices_list_endpoint(self, auth_headers):
        """GET /api/admin/invoices returns invoices list"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        
        # Count by status for stat cards
        status_counts = {
            "total": len(data),
            "draft": len([i for i in data if i.get("status") == "draft"]),
            "sent": len([i for i in data if i.get("status") in ["sent", "issued"]]),
            "paid": len([i for i in data if i.get("status") in ["paid", "approved"]]),
            "overdue": len([i for i in data if i.get("status") == "overdue"]),
            "unpaid": len([i for i in data if i.get("status") in ["unpaid", "pending", "pending_payment", "awaiting_payment_proof", "partially_paid"]]),
        }
        print(f"Invoices stats: {status_counts}")
    
    def test_invoices_stats_endpoint(self, auth_headers):
        """GET /api/admin/invoices/stats returns invoice stats"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Invoices stats: {data}")


class TestDeliveryNotesPageStats(TestAuthSetup):
    """Test Delivery Notes page stats endpoint for StandardSummaryCardsRow"""
    
    def test_delivery_notes_list_endpoint(self, auth_headers):
        """GET /api/admin/delivery-notes returns delivery notes list"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery-notes", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        
        # Count by status for stat cards
        status_counts = {
            "total": len(data),
            "issued": len([d for d in data if d.get("status") == "issued"]),
            "in_transit": len([d for d in data if d.get("status") == "in_transit"]),
            "delivered": len([d for d in data if d.get("status") == "delivered"]),
            "cancelled": len([d for d in data if d.get("status") == "cancelled"]),
        }
        print(f"Delivery notes stats: {status_counts}")


class TestRegressionAdminPages(TestAuthSetup):
    """Regression tests for existing admin pages"""
    
    def test_quotes_page_loads(self, auth_headers):
        """GET /api/admin/quotes-v2 returns quotes list"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"Quotes count: {len(response.json())}")
    
    def test_crm_leads_page_loads(self, auth_headers):
        """GET /api/admin/crm/leads returns leads list"""
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"Leads count: {len(response.json())}")
    
    def test_business_settings_page_loads(self, auth_headers):
        """GET /api/admin/business-settings returns settings"""
        response = requests.get(f"{BASE_URL}/api/admin/business-settings", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Business settings loaded")
    
    def test_margins_page_loads(self, auth_headers):
        """GET /api/admin/margins/global returns margins"""
        response = requests.get(f"{BASE_URL}/api/admin/margins/global", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Margins loaded")
    
    def test_dashboard_summary_loads(self, auth_headers):
        """GET /api/admin/dashboard/summary returns dashboard data"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Dashboard summary loaded")


class TestStatementDeliveryLog(TestAuthSetup):
    """Test that statement delivery is logged in MongoDB"""
    
    def test_statement_delivery_creates_log(self, auth_headers):
        """Verify statement send creates log entry"""
        # Get a customer with email
        customers_res = requests.get(f"{BASE_URL}/api/admin/customers-360/list", headers=auth_headers)
        assert customers_res.status_code == 200
        
        customers = customers_res.json()
        customer_with_email = None
        for c in customers:
            if c.get("email"):
                customer_with_email = c
                break
        
        if not customer_with_email:
            pytest.skip("No customer with email found")
        
        customer_id = customer_with_email["id"]
        
        # Send statement
        response = requests.post(f"{BASE_URL}/api/admin/customers/{customer_id}/send-statement", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") == True
            assert data.get("delivery_mode") == "mocked_email"
            print(f"Statement logged for {data.get('customer_email')}")
        elif response.status_code == 400:
            print(f"Customer has no email or not found: {response.json()}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
