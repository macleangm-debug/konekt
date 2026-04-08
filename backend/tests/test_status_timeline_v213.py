"""
Test Status Timeline Feature - Iteration 213
Tests the audit trail API and status timeline functionality for admin order drawer.
Uses /api/admin/orders-ops endpoint (the correct admin orders endpoint).
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestStatusTimelineAPI:
    """Tests for Status Timeline / Audit Trail API endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_admin_login_success(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data or "token" in data, "No token in response"
        print(f"✓ Admin login successful")
    
    def test_get_orders_list(self, admin_headers):
        """Test admin can get orders list from orders-ops endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=admin_headers)
        assert response.status_code == 200, f"Get orders failed: {response.text}"
        data = response.json()
        
        # orders-ops returns a direct array
        assert isinstance(data, list), "Orders response should be a list"
        print(f"✓ Got {len(data)} orders")
    
    def test_search_order_568F6C(self, admin_headers):
        """Test searching for specific order 568F6C with audit trail"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops?search=568F6C", headers=admin_headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Search response should be a list"
        
        # Find the order with 568F6C in order_number
        matching = [o for o in data if "568F6C" in (o.get("order_number") or "")]
        assert len(matching) > 0, "Order 568F6C not found"
        
        order = matching[0]
        print(f"✓ Found order 568F6C")
        print(f"  Order ID: {order.get('id')}")
        print(f"  Order Number: {order.get('order_number')}")
        assert order.get("id"), "Order should have an id field"
    
    def test_get_order_detail_with_audit_trail(self, admin_headers):
        """Test getting order detail which includes audit trail data"""
        # First search for the order
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops?search=568F6C", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        matching = [o for o in data if "568F6C" in (o.get("order_number") or "")]
        assert len(matching) > 0, "Order 568F6C not found in system"
        
        order_id = matching[0].get("id")
        
        # Get order detail
        detail_response = requests.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}", headers=admin_headers)
        assert detail_response.status_code == 200, f"Get order detail failed: {detail_response.text}"
        
        detail = detail_response.json()
        order = detail.get("order", detail)
        
        # Check for audit trail fields
        status_audit_trail = order.get("status_audit_trail", [])
        status_history = order.get("status_history", [])
        
        print(f"✓ Order detail retrieved")
        print(f"  status_audit_trail entries: {len(status_audit_trail)}")
        print(f"  status_history entries: {len(status_history)}")
        
        # Verify we have the expected 7 entries (4 audit + 3 history)
        total = len(status_audit_trail) + len(status_history)
        assert total == 7, f"Expected 7 timeline entries, got {total}"
        print(f"✓ Total timeline entries: {total}")
    
    def test_audit_trail_entry_structure(self, admin_headers):
        """Test audit trail entries have correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops?search=568F6C", headers=admin_headers)
        data = response.json()
        matching = [o for o in data if "568F6C" in (o.get("order_number") or "")]
        order_id = matching[0].get("id")
        
        detail_response = requests.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}", headers=admin_headers)
        detail = detail_response.json()
        order = detail.get("order", detail)
        
        audit_trail = order.get("status_audit_trail", [])
        assert len(audit_trail) > 0, "Should have audit trail entries"
        
        # Check first entry structure
        entry = audit_trail[0]
        required_fields = ["new_status", "updated_by", "timestamp", "source", "role"]
        for field in required_fields:
            assert field in entry, f"Audit entry missing required field: {field}"
        
        print(f"✓ Audit entry structure verified")
        print(f"  Fields: {list(entry.keys())}")
    
    def test_timeline_sources_variety(self, admin_headers):
        """Test that timeline has multiple source types (Sales Follow-up, Vendor Update, etc.)"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops?search=568F6C", headers=admin_headers)
        data = response.json()
        matching = [o for o in data if "568F6C" in (o.get("order_number") or "")]
        order_id = matching[0].get("id")
        
        detail_response = requests.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}", headers=admin_headers)
        detail = detail_response.json()
        order = detail.get("order", detail)
        
        audit_trail = order.get("status_audit_trail", [])
        
        # Collect all sources
        sources = set(entry.get("source") for entry in audit_trail if entry.get("source"))
        
        print(f"✓ Sources found: {sources}")
        
        # Should have multiple source types
        expected_sources = {"admin_adjustment", "vendor_confirmed", "vendor_update", "sales_follow_up"}
        found_expected = sources.intersection(expected_sources)
        assert len(found_expected) >= 3, f"Expected at least 3 different sources, found: {found_expected}"
        print(f"✓ Found {len(found_expected)} different source types")
    
    def test_timeline_roles_variety(self, admin_headers):
        """Test that timeline has multiple role types (admin, vendor, sales)"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops?search=568F6C", headers=admin_headers)
        data = response.json()
        matching = [o for o in data if "568F6C" in (o.get("order_number") or "")]
        order_id = matching[0].get("id")
        
        detail_response = requests.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}", headers=admin_headers)
        detail = detail_response.json()
        order = detail.get("order", detail)
        
        audit_trail = order.get("status_audit_trail", [])
        
        # Collect all roles
        roles = set(entry.get("role") for entry in audit_trail if entry.get("role"))
        
        print(f"✓ Roles found: {roles}")
        
        # Should have admin, vendor, and sales roles
        expected_roles = {"admin", "vendor", "sales"}
        assert roles == expected_roles, f"Expected roles {expected_roles}, found {roles}"
        print(f"✓ All expected roles present")
    
    def test_get_purchase_orders_for_order(self, admin_headers):
        """Test getting purchase orders for an order"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops?search=568F6C", headers=admin_headers)
        data = response.json()
        matching = [o for o in data if "568F6C" in (o.get("order_number") or "")]
        order_id = matching[0].get("id")
        
        # Get purchase orders
        po_response = requests.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}/purchase-orders", headers=admin_headers)
        assert po_response.status_code == 200, f"Get POs failed: {po_response.text}"
        
        po_data = po_response.json()
        purchase_orders = po_data.get("purchase_orders", [])
        
        print(f"✓ Got {len(purchase_orders)} purchase orders for order")
    
    def test_audit_trail_endpoint_404_for_nonexistent(self, admin_headers):
        """Test audit trail returns 404 for nonexistent order"""
        response = requests.get(f"{BASE_URL}/api/sales/orders/nonexistent-order-id/audit-trail", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Audit trail returns 404 for nonexistent order")
    
    def test_status_options_endpoint(self, admin_headers):
        """Test status options endpoint returns valid options"""
        response = requests.get(f"{BASE_URL}/api/sales/orders/any-id/status-options", headers=admin_headers)
        assert response.status_code == 200, f"Status options failed: {response.text}"
        
        data = response.json()
        assert "statuses" in data, "Response should have statuses"
        assert "sources" in data, "Response should have sources"
        
        statuses = data["statuses"]
        sources = data["sources"]
        
        # Verify expected statuses
        expected_statuses = ["assigned", "acknowledged", "in_production", "ready", "dispatched", "delivered", "delayed", "cancelled"]
        for s in expected_statuses:
            assert s in statuses, f"Missing status: {s}"
        
        # Verify expected sources
        expected_sources = ["vendor_update", "sales_follow_up", "admin_adjustment", "vendor_confirmed", "system_auto"]
        for src in expected_sources:
            assert src in sources, f"Missing source: {src}"
        
        print(f"✓ Status options: {len(statuses)} statuses, {len(sources)} sources")
    
    def test_orders_table_columns(self, admin_headers):
        """Test orders list returns expected columns for table display"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        if not data:
            pytest.skip("No orders in system")
        
        order = data[0]
        
        # Check expected columns exist (Date, Order#, Customer, Payer, Total, Payment, Fulfillment)
        expected_fields = {
            "created_at": ["created_at"],
            "order_number": ["order_number"],
            "customer_name": ["customer_name"],
            "payer_name": ["payer_name"],
            "total": ["total", "total_amount"],
            "payment_status": ["payment_status", "payment_state"],
            "status": ["status", "fulfillment_state"]
        }
        
        for field_name, possible_keys in expected_fields.items():
            has_field = any(k in order for k in possible_keys)
            print(f"  {field_name}: {'✓' if has_field else '✗'}")
            assert has_field, f"Missing field: {field_name}"
        
        print("✓ Orders table columns verified")


class TestTimelineNotes:
    """Tests for expandable notes functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_long_notes_exist(self, admin_headers):
        """Test that some timeline entries have notes longer than 80 chars (for Show more button)"""
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops?search=568F6C", headers=admin_headers)
        data = response.json()
        matching = [o for o in data if "568F6C" in (o.get("order_number") or "")]
        order_id = matching[0].get("id")
        
        detail_response = requests.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}", headers=admin_headers)
        detail = detail_response.json()
        order = detail.get("order", detail)
        
        audit_trail = order.get("status_audit_trail", [])
        
        # Check for notes longer than 80 chars
        long_notes = [e for e in audit_trail if e.get("note") and len(e["note"]) > 80]
        
        print(f"✓ Found {len(long_notes)} entries with notes > 80 chars")
        if long_notes:
            print(f"  Example: '{long_notes[0]['note'][:50]}...'")
        
        # At least one entry should have a long note for testing "Show more"
        assert len(long_notes) >= 1, "Should have at least one entry with note > 80 chars"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
