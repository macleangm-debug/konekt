"""
Test Customer CRUD API with Payment Terms
Tests the full flow: Customer -> Quote -> Invoice -> PDF with payment terms

Endpoints tested:
- POST /api/admin/customers - Create customer
- GET /api/admin/customers - List customers
- GET /api/admin/customers/{id} - Get specific customer
- GET /api/admin/customers/by-email/{email} - Get customer by email
- PATCH /api/admin/customers/{id} - Update customer
- DELETE /api/admin/customers/{id} - Soft delete customer
- POST /api/admin/quotes-v2 - Create quote with auto-applied payment terms
- POST /api/admin/invoices-v2 - Create invoice with auto-calculated due date
"""
import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://konekt-platform.preview.emergentagent.com').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_"


class TestCustomerCRUD:
    """Tests for Customer CRUD operations"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_customer_ids = []

    def teardown_method(self, method):
        """Cleanup test customers after each test"""
        for customer_id in self.created_customer_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/customers/{customer_id}")
            except:
                pass

    def test_create_customer_with_payment_terms(self):
        """Test creating a customer with specific payment terms"""
        timestamp = int(time.time())
        payload = {
            "company_name": f"{TEST_PREFIX}Acme Corp {timestamp}",
            "contact_name": f"{TEST_PREFIX}John Doe",
            "email": f"test_john_{timestamp}@acmecorp.tz",
            "phone": "+255712345678",
            "address_line_1": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "tax_number": "TIN123456789",
            "business_registration_number": "BRN987654321",
            "payment_term_type": "30_days",
            "payment_term_days": 30,
            "payment_term_label": "Net 30",
            "payment_term_notes": "Payment due within 30 days",
            "credit_limit": 5000000,
            "is_active": True
        }

        response = self.session.post(f"{BASE_URL}/api/admin/customers", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        self.created_customer_ids.append(data["id"])

        # Verify all fields
        assert data["company_name"] == payload["company_name"]
        assert data["contact_name"] == payload["contact_name"]
        assert data["email"] == payload["email"]
        assert data["payment_term_type"] == "30_days"
        assert data["payment_term_label"] == "Net 30"
        assert data["credit_limit"] == 5000000
        assert "id" in data
        assert "created_at" in data
        print(f"✓ Created customer with Net 30 payment terms: {data['id']}")

    def test_create_customer_duplicate_email_rejected(self):
        """Test that duplicate email is rejected"""
        timestamp = int(time.time())
        email = f"test_duplicate_{timestamp}@test.tz"
        
        # Create first customer
        payload = {
            "company_name": f"{TEST_PREFIX}First Company {timestamp}",
            "contact_name": f"{TEST_PREFIX}First Contact",
            "email": email,
            "payment_term_type": "due_on_receipt"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/customers", json=payload)
        assert response.status_code == 200
        self.created_customer_ids.append(response.json()["id"])

        # Try to create duplicate
        payload2 = {
            "company_name": f"{TEST_PREFIX}Second Company {timestamp}",
            "contact_name": f"{TEST_PREFIX}Second Contact",
            "email": email,
            "payment_term_type": "7_days"
        }
        
        response2 = self.session.post(f"{BASE_URL}/api/admin/customers", json=payload2)
        assert response2.status_code == 400
        assert "already exists" in response2.json().get("detail", "").lower()
        print("✓ Duplicate email correctly rejected")

    def test_list_customers(self):
        """Test listing customers with filters"""
        response = self.session.get(f"{BASE_URL}/api/admin/customers")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} customers")

    def test_list_customers_with_search(self):
        """Test customer search functionality"""
        timestamp = int(time.time())
        unique_name = f"{TEST_PREFIX}SearchableCompany{timestamp}"
        
        # Create a searchable customer
        payload = {
            "company_name": unique_name,
            "contact_name": f"{TEST_PREFIX}Search Contact",
            "email": f"test_search_{timestamp}@test.tz",
            "payment_term_type": "14_days"
        }
        response = self.session.post(f"{BASE_URL}/api/admin/customers", json=payload)
        assert response.status_code == 200
        self.created_customer_ids.append(response.json()["id"])

        # Search for the customer
        response = self.session.get(f"{BASE_URL}/api/admin/customers", params={"search": unique_name})
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        assert any(c["company_name"] == unique_name for c in data)
        print(f"✓ Search found customer: {unique_name}")

    def test_get_customer_by_id(self):
        """Test getting specific customer by ID"""
        timestamp = int(time.time())
        
        # Create customer first
        payload = {
            "company_name": f"{TEST_PREFIX}GetById Company {timestamp}",
            "contact_name": f"{TEST_PREFIX}Contact",
            "email": f"test_getbyid_{timestamp}@test.tz",
            "payment_term_type": "7_days",
            "payment_term_label": "Net 7"
        }
        create_response = self.session.post(f"{BASE_URL}/api/admin/customers", json=payload)
        assert create_response.status_code == 200
        customer_id = create_response.json()["id"]
        self.created_customer_ids.append(customer_id)

        # Get by ID
        get_response = self.session.get(f"{BASE_URL}/api/admin/customers/{customer_id}")
        assert get_response.status_code == 200

        data = get_response.json()
        assert data["id"] == customer_id
        assert data["payment_term_type"] == "7_days"
        assert data["payment_term_label"] == "Net 7"
        print(f"✓ Retrieved customer by ID: {customer_id}")

    def test_get_customer_by_email(self):
        """Test getting customer by email address"""
        timestamp = int(time.time())
        email = f"test_byemail_{timestamp}@test.tz"
        
        # Create customer
        payload = {
            "company_name": f"{TEST_PREFIX}ByEmail Company {timestamp}",
            "contact_name": f"{TEST_PREFIX}Contact",
            "email": email,
            "payment_term_type": "50_upfront_50_delivery",
            "payment_term_label": "50% Upfront / 50% on Delivery"
        }
        create_response = self.session.post(f"{BASE_URL}/api/admin/customers", json=payload)
        assert create_response.status_code == 200
        self.created_customer_ids.append(create_response.json()["id"])

        # Get by email
        get_response = self.session.get(f"{BASE_URL}/api/admin/customers/by-email/{email}")
        assert get_response.status_code == 200

        data = get_response.json()
        assert data["email"] == email
        assert data["payment_term_type"] == "50_upfront_50_delivery"
        print(f"✓ Retrieved customer by email: {email}")

    def test_get_customer_not_found(self):
        """Test 404 for non-existent customer"""
        response = self.session.get(f"{BASE_URL}/api/admin/customers/000000000000000000000000")
        assert response.status_code == 404
        print("✓ Non-existent customer returns 404")

    def test_get_customer_by_email_not_found(self):
        """Test 404 for non-existent email"""
        response = self.session.get(f"{BASE_URL}/api/admin/customers/by-email/nonexistent@nowhere.com")
        assert response.status_code == 404
        print("✓ Non-existent email returns 404")

    def test_update_customer_payment_terms(self):
        """Test updating customer payment terms"""
        timestamp = int(time.time())
        
        # Create customer
        payload = {
            "company_name": f"{TEST_PREFIX}Update Company {timestamp}",
            "contact_name": f"{TEST_PREFIX}Original Name",
            "email": f"test_update_{timestamp}@test.tz",
            "payment_term_type": "due_on_receipt",
            "payment_term_label": "Due on Receipt"
        }
        create_response = self.session.post(f"{BASE_URL}/api/admin/customers", json=payload)
        assert create_response.status_code == 200
        customer_id = create_response.json()["id"]
        self.created_customer_ids.append(customer_id)

        # Update payment terms
        update_payload = {
            "payment_term_type": "credit_account",
            "payment_term_label": "Credit Account",
            "credit_limit": 10000000,
            "payment_term_notes": "30-day credit terms approved"
        }
        update_response = self.session.patch(f"{BASE_URL}/api/admin/customers/{customer_id}", json=update_payload)
        assert update_response.status_code == 200

        updated = update_response.json()
        assert updated["payment_term_type"] == "credit_account"
        assert updated["credit_limit"] == 10000000
        assert updated["payment_term_notes"] == "30-day credit terms approved"

        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/admin/customers/{customer_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["payment_term_type"] == "credit_account"
        print(f"✓ Updated customer payment terms to credit_account")

    def test_delete_customer_soft_delete(self):
        """Test soft delete (deactivation) of customer"""
        timestamp = int(time.time())
        
        # Create customer
        payload = {
            "company_name": f"{TEST_PREFIX}Delete Company {timestamp}",
            "contact_name": f"{TEST_PREFIX}Contact",
            "email": f"test_delete_{timestamp}@test.tz",
            "payment_term_type": "due_on_receipt"
        }
        create_response = self.session.post(f"{BASE_URL}/api/admin/customers", json=payload)
        assert create_response.status_code == 200
        customer_id = create_response.json()["id"]
        self.created_customer_ids.append(customer_id)

        # Delete (soft delete)
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/customers/{customer_id}")
        assert delete_response.status_code == 200
        assert "deactivated" in delete_response.json().get("message", "").lower()

        # Verify customer is deactivated but still exists
        get_response = self.session.get(f"{BASE_URL}/api/admin/customers/{customer_id}")
        assert get_response.status_code == 200
        assert get_response.json()["is_active"] == False
        print(f"✓ Customer soft deleted (deactivated): {customer_id}")


class TestPaymentTermsFlow:
    """Tests for payment terms flowing from Customer -> Quote -> Invoice"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_customer_ids = []
        self.created_quote_ids = []
        self.created_invoice_ids = []

    def teardown_method(self, method):
        """Cleanup test data"""
        for customer_id in self.created_customer_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/customers/{customer_id}")
            except:
                pass

    def test_quote_inherits_customer_payment_terms(self):
        """Test that creating a quote auto-applies customer's payment terms"""
        timestamp = int(time.time())
        email = f"test_quote_terms_{timestamp}@test.tz"
        
        # Create customer with specific payment terms
        customer_payload = {
            "company_name": f"{TEST_PREFIX}Quote Terms Company {timestamp}",
            "contact_name": f"{TEST_PREFIX}Contact",
            "email": email,
            "payment_term_type": "14_days",
            "payment_term_label": "Net 14",
            "payment_term_notes": "Payment due within 14 days of invoice"
        }
        customer_response = self.session.post(f"{BASE_URL}/api/admin/customers", json=customer_payload)
        assert customer_response.status_code == 200
        self.created_customer_ids.append(customer_response.json()["id"])

        # Create quote for this customer (without specifying payment terms)
        quote_payload = {
            "customer_name": f"{TEST_PREFIX}Contact",
            "customer_email": email,
            "customer_company": f"{TEST_PREFIX}Quote Terms Company {timestamp}",
            "currency": "TZS",
            "line_items": [
                {"description": "Test Product", "quantity": 10, "unit_price": 50000, "total": 500000}
            ],
            "subtotal": 500000,
            "tax": 90000,
            "discount": 0,
            "total": 590000
        }
        quote_response = self.session.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_payload)
        assert quote_response.status_code == 200

        quote = quote_response.json()
        self.created_quote_ids.append(quote["id"])

        # Verify payment terms were inherited from customer
        assert quote["payment_term_type"] == "14_days"
        assert quote["payment_term_label"] == "Net 14"
        print(f"✓ Quote inherited customer payment terms: Net 14")

    def test_invoice_calculates_due_date_from_payment_terms(self):
        """Test that invoice auto-calculates due date based on payment terms"""
        timestamp = int(time.time())
        email = f"test_invoice_due_{timestamp}@test.tz"
        
        # Create customer with 30-day payment terms
        customer_payload = {
            "company_name": f"{TEST_PREFIX}Invoice Due Company {timestamp}",
            "contact_name": f"{TEST_PREFIX}Contact",
            "email": email,
            "payment_term_type": "30_days",
            "payment_term_label": "Net 30"
        }
        customer_response = self.session.post(f"{BASE_URL}/api/admin/customers", json=customer_payload)
        assert customer_response.status_code == 200
        self.created_customer_ids.append(customer_response.json()["id"])

        # Create invoice for this customer (without specifying due_date)
        invoice_payload = {
            "customer_name": f"{TEST_PREFIX}Contact",
            "customer_email": email,
            "customer_company": f"{TEST_PREFIX}Invoice Due Company {timestamp}",
            "currency": "TZS",
            "line_items": [
                {"description": "Test Service", "quantity": 1, "unit_price": 1000000, "total": 1000000}
            ],
            "subtotal": 1000000,
            "tax": 180000,
            "discount": 0,
            "total": 1180000
        }
        invoice_response = self.session.post(f"{BASE_URL}/api/admin/invoices-v2", json=invoice_payload)
        assert invoice_response.status_code == 200

        invoice = invoice_response.json()
        self.created_invoice_ids.append(invoice["id"])

        # Verify payment terms and due date
        assert invoice["payment_term_type"] == "30_days"
        assert invoice["payment_term_label"] == "Net 30"
        assert "due_date" in invoice
        assert invoice["due_date"] is not None

        # Verify due date is approximately 30 days from now
        created_at = datetime.fromisoformat(invoice["created_at"].replace("Z", "+00:00"))
        due_date = datetime.fromisoformat(invoice["due_date"].replace("Z", "+00:00"))
        days_diff = (due_date - created_at).days
        assert 29 <= days_diff <= 31, f"Expected ~30 days, got {days_diff}"
        print(f"✓ Invoice due date auto-calculated: {days_diff} days from issue")

    def test_invoice_due_on_receipt(self):
        """Test that due_on_receipt sets due date same as issue date"""
        timestamp = int(time.time())
        email = f"test_due_receipt_{timestamp}@test.tz"
        
        # Create customer with due_on_receipt terms
        customer_payload = {
            "company_name": f"{TEST_PREFIX}Due Receipt Company {timestamp}",
            "contact_name": f"{TEST_PREFIX}Contact",
            "email": email,
            "payment_term_type": "due_on_receipt",
            "payment_term_label": "Due on Receipt"
        }
        customer_response = self.session.post(f"{BASE_URL}/api/admin/customers", json=customer_payload)
        assert customer_response.status_code == 200
        self.created_customer_ids.append(customer_response.json()["id"])

        # Create invoice
        invoice_payload = {
            "customer_name": f"{TEST_PREFIX}Contact",
            "customer_email": email,
            "currency": "TZS",
            "line_items": [
                {"description": "Test Item", "quantity": 1, "unit_price": 100000, "total": 100000}
            ],
            "subtotal": 100000,
            "tax": 0,
            "discount": 0,
            "total": 100000
        }
        invoice_response = self.session.post(f"{BASE_URL}/api/admin/invoices-v2", json=invoice_payload)
        assert invoice_response.status_code == 200

        invoice = invoice_response.json()
        self.created_invoice_ids.append(invoice["id"])

        # Verify due date equals issue date for due_on_receipt
        assert invoice["payment_term_type"] == "due_on_receipt"
        if invoice.get("due_date"):
            created_at = datetime.fromisoformat(invoice["created_at"].replace("Z", "+00:00"))
            due_date = datetime.fromisoformat(invoice["due_date"].replace("Z", "+00:00"))
            days_diff = (due_date - created_at).days
            assert days_diff == 0, f"Expected 0 days for due_on_receipt, got {days_diff}"
        print(f"✓ Due on receipt: due date matches issue date")


class TestPaymentTermTypes:
    """Test all payment term types"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_customer_ids = []

    def teardown_method(self, method):
        for customer_id in self.created_customer_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/customers/{customer_id}")
            except:
                pass

    @pytest.mark.parametrize("term_type,label,expected_days", [
        ("due_on_receipt", "Due on Receipt", 0),
        ("7_days", "Net 7", 7),
        ("14_days", "Net 14", 14),
        ("30_days", "Net 30", 30),
    ])
    def test_payment_term_types(self, term_type, label, expected_days):
        """Test each payment term type creates correctly"""
        timestamp = int(time.time())
        payload = {
            "company_name": f"{TEST_PREFIX}{term_type} Company {timestamp}",
            "contact_name": f"{TEST_PREFIX}Contact",
            "email": f"test_{term_type}_{timestamp}@test.tz",
            "payment_term_type": term_type,
            "payment_term_label": label
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/customers", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        self.created_customer_ids.append(data["id"])
        
        assert data["payment_term_type"] == term_type
        assert data["payment_term_label"] == label
        print(f"✓ Created customer with {label} payment terms")


class TestExistingCustomerPaymentTerms:
    """Test payment terms for existing customer (john@acmecorp.tz with Net 30)"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def test_existing_customer_john_acmecorp(self):
        """Test existing customer john@acmecorp.tz has Net 30 terms"""
        response = self.session.get(f"{BASE_URL}/api/admin/customers/by-email/john@acmecorp.tz")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Found existing customer: {data.get('company_name', 'Unknown')}")
            print(f"  - Payment term type: {data.get('payment_term_type')}")
            print(f"  - Payment term label: {data.get('payment_term_label')}")
            
            # Verify it has Net 30 terms as mentioned in context
            assert data.get("payment_term_type") == "30_days", f"Expected 30_days, got {data.get('payment_term_type')}"
            assert "30" in data.get("payment_term_label", ""), f"Expected Net 30 label"
        else:
            pytest.skip("Test customer john@acmecorp.tz not found - may not have been seeded")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
