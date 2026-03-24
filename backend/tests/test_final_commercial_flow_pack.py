"""
Test Final Commercial Flow Pack - Backend API Tests
Tests for:
- Customer Account Profile APIs (GET/PUT profile, prefill)
- Commercial Flow APIs (create-product-checkout, payment-proof, payment-proof/approve, quote/accept-and-create-invoice)
- Orders Split View API
- Invoices API with status labels
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test customer credentials
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def customer_token(api_client):
    """Get customer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def customer_id(api_client, customer_token):
    """Get customer ID from auth/me"""
    response = api_client.get(f"{BASE_URL}/api/auth/me", headers={
        "Authorization": f"Bearer {customer_token}"
    })
    if response.status_code == 200:
        return response.json().get("id")
    pytest.skip("Could not get customer ID")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping admin tests")


class TestCustomerAccountProfile:
    """Tests for /api/customer-account/profile endpoints"""
    
    def test_get_profile_returns_structure(self, api_client, customer_id):
        """GET /api/customer-account/profile returns profile with phone_prefix_options and delivery_addresses"""
        response = api_client.get(f"{BASE_URL}/api/customer-account/profile?customer_id={customer_id}")
        assert response.status_code == 200
        
        data = response.json()
        # Verify required fields
        assert "phone_prefix_options" in data
        assert isinstance(data["phone_prefix_options"], list)
        assert len(data["phone_prefix_options"]) > 0
        assert "+255" in data["phone_prefix_options"]
        
        assert "delivery_addresses" in data
        assert isinstance(data["delivery_addresses"], list)
        
        assert "account_type" in data
        assert "customer_id" in data
        print(f"Profile structure verified: account_type={data['account_type']}, addresses={len(data['delivery_addresses'])}")
    
    def test_save_profile_personal_type(self, api_client, customer_id):
        """PUT /api/customer-account/profile saves personal account type"""
        test_name = f"Test User {uuid.uuid4().hex[:6]}"
        payload = {
            "customer_id": customer_id,
            "account_type": "personal",
            "contact_name": test_name,
            "phone_prefix": "+255",
            "phone": "712345678",
            "email": "test@example.com"
        }
        response = api_client.put(f"{BASE_URL}/api/customer-account/profile", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert data["value"]["account_type"] == "personal"
        assert data["value"]["contact_name"] == test_name
        print(f"Personal profile saved: {test_name}")
    
    def test_save_profile_business_type_with_addresses(self, api_client, customer_id):
        """PUT /api/customer-account/profile saves business type with up to 3 addresses"""
        addresses = [
            {
                "label": "Office",
                "recipient_name": "John Doe",
                "phone_prefix": "+255",
                "phone": "712345678",
                "address_line": "123 Main St",
                "city": "Dar es Salaam",
                "region": "Dar es Salaam",
                "is_default": True
            },
            {
                "label": "Warehouse",
                "recipient_name": "Jane Doe",
                "phone_prefix": "+254",
                "phone": "722345678",
                "address_line": "456 Industrial Rd",
                "city": "Arusha",
                "region": "Arusha",
                "is_default": False
            },
            {
                "label": "Branch",
                "recipient_name": "Bob Smith",
                "phone_prefix": "+256",
                "phone": "732345678",
                "address_line": "789 Branch Ave",
                "city": "Mwanza",
                "region": "Mwanza",
                "is_default": False
            }
        ]
        
        payload = {
            "customer_id": customer_id,
            "account_type": "business",
            "business_name": "Test Business Ltd",
            "tin": "123456789",
            "vat_number": "VAT123456",
            "quote_client_name": "Test Business Ltd",
            "quote_client_phone_prefix": "+255",
            "quote_client_phone": "712345678",
            "quote_client_email": "business@test.com",
            "quote_client_tin": "123456789",
            "delivery_addresses": addresses
        }
        response = api_client.put(f"{BASE_URL}/api/customer-account/profile", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert data["value"]["account_type"] == "business"
        assert len(data["value"]["delivery_addresses"]) == 3
        
        # Verify default address
        default_addr = next((a for a in data["value"]["delivery_addresses"] if a.get("is_default")), None)
        assert default_addr is not None
        assert default_addr["label"] == "Office"
        print(f"Business profile saved with {len(data['value']['delivery_addresses'])} addresses")
    
    def test_save_profile_requires_customer_id(self, api_client):
        """PUT /api/customer-account/profile returns 400 when customer_id missing"""
        payload = {"account_type": "personal"}
        response = api_client.put(f"{BASE_URL}/api/customer-account/profile", json=payload)
        assert response.status_code == 400
        print("Correctly rejected profile save without customer_id")
    
    def test_prefill_returns_saved_details(self, api_client, customer_id):
        """GET /api/customer-account/prefill returns saved details for checkout"""
        response = api_client.get(f"{BASE_URL}/api/customer-account/prefill?customer_id={customer_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "phone_prefix_options" in data
        assert "delivery_addresses" in data
        print(f"Prefill returned: {len(data.get('delivery_addresses', []))} addresses")


class TestCommercialFlowCheckout:
    """Tests for /api/commercial-flow/create-product-checkout"""
    
    def test_create_product_checkout_full_flow(self, api_client, customer_id):
        """POST /api/commercial-flow/create-product-checkout creates checkout+invoice+order+vendor_orders+sales_assignment+event"""
        items = [
            {
                "id": f"prod-{uuid.uuid4().hex[:8]}",
                "name": "Test Product A",
                "quantity": 2,
                "price": 50000,
                "vendor_id": "vendor-001"
            },
            {
                "id": f"prod-{uuid.uuid4().hex[:8]}",
                "name": "Test Product B",
                "quantity": 1,
                "price": 75000,
                "vendor_id": "vendor-002"
            }
        ]
        
        payload = {
            "customer_id": customer_id,
            "items": items,
            "vat_percent": 18,
            "delivery": {
                "recipient_name": "Test Recipient",
                "phone_prefix": "+255",
                "phone": "712345678",
                "address_line": "123 Test St",
                "city": "Dar es Salaam",
                "region": "Dar es Salaam"
            },
            "quote_details": {
                "client_name": "Test Client",
                "client_phone": "712345678",
                "client_email": "client@test.com",
                "client_tin": "123456789"
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/create-product-checkout", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        
        # Verify checkout created
        assert "checkout" in data
        checkout = data["checkout"]
        assert checkout["customer_id"] == customer_id
        assert checkout["status"] == "awaiting_payment"
        
        # Verify invoice created
        assert "invoice" in data
        invoice = data["invoice"]
        assert invoice["invoice_number"].startswith("KON-INV-")
        assert invoice["status"] == "pending_payment"
        
        # Verify order created
        assert "order" in data
        order = data["order"]
        assert order["order_number"].startswith("KON-ORD-")
        assert order["status"] == "pending_payment_confirmation"
        
        # Verify VAT calculation (subtotal = 2*50000 + 1*75000 = 175000, VAT = 31500, total = 206500)
        expected_subtotal = 175000
        expected_vat = expected_subtotal * 0.18
        expected_total = expected_subtotal + expected_vat
        assert order["subtotal_amount"] == expected_subtotal
        assert order["vat_amount"] == expected_vat
        assert order["total_amount"] == expected_total
        
        print(f"Checkout created: order={order['order_number']}, invoice={invoice['invoice_number']}, total={order['total_amount']}")
        return data
    
    def test_create_checkout_requires_customer_id_and_items(self, api_client):
        """POST /api/commercial-flow/create-product-checkout returns 400 when required fields missing"""
        # Missing customer_id
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/create-product-checkout", json={
            "items": [{"id": "test", "name": "Test", "quantity": 1, "price": 1000}]
        })
        assert response.status_code == 400
        
        # Missing items
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/create-product-checkout", json={
            "customer_id": "test-customer"
        })
        assert response.status_code == 400
        print("Correctly rejected checkout without required fields")


class TestPaymentProof:
    """Tests for /api/commercial-flow/payment-proof endpoints"""
    
    @pytest.fixture
    def checkout_data(self, api_client, customer_id):
        """Create a checkout to test payment proof"""
        items = [{"id": f"prod-{uuid.uuid4().hex[:8]}", "name": "Test Product", "quantity": 1, "price": 100000}]
        payload = {
            "customer_id": customer_id,
            "items": items,
            "vat_percent": 18,
            "delivery": {"recipient_name": "Test", "address_line": "123 Test St", "city": "DSM", "region": "DSM"}
        }
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/create-product-checkout", json=payload)
        return response.json()
    
    def test_upload_payment_proof(self, api_client, customer_id, checkout_data):
        """POST /api/commercial-flow/payment-proof uploads proof with uploaded status"""
        invoice_id = checkout_data["invoice"]["id"]
        
        payload = {
            "invoice_id": invoice_id,
            "customer_id": customer_id,
            "payer_name": "Test Payer",
            "reference_number": f"REF-{uuid.uuid4().hex[:8]}",
            "amount_paid": 118000,  # 100000 + 18% VAT
            "file_url": "https://example.com/proof.pdf"
        }
        
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/payment-proof", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert "payment_proof" in data
        
        proof = data["payment_proof"]
        assert proof["status"] == "uploaded"
        assert proof["invoice_id"] == invoice_id
        assert proof["payer_name"] == "Test Payer"
        assert "approvable_roles" in proof
        assert "admin" in proof["approvable_roles"]
        assert "finance" in proof["approvable_roles"]
        
        print(f"Payment proof uploaded: id={proof['id']}, status={proof['status']}")
        return proof
    
    def test_upload_payment_proof_requires_fields(self, api_client):
        """POST /api/commercial-flow/payment-proof returns 400 when required fields missing"""
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/payment-proof", json={
            "invoice_id": "test",
            "customer_id": "test"
            # Missing amount_paid
        })
        assert response.status_code == 400
        print("Correctly rejected payment proof without required fields")
    
    def test_approve_payment_proof_admin_role(self, api_client, customer_id, checkout_data):
        """POST /api/commercial-flow/payment-proof/approve allows admin role"""
        # First upload a proof
        invoice_id = checkout_data["invoice"]["id"]
        proof_response = api_client.post(f"{BASE_URL}/api/commercial-flow/payment-proof", json={
            "invoice_id": invoice_id,
            "customer_id": customer_id,
            "payer_name": "Admin Test Payer",
            "reference_number": f"REF-{uuid.uuid4().hex[:8]}",
            "amount_paid": 118000
        })
        proof_id = proof_response.json()["payment_proof"]["id"]
        
        # Approve with admin role
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/payment-proof/approve", json={
            "payment_proof_id": proof_id,
            "approver_role": "admin"
        })
        assert response.status_code == 200
        assert response.json().get("ok") == True
        print(f"Payment proof approved by admin: {proof_id}")
    
    def test_approve_payment_proof_finance_role(self, api_client, customer_id, checkout_data):
        """POST /api/commercial-flow/payment-proof/approve allows finance role"""
        # First upload a proof
        invoice_id = checkout_data["invoice"]["id"]
        proof_response = api_client.post(f"{BASE_URL}/api/commercial-flow/payment-proof", json={
            "invoice_id": invoice_id,
            "customer_id": customer_id,
            "payer_name": "Finance Test Payer",
            "reference_number": f"REF-{uuid.uuid4().hex[:8]}",
            "amount_paid": 118000
        })
        proof_id = proof_response.json()["payment_proof"]["id"]
        
        # Approve with finance role
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/payment-proof/approve", json={
            "payment_proof_id": proof_id,
            "approver_role": "finance"
        })
        assert response.status_code == 200
        assert response.json().get("ok") == True
        print(f"Payment proof approved by finance: {proof_id}")
    
    def test_approve_payment_proof_rejects_sales_role(self, api_client, customer_id, checkout_data):
        """POST /api/commercial-flow/payment-proof/approve rejects sales role"""
        # First upload a proof
        invoice_id = checkout_data["invoice"]["id"]
        proof_response = api_client.post(f"{BASE_URL}/api/commercial-flow/payment-proof", json={
            "invoice_id": invoice_id,
            "customer_id": customer_id,
            "payer_name": "Sales Test Payer",
            "reference_number": f"REF-{uuid.uuid4().hex[:8]}",
            "amount_paid": 118000
        })
        proof_id = proof_response.json()["payment_proof"]["id"]
        
        # Try to approve with sales role - should be rejected
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/payment-proof/approve", json={
            "payment_proof_id": proof_id,
            "approver_role": "sales"
        })
        assert response.status_code == 403
        print("Correctly rejected payment proof approval by sales role")


class TestQuoteAcceptAndCreateInvoice:
    """Tests for /api/commercial-flow/quote/accept-and-create-invoice"""
    
    def test_accept_quote_requires_quote_id(self, api_client):
        """POST /api/commercial-flow/quote/accept-and-create-invoice returns 400 when quote_id missing"""
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/quote/accept-and-create-invoice", json={
            "payment_type": "full"
        })
        assert response.status_code == 400
        print("Correctly rejected quote accept without quote_id")
    
    def test_accept_quote_returns_404_for_unknown_quote(self, api_client):
        """POST /api/commercial-flow/quote/accept-and-create-invoice returns 404 for unknown quote"""
        response = api_client.post(f"{BASE_URL}/api/commercial-flow/quote/accept-and-create-invoice", json={
            "quote_id": f"unknown-{uuid.uuid4().hex}",
            "payment_type": "full"
        })
        assert response.status_code == 404
        print("Correctly returned 404 for unknown quote")


class TestOrdersSplitView:
    """Tests for /api/commercial-flow/orders/split-view"""
    
    def test_orders_split_view_returns_orders_with_status_label(self, api_client, customer_id):
        """GET /api/commercial-flow/orders/split-view returns orders with preview.status_label and events timeline"""
        response = api_client.get(f"{BASE_URL}/api/commercial-flow/orders/split-view?customer_id={customer_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            order = data[0]
            assert "preview" in order
            assert "status_label" in order["preview"]
            assert "events" in order["preview"]
            
            # Verify status_label is human-readable (not raw status)
            status_label = order["preview"]["status_label"]
            assert status_label in ["Unpaid", "Payment Under Review", "Paid", "Processing", "Ready to Fulfill", "Awaiting Your Approval"] or " " in status_label
            
            print(f"Orders split view: {len(data)} orders, first order status_label={status_label}")
        else:
            print("No orders found for customer (expected if new customer)")


class TestInvoicesWithStatusLabel:
    """Tests for /api/commercial-flow/invoices"""
    
    def test_invoices_returns_status_label(self, api_client, customer_id):
        """GET /api/commercial-flow/invoices returns customer invoices with status_label"""
        response = api_client.get(f"{BASE_URL}/api/commercial-flow/invoices?customer_id={customer_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            invoice = data[0]
            assert "status_label" in invoice
            
            # Verify status_label is human-readable
            status_label = invoice["status_label"]
            assert status_label in ["Unpaid", "Payment Under Review", "Paid", "Awaiting Your Approval"] or " " in status_label
            
            print(f"Invoices: {len(data)} invoices, first invoice status_label={status_label}")
        else:
            print("No invoices found for customer (expected if new customer)")


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_health(self, api_client):
        """API health check"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("API health check passed")
    
    def test_customer_login(self, api_client):
        """Customer login works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        assert "token" in response.json()
        print("Customer login successful")
    
    def test_admin_login(self, api_client):
        """Admin login works"""
        response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        assert "token" in response.json()
        print("Admin login successful")
