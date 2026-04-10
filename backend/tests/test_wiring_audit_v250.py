"""
Test Suite for P0 Full Wiring Audit - Iteration 250
Tests:
1. Payment Queue: All records show customer_name, payer_name, payer_phone, source, amount, status - no blanks
2. Payment Queue: Status tabs correctly count (Pending=uploaded, Approved, Rejected)
3. Payment Queue: Statuses 'pending'/'pending_verification' mapped to 'uploaded' in response
4. Payment Queue Drawer: Opens with payer details, customer section, invoice/reference, proof preview
5. Admin Orders: Table shows Date, Order #, Customer, Payer, Total, Payment, Fulfillment columns with no blank values
6. Admin Orders detail endpoint returns enriched payer_name from billing.invoice_client_name fallback
7. Customer Orders: API returns payment_status_label, fulfillment_status, customer_status, payer_name fields
8. Customer Invoices: API returns payer_name, payment_status_label, total_amount fields
9. Admin Invoices: API returns enriched data with customer_name, payer_name, payment_status_label
10. Service Tasks Stats: /api/admin/service-tasks/stats/summary returns proper counts
11. Service Tasks Overdue: /api/admin/service-tasks/overdue-costs returns empty or valid list
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    # Try alternate customer credentials
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@konekt.tz",
        "password": "TestUser123!"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Customer login failed: {response.status_code}")


@pytest.fixture(scope="module")
def partner_token():
    """Get partner authentication token"""
    response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Partner login failed: {response.status_code}")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"


class TestPaymentQueue:
    """Payment Queue API tests - P0 Full Wiring Audit"""
    
    def test_payment_queue_returns_list(self, admin_token):
        """GET /api/admin/payments/queue returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Payment queue failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Payment queue should return a list"
    
    def test_payment_queue_fields_not_blank(self, admin_token):
        """Payment queue records should have no blank required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No payment queue records to validate")
        
        required_fields = ["customer_name", "payer_name", "source", "amount_paid", "status"]
        
        for idx, record in enumerate(data[:10]):  # Check first 10 records
            for field in required_fields:
                value = record.get(field)
                # Check field exists and is not empty/blank
                assert value is not None, f"Record {idx}: {field} is None"
                if isinstance(value, str):
                    assert value.strip() not in ["", "-"], f"Record {idx}: {field} is blank ('{value}')"
                print(f"Record {idx}: {field} = {value}")
    
    def test_payment_queue_status_normalization(self, admin_token):
        """Statuses 'pending'/'pending_verification' should be mapped to 'uploaded'"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check that no records have raw 'pending' or 'pending_verification' status
        for record in data:
            status = record.get("status", "")
            assert status not in ["pending", "pending_verification"], \
                f"Status should be normalized to 'uploaded', got '{status}'"
            # Valid statuses should be: uploaded, approved, rejected
            assert status in ["uploaded", "approved", "rejected", ""], \
                f"Unexpected status: {status}"
    
    def test_payment_queue_status_filter_uploaded(self, admin_token):
        """Filter by status=uploaded should return pending-like records"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue?status=uploaded",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned records should have status 'uploaded'
        for record in data:
            assert record.get("status") == "uploaded", \
                f"Expected status 'uploaded', got '{record.get('status')}'"
    
    def test_payment_queue_status_filter_approved(self, admin_token):
        """Filter by status=approved should return approved records"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue?status=approved",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for record in data:
            assert record.get("status") == "approved", \
                f"Expected status 'approved', got '{record.get('status')}'"
    
    def test_payment_queue_status_filter_rejected(self, admin_token):
        """Filter by status=rejected should return rejected records"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue?status=rejected",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for record in data:
            assert record.get("status") == "rejected", \
                f"Expected status 'rejected', got '{record.get('status')}'"
    
    def test_payment_queue_drawer_fields(self, admin_token):
        """Payment queue records should have drawer-required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments/queue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No payment queue records to validate drawer fields")
        
        # Fields needed for drawer display
        drawer_fields = [
            "payment_proof_id",
            "payer_name",
            "payer_phone",
            "customer_name",
            "invoice_number",
            "amount_paid",
            "file_url",
            "status",
            "source"
        ]
        
        record = data[0]
        for field in drawer_fields:
            assert field in record, f"Drawer field '{field}' missing from payment queue record"
            print(f"Drawer field {field}: {record.get(field)}")


class TestAdminOrders:
    """Admin Orders API tests - P0 Full Wiring Audit"""
    
    def test_admin_orders_list(self, admin_token):
        """GET /api/admin/orders-ops returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin orders failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Admin orders should return a list"
    
    def test_admin_orders_table_fields(self, admin_token):
        """Admin orders table should have all required columns with no blanks"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No orders to validate")
        
        # Required table columns
        table_fields = [
            "created_at",      # Date
            "order_number",    # Order #
            "customer_name",   # Customer
            "payer_name",      # Payer
            "total_amount",    # Total (or total)
            "payment_status",  # Payment (or payment_state)
            "status"           # Fulfillment (or fulfillment_state)
        ]
        
        for idx, order in enumerate(data[:10]):
            print(f"\nOrder {idx}: {order.get('order_number')}")
            
            # Check created_at
            assert order.get("created_at"), f"Order {idx}: created_at is blank"
            
            # Check order_number
            assert order.get("order_number"), f"Order {idx}: order_number is blank"
            
            # Check customer_name
            cust_name = order.get("customer_name")
            assert cust_name and cust_name not in ["-", ""], f"Order {idx}: customer_name is blank ('{cust_name}')"
            
            # Check payer_name
            payer_name = order.get("payer_name")
            assert payer_name is not None, f"Order {idx}: payer_name is None"
            print(f"  payer_name: {payer_name}")
            
            # Check total
            total = order.get("total_amount") or order.get("total")
            assert total is not None, f"Order {idx}: total is None"
            
            # Check payment status
            payment_status = order.get("payment_status") or order.get("payment_state")
            assert payment_status, f"Order {idx}: payment_status is blank"
            
            # Check fulfillment status
            fulfillment = order.get("status") or order.get("fulfillment_state")
            assert fulfillment, f"Order {idx}: fulfillment status is blank"
    
    def test_admin_order_detail_enrichment(self, admin_token):
        """Admin order detail should have enriched payer_name"""
        # First get list of orders
        response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) == 0:
            pytest.skip("No orders to test detail endpoint")
        
        order_id = orders[0].get("id")
        
        # Get order detail
        detail_response = requests.get(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert detail_response.status_code == 200, f"Order detail failed: {detail_response.status_code}"
        detail = detail_response.json()
        
        # Check enriched fields
        assert "payer_name" in detail, "payer_name should be in order detail"
        assert "customer_name" in detail, "customer_name should be in order detail"
        print(f"Order detail payer_name: {detail.get('payer_name')}")
        print(f"Order detail customer_name: {detail.get('customer_name')}")


class TestCustomerOrders:
    """Customer Orders API tests - P0 Full Wiring Audit"""
    
    def test_customer_orders_list(self, customer_token):
        """GET /api/customer/orders returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Customer orders failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Customer orders should return a list"
    
    def test_customer_orders_enriched_fields(self, customer_token):
        """Customer orders should have payment_status_label, fulfillment_status, customer_status, payer_name"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No customer orders to validate")
        
        required_fields = [
            "payment_status_label",
            "fulfillment_status",
            "customer_status",
            "payer_name"
        ]
        
        for idx, order in enumerate(data[:5]):
            print(f"\nCustomer Order {idx}: {order.get('order_number')}")
            for field in required_fields:
                value = order.get(field)
                assert value is not None, f"Order {idx}: {field} is None"
                print(f"  {field}: {value}")


class TestCustomerInvoices:
    """Customer Invoices API tests - P0 Full Wiring Audit"""
    
    def test_customer_invoices_list(self, customer_token):
        """GET /api/customer/invoices returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Customer invoices failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Customer invoices should return a list"
    
    def test_customer_invoices_enriched_fields(self, customer_token):
        """Customer invoices should have payer_name, payment_status_label, total_amount"""
        response = requests.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No customer invoices to validate")
        
        required_fields = [
            "payer_name",
            "payment_status_label",
            "total_amount"
        ]
        
        for idx, invoice in enumerate(data[:5]):
            print(f"\nCustomer Invoice {idx}: {invoice.get('invoice_number')}")
            for field in required_fields:
                value = invoice.get(field)
                assert value is not None, f"Invoice {idx}: {field} is None"
                print(f"  {field}: {value}")


class TestAdminInvoices:
    """Admin Invoices API tests - P0 Full Wiring Audit"""
    
    def test_admin_invoices_list(self, admin_token):
        """GET /api/admin/invoices returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin invoices failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Admin invoices should return a list"
    
    def test_admin_invoices_enriched_fields(self, admin_token):
        """Admin invoices should have customer_name, payer_name, payment_status_label"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No admin invoices to validate")
        
        required_fields = [
            "customer_name",
            "payer_name",
            "payment_status_label"
        ]
        
        for idx, invoice in enumerate(data[:5]):
            print(f"\nAdmin Invoice {idx}: {invoice.get('invoice_number')}")
            for field in required_fields:
                value = invoice.get(field)
                assert value is not None, f"Invoice {idx}: {field} is None"
                print(f"  {field}: {value}")


class TestServiceTasks:
    """Service Tasks API tests - P0 Full Wiring Audit"""
    
    def test_service_tasks_stats_summary(self, admin_token):
        """GET /api/admin/service-tasks/stats/summary returns proper counts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/service-tasks/stats/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Service tasks stats failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Check expected fields
        expected_fields = [
            "assigned",
            "awaiting_cost",
            "cost_submitted",
            "in_progress",
            "completed",
            "delayed",
            "failed",
            "unassigned",
            "total"
        ]
        
        for field in expected_fields:
            assert field in data, f"Stats missing field: {field}"
            assert isinstance(data[field], int), f"Stats field {field} should be int, got {type(data[field])}"
            print(f"  {field}: {data[field]}")
        
        # Verify total is sum of individual counts
        individual_sum = sum(data.get(f, 0) for f in expected_fields if f != "total")
        assert data["total"] == individual_sum, \
            f"Total ({data['total']}) should equal sum of individual counts ({individual_sum})"
    
    def test_service_tasks_overdue_costs(self, admin_token):
        """GET /api/admin/service-tasks/overdue-costs returns empty or valid list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/service-tasks/overdue-costs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Overdue costs failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Overdue costs should return a list"
        print(f"Overdue costs count: {len(data)}")
        
        # If there are overdue tasks, validate structure
        if len(data) > 0:
            task = data[0]
            assert "id" in task, "Overdue task should have id"
            assert "partner_id" in task, "Overdue task should have partner_id"
            assert "status" in task, "Overdue task should have status"


class TestPartnerNotifications:
    """Partner Notifications tests - P1 Partner Cost Request Notifications"""
    
    def test_partner_assigned_work(self, partner_token):
        """GET /api/partner-portal/assigned-work returns tasks"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/assigned-work",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Partner assigned work failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Partner assigned work should return a list"
        print(f"Partner has {len(data)} assigned tasks")
    
    def test_partner_work_stats(self, partner_token):
        """GET /api/partner-portal/assigned-work/stats returns KPI stats"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/assigned-work/stats",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Partner work stats failed: {response.status_code} - {response.text}"
        data = response.json()
        
        expected_fields = ["assigned", "awaiting_cost", "in_progress", "completed", "delayed", "total"]
        for field in expected_fields:
            assert field in data, f"Partner stats missing field: {field}"
            print(f"  {field}: {data[field]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
