"""
Test Customer Payment Flow Completion Pack
- Customer Account Profile Management (personal/business)
- Cart drawer with quantity editing, VAT calculation, and direct payment flow
- Quote approval → invoice creation
- My Account page with delivery & invoice defaults
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def customer_auth(api_client):
    """Get customer authentication token and user info"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return {
            "token": data.get("token"),
            "user": data.get("user"),
            "customer_id": data.get("user", {}).get("id")
        }
    pytest.skip(f"Customer authentication failed: {response.status_code}")

@pytest.fixture(scope="module")
def authenticated_client(api_client, customer_auth):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {customer_auth['token']}"})
    return api_client


class TestCustomerAccountProfileAPI:
    """Test /api/customer-account/profile endpoints"""
    
    def test_get_profile_returns_default_for_new_customer(self, api_client, customer_auth):
        """GET /api/customer-account/profile returns default profile for customer"""
        customer_id = customer_auth["customer_id"]
        response = api_client.get(f"{BASE_URL}/api/customer-account/profile?customer_id={customer_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify default profile structure
        assert "account_type" in data
        assert "contact_name" in data
        assert "phone" in data
        assert "email" in data
        assert "business_name" in data
        assert "delivery_recipient_name" in data
        assert "invoice_client_name" in data
        print(f"PASS: GET profile returns default structure with account_type={data.get('account_type')}")
    
    def test_save_profile_personal_account(self, api_client, customer_auth):
        """PUT /api/customer-account/profile saves personal account profile"""
        customer_id = customer_auth["customer_id"]
        payload = {
            "customer_id": customer_id,
            "account_type": "personal",
            "contact_name": "Test Customer",
            "phone": "+255712345678",
            "email": "test@example.com",
            "delivery_recipient_name": "Test Recipient",
            "delivery_phone": "+255712345679",
            "delivery_address_line": "123 Test Street",
            "delivery_city": "Dar es Salaam",
            "delivery_region": "Dar es Salaam",
            "invoice_client_name": "Test Customer",
            "invoice_client_phone": "+255712345678",
            "invoice_client_email": "test@example.com",
            "invoice_client_tin": ""
        }
        
        response = api_client.put(f"{BASE_URL}/api/customer-account/profile", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "value" in data
        assert data["value"]["account_type"] == "personal"
        assert data["value"]["contact_name"] == "Test Customer"
        print("PASS: PUT profile saves personal account successfully")
    
    def test_save_profile_business_account(self, api_client, customer_auth):
        """PUT /api/customer-account/profile saves business account with TIN/VAT"""
        customer_id = customer_auth["customer_id"]
        payload = {
            "customer_id": customer_id,
            "account_type": "business",
            "contact_name": "Business Contact",
            "phone": "+255712345678",
            "email": "business@example.com",
            "business_name": "Test Business Ltd",
            "tin": "123-456-789",
            "vat_number": "VAT-001",
            "delivery_recipient_name": "Warehouse Manager",
            "delivery_phone": "+255712345680",
            "delivery_address_line": "456 Business Park",
            "delivery_city": "Dar es Salaam",
            "delivery_region": "Dar es Salaam",
            "invoice_client_name": "Test Business Ltd",
            "invoice_client_phone": "+255712345678",
            "invoice_client_email": "accounts@business.com",
            "invoice_client_tin": "123-456-789"
        }
        
        response = api_client.put(f"{BASE_URL}/api/customer-account/profile", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert data["value"]["account_type"] == "business"
        assert data["value"]["business_name"] == "Test Business Ltd"
        assert data["value"]["tin"] == "123-456-789"
        print("PASS: PUT profile saves business account with TIN/VAT")
    
    def test_get_profile_returns_saved_data(self, api_client, customer_auth):
        """GET /api/customer-account/profile returns previously saved data"""
        customer_id = customer_auth["customer_id"]
        response = api_client.get(f"{BASE_URL}/api/customer-account/profile?customer_id={customer_id}")
        
        assert response.status_code == 200
        data = response.json()
        # Should have the business account data from previous test
        assert data.get("account_type") == "business"
        assert data.get("business_name") == "Test Business Ltd"
        print("PASS: GET profile returns previously saved business data")
    
    def test_save_profile_requires_customer_id(self, api_client):
        """PUT /api/customer-account/profile requires customer_id"""
        payload = {
            "account_type": "personal",
            "contact_name": "No Customer ID"
        }
        
        response = api_client.put(f"{BASE_URL}/api/customer-account/profile", json=payload)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: PUT profile returns 400 when customer_id missing")


class TestCustomerAccountPrefillAPI:
    """Test /api/customer-account/prefill endpoint for checkout prefill"""
    
    def test_prefill_returns_saved_details(self, api_client, customer_auth):
        """GET /api/customer-account/prefill returns saved details for checkout"""
        customer_id = customer_auth["customer_id"]
        response = api_client.get(f"{BASE_URL}/api/customer-account/prefill?customer_id={customer_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should have delivery and invoice fields for prefill
        assert "delivery_recipient_name" in data
        assert "delivery_phone" in data
        assert "delivery_address_line" in data
        assert "invoice_client_name" in data
        assert "invoice_client_email" in data
        print(f"PASS: GET prefill returns delivery/invoice details for checkout")
    
    def test_prefill_returns_default_for_unknown_customer(self, api_client):
        """GET /api/customer-account/prefill returns default for unknown customer"""
        unknown_id = str(uuid.uuid4())
        response = api_client.get(f"{BASE_URL}/api/customer-account/prefill?customer_id={unknown_id}")
        
        assert response.status_code == 200
        data = response.json()
        # Should return default empty profile
        assert data.get("account_type") == "personal"
        assert data.get("contact_name") == ""
        print("PASS: GET prefill returns default for unknown customer")


class TestCheckoutFixedPriceAPI:
    """Test /api/customer-payment/checkout-fixed-price endpoint"""
    
    def test_checkout_creates_order_invoice_payment(self, api_client, customer_auth):
        """POST /api/customer-payment/checkout-fixed-price creates order + invoice + payment"""
        customer_id = customer_auth["customer_id"]
        payload = {
            "customer_id": customer_id,
            "items": [
                {"id": "prod-001", "name": "Test Product 1", "price": 50000, "quantity": 2},
                {"id": "prod-002", "name": "Test Product 2", "price": 30000, "quantity": 1}
            ],
            "vat_percent": 18,
            "payment_method": "manual",
            "billing": {
                "invoice_client_name": "Test Business Ltd",
                "invoice_client_phone": "+255712345678",
                "invoice_client_email": "accounts@business.com",
                "invoice_client_tin": "123-456-789"
            },
            "delivery": {
                "client_name": "Business Contact",
                "client_phone": "+255712345678",
                "recipient_name": "Warehouse Manager",
                "recipient_phone": "+255712345680",
                "address_line": "456 Business Park",
                "city": "Dar es Salaam",
                "region": "Dar es Salaam"
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/customer-payment/checkout-fixed-price", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("ok") == True
        assert "order" in data
        assert "invoice" in data
        assert "payment" in data
        
        # Verify order
        order = data["order"]
        assert "id" in order
        assert "order_number" in order
        assert order["status"] == "paid"
        assert order["customer_id"] == customer_id
        
        # Verify VAT calculation: subtotal = 50000*2 + 30000*1 = 130000, VAT = 23400, total = 153400
        assert order["subtotal_amount"] == 130000
        assert order["vat_amount"] == 23400
        assert order["total_amount"] == 153400
        
        # Verify invoice
        invoice = data["invoice"]
        assert "id" in invoice
        assert "invoice_number" in invoice
        assert invoice["status"] == "paid"
        assert invoice["total_amount"] == 153400
        
        # Verify payment
        payment = data["payment"]
        assert "id" in payment
        assert payment["status"] == "paid"
        assert payment["amount"] == 153400
        
        print(f"PASS: Checkout creates order {order['order_number']}, invoice {invoice['invoice_number']}, payment")
    
    def test_checkout_requires_customer_id_and_items(self, api_client):
        """POST /api/customer-payment/checkout-fixed-price requires customer_id and items"""
        # Missing customer_id
        response = api_client.post(f"{BASE_URL}/api/customer-payment/checkout-fixed-price", json={
            "items": [{"id": "prod-001", "name": "Test", "price": 1000, "quantity": 1}]
        })
        assert response.status_code == 400
        
        # Missing items
        response = api_client.post(f"{BASE_URL}/api/customer-payment/checkout-fixed-price", json={
            "customer_id": "test-id"
        })
        assert response.status_code == 400
        
        print("PASS: Checkout returns 400 when customer_id or items missing")
    
    def test_checkout_handles_single_item(self, api_client, customer_auth):
        """POST /api/customer-payment/checkout-fixed-price handles single item"""
        customer_id = customer_auth["customer_id"]
        payload = {
            "customer_id": customer_id,
            "items": [
                {"id": "prod-single", "name": "Single Product", "price": 100000, "quantity": 1}
            ],
            "vat_percent": 18,
            "payment_method": "manual"
        }
        
        response = api_client.post(f"{BASE_URL}/api/customer-payment/checkout-fixed-price", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        
        # Verify: subtotal = 100000, VAT = 18000, total = 118000
        assert data["order"]["subtotal_amount"] == 100000
        assert data["order"]["vat_amount"] == 18000
        assert data["order"]["total_amount"] == 118000
        
        print("PASS: Checkout handles single item with correct VAT calculation")


class TestApproveQuoteCreateInvoiceAPI:
    """Test /api/customer-payment/approve-quote-create-invoice endpoint"""
    
    @pytest.fixture
    def test_quote(self, api_client, customer_auth):
        """Create a test quote for approval testing"""
        # First, create a quote via the quotes API
        customer_id = customer_auth["customer_id"]
        quote_id = f"test-quote-{uuid.uuid4()}"
        
        # Insert quote directly via admin API or use existing quote
        # For this test, we'll check if the endpoint handles missing quotes correctly
        return {"quote_id": quote_id, "customer_id": customer_id}
    
    def test_approve_quote_requires_quote_id(self, api_client):
        """POST /api/customer-payment/approve-quote-create-invoice requires quote_id"""
        response = api_client.post(f"{BASE_URL}/api/customer-payment/approve-quote-create-invoice", json={})
        
        assert response.status_code == 400
        print("PASS: Approve quote returns 400 when quote_id missing")
    
    def test_approve_quote_returns_404_for_unknown_quote(self, api_client):
        """POST /api/customer-payment/approve-quote-create-invoice returns 404 for unknown quote"""
        response = api_client.post(f"{BASE_URL}/api/customer-payment/approve-quote-create-invoice", json={
            "quote_id": f"unknown-quote-{uuid.uuid4()}"
        })
        
        assert response.status_code == 404
        print("PASS: Approve quote returns 404 for unknown quote")


class TestAPIHealth:
    """Basic health check"""
    
    def test_api_health(self, api_client):
        """Health check endpoint works"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: API health check")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
