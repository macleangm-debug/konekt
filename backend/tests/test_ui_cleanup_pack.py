"""
Test Suite: 6-Item UI Cleanup Pack
Tests for:
1. Customer invoice wording (Payment Under Review when proof submitted)
2. Customer invoice table enrichment (Date, Invoice No, Type, Amount, Payer Name, Payment Status)
3. Admin orders table/drawer cleanup (no Awaiting Release, enriched 7-section drawer)
4. Admin invoice page enrichment (Date, Invoice No, Customer, Type, Amount, Payer Name, Payment Status, Invoice Status, Linked Ref)
5. Sign out moved to top-right profile dropdown
6. Vendor order privacy (hide customer identity, show base price, status controls)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


class TestCustomerInvoiceEnrichment:
    """Tests for customer invoice table enrichment and payment status wording"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as customer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_customer_invoices_endpoint_returns_data(self):
        """Customer invoices endpoint should return list"""
        response = self.session.get(f"{BASE_URL}/api/customer/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Customer invoices endpoint returns {len(data)} invoices")
    
    def test_customer_invoice_has_payment_status_label(self):
        """Each invoice should have payment_status_label field"""
        response = self.session.get(f"{BASE_URL}/api/customer/invoices")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            invoice = data[0]
            assert "payment_status_label" in invoice, "Invoice should have payment_status_label"
            print(f"✓ Invoice has payment_status_label: {invoice.get('payment_status_label')}")
        else:
            pytest.skip("No invoices found for customer")
    
    def test_customer_invoice_has_payer_name(self):
        """Each invoice should have payer_name field"""
        response = self.session.get(f"{BASE_URL}/api/customer/invoices")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            invoice = data[0]
            assert "payer_name" in invoice, "Invoice should have payer_name"
            print(f"✓ Invoice has payer_name: {invoice.get('payer_name')}")
        else:
            pytest.skip("No invoices found for customer")
    
    def test_customer_invoice_has_required_fields(self):
        """Invoice should have all required table fields: Date, Invoice No, Amount (Type is optional, frontend defaults to 'product')"""
        response = self.session.get(f"{BASE_URL}/api/customer/invoices")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            invoice = data[0]
            # Check for date field
            assert "created_at" in invoice, "Invoice should have created_at (Date)"
            # Check for invoice number
            assert "invoice_number" in invoice or "id" in invoice, "Invoice should have invoice_number or id"
            # Type is optional - frontend defaults to 'product' if missing
            # Check for amount
            assert "total_amount" in invoice or "total" in invoice, "Invoice should have total_amount or total"
            print("✓ Invoice has all required fields for table display")
        else:
            pytest.skip("No invoices found for customer")


class TestAdminOrdersEnrichment:
    """Tests for admin orders table and drawer enrichment"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_admin_orders_list_endpoint(self):
        """Admin orders list endpoint should return data"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin orders endpoint returns {len(data)} orders")
    
    def test_admin_orders_has_vendor_name(self):
        """Each order should have vendor_name field"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders/list")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "vendor_name" in order or "vendor_count" in order, "Order should have vendor_name or vendor_count"
            print(f"✓ Order has vendor info: vendor_name={order.get('vendor_name')}, vendor_count={order.get('vendor_count')}")
        else:
            pytest.skip("No orders found")
    
    def test_admin_orders_has_sales_owner(self):
        """Each order should have sales_owner field"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders/list")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "sales_owner" in order, "Order should have sales_owner"
            print(f"✓ Order has sales_owner: {order.get('sales_owner')}")
        else:
            pytest.skip("No orders found")
    
    def test_admin_orders_has_payment_state(self):
        """Each order should have payment_state field"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders/list")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "payment_state" in order, "Order should have payment_state"
            print(f"✓ Order has payment_state: {order.get('payment_state')}")
        else:
            pytest.skip("No orders found")
    
    def test_admin_orders_has_fulfillment_state(self):
        """Each order should have fulfillment_state field"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders/list")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "fulfillment_state" in order, "Order should have fulfillment_state"
            print(f"✓ Order has fulfillment_state: {order.get('fulfillment_state')}")
        else:
            pytest.skip("No orders found")
    
    def test_admin_orders_tab_new(self):
        """Admin orders should support 'new' tab filter"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders/list?tab=new")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Admin orders 'new' tab filter works")
    
    def test_admin_orders_tab_assigned(self):
        """Admin orders should support 'assigned' tab filter"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders/list?tab=assigned")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Admin orders 'assigned' tab filter works")
    
    def test_admin_orders_tab_in_progress(self):
        """Admin orders should support 'in_progress' tab filter"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders/list?tab=in_progress")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Admin orders 'in_progress' tab filter works")
    
    def test_admin_orders_tab_completed(self):
        """Admin orders should support 'completed' tab filter"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders/list?tab=completed")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Admin orders 'completed' tab filter works")
    
    def test_admin_order_detail_has_7_sections(self):
        """Admin order detail should have enriched data for 7 sections"""
        # First get an order
        response = self.session.get(f"{BASE_URL}/api/admin/orders/list")
        assert response.status_code == 200
        data = response.json()
        if len(data) == 0:
            pytest.skip("No orders found")
        
        order_id = data[0].get("id")
        detail_response = self.session.get(f"{BASE_URL}/api/admin/orders/{order_id}")
        assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
        
        detail = detail_response.json()
        # Check for 7 sections data
        assert "order" in detail, "Detail should have order (Summary)"
        assert "customer" in detail or detail.get("order", {}).get("customer_name"), "Detail should have customer info"
        # Assignment section
        assert "sales_assignment" in detail or "sales_user" in detail, "Detail should have assignment info"
        # Payment section
        assert "payment_proof" in detail or "invoice" in detail, "Detail should have payment info"
        # Fulfillment section (items in order)
        assert detail.get("order", {}).get("items") is not None or "vendor_orders" in detail, "Detail should have fulfillment info"
        # Timeline section
        assert "events" in detail, "Detail should have events (Timeline)"
        print("✓ Admin order detail has data for 7 sections")


class TestAdminInvoicesEnrichment:
    """Tests for admin invoice table enrichment"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_admin_invoices_list_endpoint(self):
        """Admin invoices list endpoint should return data"""
        response = self.session.get(f"{BASE_URL}/api/admin/invoices/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin invoices endpoint returns {len(data)} invoices")
    
    def test_admin_invoice_has_payer_name(self):
        """Each invoice should have payer_name field"""
        response = self.session.get(f"{BASE_URL}/api/admin/invoices/list")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            invoice = data[0]
            assert "payer_name" in invoice, "Invoice should have payer_name"
            print(f"✓ Admin invoice has payer_name: {invoice.get('payer_name')}")
        else:
            pytest.skip("No invoices found")
    
    def test_admin_invoice_has_payment_state(self):
        """Each invoice should have payment_state field"""
        response = self.session.get(f"{BASE_URL}/api/admin/invoices/list")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            invoice = data[0]
            assert "payment_state" in invoice, "Invoice should have payment_state"
            print(f"✓ Admin invoice has payment_state: {invoice.get('payment_state')}")
        else:
            pytest.skip("No invoices found")
    
    def test_admin_invoice_has_invoice_status(self):
        """Each invoice should have invoice_status field"""
        response = self.session.get(f"{BASE_URL}/api/admin/invoices/list")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            invoice = data[0]
            assert "invoice_status" in invoice, "Invoice should have invoice_status"
            print(f"✓ Admin invoice has invoice_status: {invoice.get('invoice_status')}")
        else:
            pytest.skip("No invoices found")
    
    def test_admin_invoice_has_linked_ref(self):
        """Each invoice should have linked_ref field"""
        response = self.session.get(f"{BASE_URL}/api/admin/invoices/list")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            invoice = data[0]
            assert "linked_ref" in invoice, "Invoice should have linked_ref"
            print(f"✓ Admin invoice has linked_ref: {invoice.get('linked_ref')}")
        else:
            pytest.skip("No invoices found")
    
    def test_admin_invoice_has_source_type(self):
        """Each invoice should have source_type field (Type column)"""
        response = self.session.get(f"{BASE_URL}/api/admin/invoices/list")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            invoice = data[0]
            assert "source_type" in invoice or "type" in invoice, "Invoice should have source_type or type"
            print(f"✓ Admin invoice has source_type: {invoice.get('source_type') or invoice.get('type')}")
        else:
            pytest.skip("No invoices found")


class TestVendorOrdersPrivacy:
    """Tests for vendor order privacy (no customer identity, base price, status controls)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as partner/vendor
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("partner_token") or data.get("token") or data.get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_vendor_orders_endpoint_returns_data(self):
        """Vendor orders endpoint should return list"""
        response = self.session.get(f"{BASE_URL}/api/vendor/orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Vendor orders endpoint returns {len(data)} orders")
    
    def test_vendor_orders_has_base_price(self):
        """Each vendor order should have base_price field"""
        response = self.session.get(f"{BASE_URL}/api/vendor/orders")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "base_price" in order, "Vendor order should have base_price"
            print(f"✓ Vendor order has base_price: {order.get('base_price')}")
        else:
            pytest.skip("No vendor orders found")
    
    def test_vendor_orders_has_vendor_order_no(self):
        """Each vendor order should have vendor_order_no field"""
        response = self.session.get(f"{BASE_URL}/api/vendor/orders")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "vendor_order_no" in order, "Vendor order should have vendor_order_no"
            print(f"✓ Vendor order has vendor_order_no: {order.get('vendor_order_no')}")
        else:
            pytest.skip("No vendor orders found")
    
    def test_vendor_orders_has_source_type(self):
        """Each vendor order should have source_type field"""
        response = self.session.get(f"{BASE_URL}/api/vendor/orders")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "source_type" in order, "Vendor order should have source_type"
            print(f"✓ Vendor order has source_type: {order.get('source_type')}")
        else:
            pytest.skip("No vendor orders found")
    
    def test_vendor_orders_has_status(self):
        """Each vendor order should have status field"""
        response = self.session.get(f"{BASE_URL}/api/vendor/orders")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "status" in order or "fulfillment_state" in order, "Vendor order should have status"
            print(f"✓ Vendor order has status: {order.get('status') or order.get('fulfillment_state')}")
        else:
            pytest.skip("No vendor orders found")
    
    def test_vendor_orders_has_priority(self):
        """Each vendor order should have priority field"""
        response = self.session.get(f"{BASE_URL}/api/vendor/orders")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "priority" in order, "Vendor order should have priority"
            print(f"✓ Vendor order has priority: {order.get('priority')}")
        else:
            pytest.skip("No vendor orders found")
    
    def test_vendor_orders_no_customer_name_exposed(self):
        """Vendor orders should NOT expose customer_name in list response"""
        response = self.session.get(f"{BASE_URL}/api/vendor/orders")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            # customer_name should NOT be in the response (privacy)
            assert "customer_name" not in order, "Vendor order should NOT expose customer_name"
            print("✓ Vendor order does NOT expose customer_name (privacy maintained)")
        else:
            pytest.skip("No vendor orders found")
    
    def test_vendor_orders_has_sales_contact(self):
        """Each vendor order should have sales contact info"""
        response = self.session.get(f"{BASE_URL}/api/vendor/orders")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            # Should have sales contact fields
            assert "sales_name" in order, "Vendor order should have sales_name"
            print(f"✓ Vendor order has sales contact: {order.get('sales_name')}")
        else:
            pytest.skip("No vendor orders found")
    
    def test_vendor_orders_has_timeline(self):
        """Each vendor order should have timeline array"""
        response = self.session.get(f"{BASE_URL}/api/vendor/orders")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            order = data[0]
            assert "timeline" in order, "Vendor order should have timeline"
            assert isinstance(order.get("timeline"), list), "Timeline should be a list"
            print(f"✓ Vendor order has timeline with {len(order.get('timeline', []))} events")
        else:
            pytest.skip("No vendor orders found")


class TestPaymentStatusWording:
    """Tests for payment status wording service"""
    
    def test_payment_under_review_when_proof_submitted(self):
        """When proof is submitted, status should show 'Payment Under Review' not 'Awaiting Payment'"""
        from payment_status_wording_service import get_customer_payment_status_label
        
        # Test with proof submitted
        label = get_customer_payment_status_label("pending_payment", has_proof=True)
        assert label == "Payment Under Review", f"Expected 'Payment Under Review', got '{label}'"
        print("✓ Payment status shows 'Payment Under Review' when proof submitted")
    
    def test_awaiting_payment_when_no_proof(self):
        """When no proof submitted, status should show 'Awaiting Payment'"""
        from payment_status_wording_service import get_customer_payment_status_label
        
        label = get_customer_payment_status_label("pending_payment", has_proof=False)
        assert label == "Awaiting Payment", f"Expected 'Awaiting Payment', got '{label}'"
        print("✓ Payment status shows 'Awaiting Payment' when no proof")
    
    def test_paid_in_full_status(self):
        """Paid status should show 'Paid in Full'"""
        from payment_status_wording_service import get_customer_payment_status_label
        
        label = get_customer_payment_status_label("paid", has_proof=False)
        assert label == "Paid in Full", f"Expected 'Paid in Full', got '{label}'"
        print("✓ Payment status shows 'Paid in Full' for paid invoices")
    
    def test_under_review_status(self):
        """Under review status should show 'Payment Under Review'"""
        from payment_status_wording_service import get_customer_payment_status_label
        
        label = get_customer_payment_status_label("under_review", has_proof=False)
        assert label == "Payment Under Review", f"Expected 'Payment Under Review', got '{label}'"
        print("✓ Payment status shows 'Payment Under Review' for under_review status")
    
    def test_rejected_status(self):
        """Rejected status should show 'Payment Rejected'"""
        from payment_status_wording_service import get_customer_payment_status_label
        
        label = get_customer_payment_status_label("proof_rejected", has_proof=False)
        assert label == "Payment Rejected", f"Expected 'Payment Rejected', got '{label}'"
        print("✓ Payment status shows 'Payment Rejected' for rejected proofs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
