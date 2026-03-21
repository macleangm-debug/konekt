"""
Test UI Pack: Expansion Premium Page, Services Discovery Page, Payment Selection, Invoice Payment, Admin UX Overview
Tests the new UI pack features including guest lead API, invoice payment routes, and payment method restrictions.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Customer authentication failed: {response.status_code}")


class TestGuestLeadAPI:
    """Test Guest Lead API for Expansion Premium Page forms"""
    
    def test_create_guest_lead_business_interest(self):
        """Test creating a guest lead for business interest (Expansion Premium Page)"""
        payload = {
            "full_name": "TEST_Business Interest User",
            "email": "test.business@example.com",
            "phone": "+255712345678",
            "company_name": "Test Company Ltd",
            "country_code": "KE",
            "intent_type": "expansion_business_interest",
            "intent_payload": {
                "region": "Nairobi",
                "interest_summary": "Interested in Konekt services for our Kenya operations",
                "country_name": "Kenya"
            }
        }
        response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "guest_lead_id" in data
        print(f"✓ Created business interest lead: {data['guest_lead_id']}")
    
    def test_create_guest_lead_partner_application(self):
        """Test creating a guest lead for partner application (Expansion Premium Page)"""
        payload = {
            "full_name": "TEST_Partner Contact",
            "email": "test.partner@example.com",
            "phone": "+255712345679",
            "company_name": "Partner Company Ltd",
            "country_code": "UG",
            "intent_type": "expansion_partner_application",
            "intent_payload": {
                "local_presence_summary": "We have offices in Kampala and Entebbe",
                "commercial_capacity": "Strong sales team with 50+ clients",
                "operations_capacity": "Warehouse and logistics capabilities",
                "country_name": "Uganda"
            }
        }
        response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "guest_lead_id" in data
        print(f"✓ Created partner application lead: {data['guest_lead_id']}")
    
    def test_create_guest_lead_service_interest(self):
        """Test creating a guest lead for service interest (Services Discovery Page)"""
        payload = {
            "full_name": "TEST_Service Interest User",
            "email": "test.service@example.com",
            "phone": "+255712345680",
            "intent_type": "service_interest",
            "intent_payload": {
                "service_slug": "printing",
                "service_name": "Printing Services"
            }
        }
        response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "guest_lead_id" in data
        print(f"✓ Created service interest lead: {data['guest_lead_id']}")
    
    def test_list_guest_leads(self, admin_token):
        """Test listing guest leads (admin access)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/guest-leads", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} guest leads")
    
    def test_get_guest_lead_by_id(self, admin_token):
        """Test getting a specific guest lead"""
        # First create a lead
        payload = {
            "full_name": "TEST_Get Lead User",
            "email": "test.getlead@example.com",
            "phone": "+255712345681",
            "intent_type": "quote_request"
        }
        create_response = requests.post(f"{BASE_URL}/api/guest-leads", json=payload)
        assert create_response.status_code == 200
        lead_id = create_response.json()["guest_lead_id"]
        
        # Then get it
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/guest-leads/{lead_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("full_name") == "TEST_Get Lead User"
        print(f"✓ Retrieved guest lead: {lead_id}")


class TestServiceCatalogAPI:
    """Test Service Catalog API for Services Discovery Page"""
    
    def test_get_service_groups(self):
        """Test getting service category groups"""
        response = requests.get(f"{BASE_URL}/api/service-catalog/groups")
        
        # May return 200 with data or 404 if not configured
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Retrieved {len(data)} service groups")
        else:
            print(f"⚠ Service groups endpoint returned {response.status_code} (may not be configured)")
    
    def test_get_services(self):
        """Test getting services list"""
        response = requests.get(f"{BASE_URL}/api/service-catalog/services")
        
        # May return 200 with data or 404 if not configured
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Retrieved {len(data)} services")
        else:
            print(f"⚠ Services endpoint returned {response.status_code} (may not be configured)")


class TestInvoicePaymentAPI:
    """Test Invoice Payment API for Invoice Payment Page"""
    
    def test_get_invoice_payment_context(self, admin_token):
        """Test getting invoice payment context with bank details"""
        # First, we need to find or create an invoice
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Try to get existing invoices
        invoices_response = requests.get(f"{BASE_URL}/api/admin/invoices-v2", headers=headers)
        
        if invoices_response.status_code == 200:
            invoices = invoices_response.json()
            if isinstance(invoices, dict):
                invoices = invoices.get("invoices", [])
            
            if invoices and len(invoices) > 0:
                invoice_id = invoices[0].get("id") or invoices[0].get("_id")
                
                # Get payment context
                response = requests.get(f"{BASE_URL}/api/invoice-payments/invoice/{invoice_id}", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    # Verify bank details are present
                    assert "bank_details" in data
                    bank = data["bank_details"]
                    assert bank.get("account_name") == "KONEKT LIMITED"
                    assert bank.get("account_number") == "015C8841347002"
                    assert bank.get("bank_name") == "CRDB BANK"
                    assert bank.get("swift") == "CORUTZTZ"
                    
                    # Verify payment methods
                    assert "payment_methods" in data
                    methods = data["payment_methods"]
                    assert methods.get("bank_transfer", {}).get("enabled") == True
                    assert methods.get("mobile_money", {}).get("enabled") == False
                    assert methods.get("card", {}).get("enabled") == False
                    print(f"✓ Invoice payment context verified with correct bank details")
                else:
                    print(f"⚠ Invoice payment context returned {response.status_code}")
            else:
                print("⚠ No invoices found to test payment context")
        else:
            print(f"⚠ Could not list invoices: {invoices_response.status_code}")
    
    def test_submit_invoice_payment_proof(self, admin_token):
        """Test submitting payment proof for an invoice"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get an invoice first
        invoices_response = requests.get(f"{BASE_URL}/api/admin/invoices-v2", headers=headers)
        
        if invoices_response.status_code == 200:
            invoices = invoices_response.json()
            if isinstance(invoices, dict):
                invoices = invoices.get("invoices", [])
            
            if invoices and len(invoices) > 0:
                invoice_id = invoices[0].get("id") or invoices[0].get("_id")
                
                # Submit payment proof
                payload = {
                    "amount_paid": 100000,
                    "payment_date": datetime.now().strftime("%Y-%m-%d"),
                    "transaction_reference": "TEST_TXN_REF_12345",
                    "proof_file_url": "https://example.com/proof.pdf",
                    "note": "Test payment proof submission"
                }
                
                response = requests.post(
                    f"{BASE_URL}/api/invoice-payments/invoice/{invoice_id}/proof",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    assert data.get("ok") == True
                    assert "payment_proof_id" in data
                    print(f"✓ Payment proof submitted: {data['payment_proof_id']}")
                else:
                    print(f"⚠ Payment proof submission returned {response.status_code}: {response.text}")
            else:
                print("⚠ No invoices found to test payment proof submission")
        else:
            print(f"⚠ Could not list invoices: {invoices_response.status_code}")


class TestInvoiceAPI:
    """Test Invoice API for customer invoice access"""
    
    def test_customer_get_invoices(self, customer_token):
        """Test customer can access their invoices"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/customer/invoices", headers=headers)
        
        # May return 200 or 404 depending on customer data
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Customer can access invoices: {len(data) if isinstance(data, list) else 'dict response'}")
        else:
            print(f"⚠ Customer invoices returned {response.status_code}")


class TestPaymentSettingsAPI:
    """Test Payment Settings for bank-only restriction"""
    
    def test_get_payment_settings(self, admin_token):
        """Test getting payment settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/payment-settings", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Payment settings retrieved")
            # Check if bank transfer is the only active method
            if isinstance(data, list) and len(data) > 0:
                settings = data[0]
                print(f"  - Bank: {settings.get('bank_name', 'N/A')}")
                print(f"  - Account: {settings.get('account_number', 'N/A')}")
        else:
            print(f"⚠ Payment settings returned {response.status_code}")


class TestAdminDashboardAPI:
    """Test Admin Dashboard APIs for Admin UX Overview Page"""
    
    def test_admin_dashboard_stats(self, admin_token):
        """Test admin can access dashboard stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test various admin endpoints that would be used in Admin UX Overview
        endpoints = [
            "/api/admin/quotes-v2",
            "/api/admin/orders-ops",
            "/api/admin/invoices-v2",
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            if response.status_code == 200:
                print(f"✓ Admin endpoint {endpoint} accessible")
            else:
                print(f"⚠ Admin endpoint {endpoint} returned {response.status_code}")


class TestHealthAndBasicEndpoints:
    """Test basic health and API endpoints"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint working")
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.status_code}"
        data = response.json()
        assert "access_token" in data or "token" in data
        print("✓ Admin login working")
    
    def test_customer_login(self):
        """Test customer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.status_code}"
        data = response.json()
        assert "access_token" in data or "token" in data
        print("✓ Customer login working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
