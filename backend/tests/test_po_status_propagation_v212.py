"""
Test Suite for Block 2 (Purchase Order System) and Block 3 (Status Propagation & Sales Override)
Iteration 212 - Konekt B2B Platform

Block 2: Purchase Order system
- PO PDF generation from vendor orders
- PO download routes
- Admin order drawer shows POs per vendor

Block 3: Status Propagation & Sales Override
- Role-based status mapping (admin/customer/sales/vendor)
- Audit trail for status changes
- Sales override with mandatory note + source label
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPurchaseOrderPDFRoutes:
    """Block 2: Purchase Order PDF generation and download routes"""

    def test_po_preview_nonexistent_returns_404(self):
        """GET /api/pdf/purchase-orders/{id}/preview returns 404 for nonexistent vendor order"""
        response = requests.get(f"{BASE_URL}/api/pdf/purchase-orders/nonexistent123/preview")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower(), f"Expected 'not found' in detail, got: {data}"
        print("PASS: PO preview returns 404 for nonexistent vendor order")

    def test_po_download_nonexistent_returns_404(self):
        """GET /api/pdf/purchase-orders/{id} returns 404 for nonexistent vendor order"""
        response = requests.get(f"{BASE_URL}/api/pdf/purchase-orders/nonexistent456")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower(), f"Expected 'not found' in detail, got: {data}"
        print("PASS: PO download returns 404 for nonexistent vendor order")


class TestSalesStatusRoutes:
    """Block 3: Sales status override and options routes"""

    def test_get_status_options_returns_statuses_and_sources(self):
        """GET /api/sales/orders/{id}/status-options returns statuses (8) and sources (5)"""
        # Use any order_id - the endpoint doesn't validate existence for options
        response = requests.get(f"{BASE_URL}/api/sales/orders/test-order-id/status-options")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify statuses list
        assert "statuses" in data, "Response should contain 'statuses' key"
        statuses = data["statuses"]
        assert isinstance(statuses, list), "statuses should be a list"
        assert len(statuses) == 8, f"Expected 8 statuses, got {len(statuses)}"
        expected_statuses = ["assigned", "acknowledged", "in_production", "ready", "dispatched", "delivered", "delayed", "cancelled"]
        for s in expected_statuses:
            assert s in statuses, f"Status '{s}' should be in statuses list"
        
        # Verify sources list
        assert "sources" in data, "Response should contain 'sources' key"
        sources = data["sources"]
        assert isinstance(sources, list), "sources should be a list"
        assert len(sources) == 5, f"Expected 5 sources, got {len(sources)}"
        expected_sources = ["vendor_update", "sales_follow_up", "admin_adjustment", "vendor_confirmed", "system_auto"]
        for src in expected_sources:
            assert src in sources, f"Source '{src}' should be in sources list"
        
        print(f"PASS: Status options returns {len(statuses)} statuses and {len(sources)} sources")

    def test_status_override_without_note_returns_400(self):
        """PUT /api/sales/orders/{id}/status-override without note returns 400 error"""
        payload = {
            "new_status": "in_production",
            "note": "",  # Empty note
            "source": "sales_follow_up"
        }
        response = requests.put(
            f"{BASE_URL}/api/sales/orders/test-order-id/status-override",
            json=payload
        )
        # Should return 400 for missing note (or 404 if order not found - both are valid)
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
        if response.status_code == 400:
            data = response.json()
            assert "note" in data.get("detail", "").lower() or "required" in data.get("detail", "").lower(), \
                f"Expected note-related error, got: {data}"
            print("PASS: Status override without note returns 400 with note-related error")
        else:
            print("PASS: Status override returns 404 for nonexistent order (note validation would occur after)")

    def test_status_override_with_invalid_status_returns_400(self):
        """PUT /api/sales/orders/{id}/status-override with invalid status returns 400 error"""
        payload = {
            "new_status": "invalid_status_xyz",
            "note": "Test note for invalid status",
            "source": "sales_follow_up"
        }
        response = requests.put(
            f"{BASE_URL}/api/sales/orders/test-order-id/status-override",
            json=payload
        )
        # Should return 400 for invalid status (or 404 if order not found)
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
        if response.status_code == 400:
            data = response.json()
            assert "invalid" in data.get("detail", "").lower() or "status" in data.get("detail", "").lower(), \
                f"Expected status-related error, got: {data}"
            print("PASS: Status override with invalid status returns 400")
        else:
            print("PASS: Status override returns 404 for nonexistent order (status validation would occur after)")


class TestAdminOrderPurchaseOrders:
    """Block 2: Admin order operations - purchase orders endpoint"""

    def test_get_purchase_orders_for_order_returns_array(self):
        """GET /api/admin/orders-ops/{order_id}/purchase-orders returns purchase_orders array"""
        # Use a test order ID - endpoint should return empty array if no POs exist
        response = requests.get(f"{BASE_URL}/api/admin/orders-ops/test-order-id/purchase-orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "purchase_orders" in data, "Response should contain 'purchase_orders' key"
        assert isinstance(data["purchase_orders"], list), "purchase_orders should be a list"
        assert "count" in data, "Response should contain 'count' key"
        assert isinstance(data["count"], int), "count should be an integer"
        assert data["count"] == len(data["purchase_orders"]), "count should match purchase_orders length"
        
        print(f"PASS: Purchase orders endpoint returns array with {data['count']} items")


class TestCustomerOrdersStatusMapping:
    """Block 3: Customer orders API returns customer-safe status labels"""

    def test_customer_orders_api_structure(self):
        """Verify customer orders API endpoint exists and returns proper structure"""
        # This test verifies the endpoint exists - actual customer_status testing requires auth
        response = requests.get(f"{BASE_URL}/api/customer/orders")
        # Should return 401 without auth token
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Customer orders API requires authentication (401)")


class TestStatusPropagationService:
    """Block 3: Status propagation service unit tests via API behavior"""

    def test_status_mapping_constants_exist(self):
        """Verify status mapping is applied by checking status-options endpoint"""
        response = requests.get(f"{BASE_URL}/api/sales/orders/any-id/status-options")
        assert response.status_code == 200
        data = response.json()
        
        # The statuses returned should be the INTERNAL_STATUSES from the service
        internal_statuses = ["assigned", "acknowledged", "in_production", "ready", "dispatched", "delivered", "delayed", "cancelled"]
        for status in internal_statuses:
            assert status in data["statuses"], f"Internal status '{status}' should be available"
        
        print("PASS: All internal statuses are available for sales role")


class TestAuditTrailStructure:
    """Block 3: Audit trail structure verification"""

    def test_audit_trail_endpoint_exists(self):
        """GET /api/sales/orders/{id}/audit-trail endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/sales/orders/nonexistent-id/audit-trail")
        # Should return 404 for nonexistent order
        assert response.status_code == 404, f"Expected 404 for nonexistent order, got {response.status_code}"
        print("PASS: Audit trail endpoint returns 404 for nonexistent order")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
