"""
Quote Engine Core Tests
Tests for: Quote System, Sales CRM, Installment Payment Logic
- Admin creates quotes from leads
- Admin sends quotes to customers
- Customer accepts/rejects quotes
- Invoice creation with installment splits
"""
import pytest
import requests
import os
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


class TestQuoteEngineCore:
    """Quote Engine Core API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.customer_token = None
        self.customer_id = None
        
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            return self.admin_token
        pytest.skip("Admin authentication failed")
        
    def get_customer_token(self):
        """Get customer authentication token"""
        if self.customer_token:
            return self.customer_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            self.customer_token = data.get("token")
            self.customer_id = data.get("user", {}).get("id")
            return self.customer_token
        pytest.skip("Customer authentication failed")
        
    # ─── Health Check ───────────────────────────────────────────────
    def test_api_health(self):
        """Test API health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")
        
    # ─── Admin Authentication ───────────────────────────────────────
    def test_admin_login(self):
        """Test admin login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✓ Admin login successful")
        
    # ─── Customer Authentication ────────────────────────────────────
    def test_customer_login(self):
        """Test customer login"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print("✓ Customer login successful")
        
    # ─── Quote Engine: Create Quote ─────────────────────────────────
    def test_create_quote_full_payment(self):
        """Test creating a quote with full payment type"""
        token = self.get_admin_token()
        self.get_customer_token()  # Get customer_id
        
        payload = {
            "customer_id": self.customer_id or "test-customer-id",
            "customer_email": CUSTOMER_EMAIL,
            "customer_name": "Demo Customer",
            "type": "service",
            "amount": 500000,
            "items": [
                {"name": "Test Service", "quantity": 1, "unit_price": 500000}
            ],
            "payment_type": "full",
            "deposit_percent": 0,
            "notes": "Test quote - full payment"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/quotes-engine/create",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("payment_type") == "full"
        assert data.get("status") == "draft"
        assert data.get("total_amount") > 0
        print(f"✓ Created full payment quote: {data.get('quote_number')}")
        return data
        
    def test_create_quote_installment_payment(self):
        """Test creating a quote with installment payment type"""
        token = self.get_admin_token()
        self.get_customer_token()
        
        payload = {
            "customer_id": self.customer_id or "test-customer-id",
            "customer_email": CUSTOMER_EMAIL,
            "customer_name": "Demo Customer",
            "type": "service",
            "amount": 1000000,
            "items": [
                {"name": "Premium Service", "quantity": 1, "unit_price": 1000000}
            ],
            "payment_type": "installment",
            "deposit_percent": 30,
            "notes": "Test quote - installment payment (30% deposit)"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/quotes-engine/create",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("payment_type") == "installment"
        assert data.get("deposit_percent") == 30
        assert data.get("status") == "draft"
        print(f"✓ Created installment quote: {data.get('quote_number')}")
        return data
        
    # ─── Quote Engine: Send Quote ───────────────────────────────────
    def test_send_quote(self):
        """Test sending a draft quote to customer"""
        token = self.get_admin_token()
        
        # First create a quote
        quote = self.test_create_quote_full_payment()
        quote_id = quote.get("id")
        
        # Send the quote
        response = self.session.post(
            f"{BASE_URL}/api/quotes-engine/{quote_id}/send",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert data.get("status") == "sent"
        print(f"✓ Quote sent successfully: {quote_id}")
        return quote_id
        
    # ─── Quote Engine: Get Quote Detail ─────────────────────────────
    def test_get_quote_detail(self):
        """Test getting quote detail"""
        token = self.get_admin_token()
        
        # Create and send a quote
        quote = self.test_create_quote_full_payment()
        quote_id = quote.get("id")
        
        response = self.session.get(
            f"{BASE_URL}/api/quotes-engine/{quote_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "quote" in data
        assert data["quote"].get("id") == quote_id
        print(f"✓ Quote detail retrieved: {quote_id}")
        
    # ─── Customer: List My Quotes ───────────────────────────────────
    def test_customer_list_quotes(self):
        """Test customer listing their quotes"""
        token = self.get_customer_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/customer/quotes",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Customer quotes listed: {len(data)} quotes")
        
    # ─── Customer: Accept Quote (Full Payment) ──────────────────────
    def test_customer_accept_quote_full_payment(self):
        """Test customer accepting a quote with full payment"""
        admin_token = self.get_admin_token()
        customer_token = self.get_customer_token()
        
        # Create and send a quote
        payload = {
            "customer_id": self.customer_id,
            "customer_email": CUSTOMER_EMAIL,
            "customer_name": "Demo Customer",
            "type": "service",
            "amount": 250000,
            "items": [{"name": "Test Item", "quantity": 1, "unit_price": 250000}],
            "payment_type": "full",
            "deposit_percent": 0,
            "notes": "Test quote for acceptance"
        }
        
        create_res = self.session.post(
            f"{BASE_URL}/api/quotes-engine/create",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_res.status_code == 200
        quote = create_res.json()
        quote_id = quote.get("id")
        
        # Send the quote
        self.session.post(
            f"{BASE_URL}/api/quotes-engine/{quote_id}/send",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Customer accepts the quote
        response = self.session.post(
            f"{BASE_URL}/api/customer/quotes/{quote_id}/approve",
            json={"convert_to_invoice": True},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "invoice" in data
        assert data["invoice"].get("id") is not None
        assert data["invoice"].get("payment_type") == "full"
        print(f"✓ Quote accepted, invoice created: {data['invoice'].get('invoice_number')}")
        return data
        
    # ─── Customer: Accept Quote (Installment) with Splits ───────────
    def test_customer_accept_quote_installment_creates_splits(self):
        """Test customer accepting installment quote creates invoice splits"""
        admin_token = self.get_admin_token()
        customer_token = self.get_customer_token()
        
        # Create installment quote
        payload = {
            "customer_id": self.customer_id,
            "customer_email": CUSTOMER_EMAIL,
            "customer_name": "Demo Customer",
            "type": "service",
            "amount": 1000000,
            "items": [{"name": "Premium Service", "quantity": 1, "unit_price": 1000000}],
            "payment_type": "installment",
            "deposit_percent": 30,
            "notes": "Installment quote test"
        }
        
        create_res = self.session.post(
            f"{BASE_URL}/api/quotes-engine/create",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_res.status_code == 200
        quote = create_res.json()
        quote_id = quote.get("id")
        
        # Send the quote
        self.session.post(
            f"{BASE_URL}/api/quotes-engine/{quote_id}/send",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Customer accepts
        response = self.session.post(
            f"{BASE_URL}/api/customer/quotes/{quote_id}/approve",
            json={"convert_to_invoice": True},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify invoice created
        assert "invoice" in data
        invoice = data["invoice"]
        assert invoice.get("payment_type") == "installment"
        assert invoice.get("has_installments") == True
        
        # Verify splits created
        assert "splits" in data
        splits = data["splits"]
        assert len(splits) == 2  # deposit + balance
        
        deposit_split = next((s for s in splits if s.get("type") == "deposit"), None)
        balance_split = next((s for s in splits if s.get("type") == "balance"), None)
        
        assert deposit_split is not None
        assert balance_split is not None
        
        # Verify amounts (30% deposit, 70% balance)
        total = invoice.get("total_amount", 0)
        expected_deposit = round(total * 0.30, 2)
        expected_balance = round(total * 0.70, 2)
        
        assert abs(deposit_split.get("amount", 0) - expected_deposit) < 1
        assert abs(balance_split.get("amount", 0) - expected_balance) < 1
        
        print(f"✓ Installment quote accepted with splits:")
        print(f"  - Deposit: {deposit_split.get('amount')}")
        print(f"  - Balance: {balance_split.get('amount')}")
        return data
        
    # ─── Customer: Reject Quote ─────────────────────────────────────
    def test_customer_reject_quote(self):
        """Test customer rejecting a quote"""
        admin_token = self.get_admin_token()
        customer_token = self.get_customer_token()
        
        # Create and send a quote
        payload = {
            "customer_id": self.customer_id,
            "customer_email": CUSTOMER_EMAIL,
            "customer_name": "Demo Customer",
            "type": "service",
            "amount": 100000,
            "items": [{"name": "Test Item", "quantity": 1, "unit_price": 100000}],
            "payment_type": "full",
            "notes": "Quote to be rejected"
        }
        
        create_res = self.session.post(
            f"{BASE_URL}/api/quotes-engine/create",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        quote = create_res.json()
        quote_id = quote.get("id")
        
        # Send the quote
        self.session.post(
            f"{BASE_URL}/api/quotes-engine/{quote_id}/send",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Customer rejects
        response = self.session.post(
            f"{BASE_URL}/api/customer/quotes/{quote_id}/reject",
            json={"reason": "Price too high"},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print(f"✓ Quote rejected successfully: {quote_id}")
        
    # ─── Customer: List Invoices ────────────────────────────────────
    def test_customer_list_invoices(self):
        """Test customer listing their invoices"""
        token = self.get_customer_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/customer/invoices",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Customer invoices listed: {len(data)} invoices")
        
    # ─── Customer: Get Invoice with Splits ──────────────────────────
    def test_customer_get_invoice_with_splits(self):
        """Test customer getting invoice detail with installment splits"""
        # First create an installment quote and accept it
        result = self.test_customer_accept_quote_installment_creates_splits()
        invoice_id = result["invoice"]["id"]
        
        customer_token = self.get_customer_token()
        
        # Get invoice detail
        response = self.session.get(
            f"{BASE_URL}/api/customer/invoices/{invoice_id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify invoice has installment info
        assert data.get("has_installments") == True or data.get("deposit_amount", 0) > 0
        
        # Splits may be inline or need separate fetch
        if "splits" in data and len(data["splits"]) > 0:
            assert len(data["splits"]) == 2
            print(f"✓ Invoice detail with inline splits retrieved: {invoice_id}")
        else:
            # Fetch splits separately
            splits_response = self.session.get(
                f"{BASE_URL}/api/customer/invoices/{invoice_id}/splits",
                headers={"Authorization": f"Bearer {customer_token}"}
            )
            assert splits_response.status_code == 200
            splits = splits_response.json()
            assert len(splits) == 2
            print(f"✓ Invoice detail retrieved, splits fetched separately: {invoice_id}")
        
    # ─── Customer: Get Invoice Splits Endpoint ──────────────────────
    def test_customer_get_invoice_splits_endpoint(self):
        """Test the dedicated splits endpoint"""
        # First create an installment quote and accept it
        result = self.test_customer_accept_quote_installment_creates_splits()
        invoice_id = result["invoice"]["id"]
        
        customer_token = self.get_customer_token()
        
        # Get splits via dedicated endpoint
        response = self.session.get(
            f"{BASE_URL}/api/customer/invoices/{invoice_id}/splits",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        splits = response.json()
        assert isinstance(splits, list)
        assert len(splits) == 2
        
        # Verify split structure
        for split in splits:
            assert "id" in split
            assert "type" in split
            assert "amount" in split
            assert "status" in split
            assert split["type"] in ["deposit", "balance"]
        print(f"✓ Invoice splits endpoint working: {len(splits)} splits")
        
    # ─── Admin: Sales CRM Leads ─────────────────────────────────────
    def test_admin_sales_crm_leads(self):
        """Test admin getting sales CRM leads"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-crm/leads",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Sales CRM leads retrieved: {len(data)} leads")
        
    # ─── Admin: Quotes List ─────────────────────────────────────────
    def test_admin_quotes_list(self):
        """Test admin getting quotes list"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/quotes/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin quotes list retrieved: {len(data)} quotes")
        
    # ─── Admin: Orders List ─────────────────────────────────────────
    def test_admin_orders_list(self):
        """Test admin getting orders list"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin orders list retrieved: {len(data)} orders")
        
    # ─── Admin: Sales Performance ───────────────────────────────────
    def test_admin_sales_performance(self):
        """Test admin getting sales performance data"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-crm/performance",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Sales performance data retrieved: {len(data)} entries")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
