"""
Test Deal Linkage Pack & Commercial Relationship Pack APIs
- CRM Deal Routes: forecast, leaderboard, marketing ROI, lead detail
- Customer Account Routes: 360-degree customer view
- CRM Relationship Routes: create quote/invoice/task from lead, convert to won
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminAuth:
    """Admin authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_admin_login(self):
        """Test admin login returns token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"


class TestCRMDealRoutes:
    """CRM Deal Routes: forecast, leaderboard, marketing ROI"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
        )
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_sales_forecast(self, auth_headers):
        """Test GET /api/admin/crm-deals/forecast"""
        response = requests.get(
            f"{BASE_URL}/api/admin/crm-deals/forecast",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "pipeline_value" in data
        assert "weighted_forecast" in data
        assert "lead_count" in data
        assert "stage_weights" in data
        
        # Validate stage weights
        assert isinstance(data["stage_weights"], dict)
        assert "qualified" in data["stage_weights"]
        assert "won" in data["stage_weights"]
        print(f"Sales forecast: Pipeline={data['pipeline_value']}, Weighted={data['weighted_forecast']}, Leads={data['lead_count']}")
    
    def test_staff_leaderboard(self, auth_headers):
        """Test GET /api/admin/crm-deals/leaderboard"""
        response = requests.get(
            f"{BASE_URL}/api/admin/crm-deals/leaderboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure (list of staff)
        assert isinstance(data, list)
        
        if len(data) > 0:
            # Validate each entry has expected fields
            entry = data[0]
            assert "assigned_to" in entry
            assert "lead_count" in entry
            assert "won_count" in entry
            assert "conversion_rate" in entry
            assert "pipeline_value" in entry
            print(f"Leaderboard has {len(data)} entries. Top: {entry.get('assigned_to')}")
        else:
            print("Leaderboard is empty (no leads with assignments)")
    
    def test_marketing_roi(self, auth_headers):
        """Test GET /api/admin/crm-deals/marketing-roi"""
        response = requests.get(
            f"{BASE_URL}/api/admin/crm-deals/marketing-roi",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure (list of sources)
        assert isinstance(data, list)
        
        if len(data) > 0:
            entry = data[0]
            assert "source" in entry
            assert "lead_count" in entry
            assert "won_count" in entry
            assert "pipeline_value" in entry
            assert "closed_revenue" in entry
            print(f"Marketing ROI has {len(data)} sources. Top: {entry.get('source')}")
        else:
            print("Marketing ROI is empty (no leads with sources)")


class TestCustomerAccountRoutes:
    """Customer Account Routes: 360-degree view"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
        )
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_customer_account_view(self, auth_headers):
        """Test GET /api/admin/customer-accounts/{email}"""
        # Test with admin email as customer
        test_email = "admin@konekt.co.tz"
        response = requests.get(
            f"{BASE_URL}/api/admin/customer-accounts/{test_email}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate profile section
        assert "profile" in data
        assert "email" in data["profile"]
        
        # Validate summary section
        assert "summary" in data
        summary = data["summary"]
        assert "quotes_count" in summary
        assert "invoices_count" in summary
        assert "orders_count" in summary
        assert "payments_count" in summary
        assert "service_requests_count" in summary
        assert "leads_count" in summary
        assert "invoice_total" in summary
        assert "invoice_paid" in summary
        assert "invoice_balance" in summary
        
        # Validate document lists
        assert "quotes" in data
        assert "invoices" in data
        assert "orders" in data
        assert "payments" in data
        assert "service_requests" in data
        assert "leads" in data
        
        assert isinstance(data["quotes"], list)
        assert isinstance(data["invoices"], list)
        print(f"Customer account for {test_email}: {summary['quotes_count']} quotes, {summary['invoices_count']} invoices")
    
    def test_customer_account_nonexistent_email(self, auth_headers):
        """Test customer account view with email that has no data"""
        test_email = "nonexistent_test_user@example.com"
        response = requests.get(
            f"{BASE_URL}/api/admin/customer-accounts/{test_email}",
            headers=auth_headers
        )
        # Should return 200 with empty data, not 404
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["quotes_count"] == 0
        assert data["summary"]["invoices_count"] == 0


class TestCRMRelationshipRoutes:
    """CRM Relationship Routes: create documents from leads"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
        )
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_lead_id(self, auth_headers):
        """Create a test lead and return its ID"""
        # First try to get existing leads
        response = requests.get(
            f"{BASE_URL}/api/admin/crm/leads",
            headers=auth_headers
        )
        if response.status_code == 200:
            leads = response.json()
            if isinstance(leads, list) and len(leads) > 0:
                return leads[0].get("id")
            elif isinstance(leads, dict) and leads.get("data"):
                return leads["data"][0].get("id")
        
        # Create a new test lead
        lead_data = {
            "company_name": "TEST_DealLinkage Corp",
            "contact_name": "Test Contact",
            "email": "TEST_dealtest@example.com",
            "phone": "+255712345678",
            "source": "website",
            "industry": "Technology",
            "status": "new",
            "estimated_value": 50000
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/crm/leads",
            headers=auth_headers,
            json=lead_data
        )
        if response.status_code == 201:
            return response.json().get("id")
        return None
    
    def test_get_lead_detail(self, auth_headers, test_lead_id):
        """Test GET /api/admin/crm-deals/leads/{id}"""
        if not test_lead_id:
            pytest.skip("No test lead available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/crm-deals/leads/{test_lead_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate lead detail response
        assert "lead" in data
        assert "related" in data
        
        # Validate related documents
        related = data["related"]
        assert "quotes" in related
        assert "invoices" in related
        assert "orders" in related
        assert "payments" in related
        assert "tasks" in related
        
        assert isinstance(related["quotes"], list)
        print(f"Lead detail loaded with {len(related['quotes'])} quotes, {len(related['invoices'])} invoices")
    
    def test_create_quote_from_lead(self, auth_headers, test_lead_id):
        """Test POST /api/admin/crm-relationships/leads/{id}/create-quote"""
        if not test_lead_id:
            pytest.skip("No test lead available")
        
        quote_data = {
            "line_items": [
                {"description": "Test Item", "quantity": 10, "unit_price": 1000, "total": 10000}
            ],
            "subtotal": 10000,
            "tax": 1800,
            "discount": 0,
            "total": 11800,
            "currency": "TZS",
            "actor_email": "admin@konekt.co.tz"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-relationships/leads/{test_lead_id}/create-quote",
            headers=auth_headers,
            json=quote_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate quote was created
        assert "id" in data
        assert "quote_number" in data
        assert data["lead_id"] == test_lead_id
        assert data["total"] == 11800
        assert data["status"] == "draft"
        print(f"Created quote {data['quote_number']} from lead")
    
    def test_create_invoice_from_lead(self, auth_headers, test_lead_id):
        """Test POST /api/admin/crm-relationships/leads/{id}/create-invoice"""
        if not test_lead_id:
            pytest.skip("No test lead available")
        
        invoice_data = {
            "line_items": [
                {"description": "Service Fee", "quantity": 1, "unit_price": 50000, "total": 50000}
            ],
            "subtotal": 50000,
            "tax": 9000,
            "discount": 0,
            "total": 59000,
            "currency": "TZS",
            "actor_email": "admin@konekt.co.tz"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-relationships/leads/{test_lead_id}/create-invoice",
            headers=auth_headers,
            json=invoice_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate invoice was created
        assert "id" in data
        assert "invoice_number" in data
        assert data["lead_id"] == test_lead_id
        assert data["total"] == 59000
        assert data["status"] == "sent"
        print(f"Created invoice {data['invoice_number']} from lead")
    
    def test_create_task_from_lead(self, auth_headers, test_lead_id):
        """Test POST /api/admin/crm-relationships/leads/{id}/create-task"""
        if not test_lead_id:
            pytest.skip("No test lead available")
        
        task_data = {
            "title": "TEST_Follow up on deal",
            "description": "Automated test task",
            "assigned_to": "admin@konekt.co.tz",
            "status": "todo",
            "priority": "high",
            "actor_email": "admin@konekt.co.tz"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-relationships/leads/{test_lead_id}/create-task",
            headers=auth_headers,
            json=task_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate task was created
        assert "id" in data
        assert "title" in data
        assert data["lead_id"] == test_lead_id
        assert data["status"] == "todo"
        print(f"Created task '{data['title']}' from lead")
    
    def test_convert_lead_to_won(self, auth_headers, test_lead_id):
        """Test POST /api/admin/crm-relationships/leads/{id}/convert-to-won"""
        if not test_lead_id:
            pytest.skip("No test lead available")
        
        won_data = {
            "win_reason": "Competitive pricing",
            "note": "Customer accepted proposal after demo",
            "actor_email": "admin@konekt.co.tz"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-relationships/leads/{test_lead_id}/convert-to-won",
            headers=auth_headers,
            json=won_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate lead was updated
        assert "id" in data
        assert data["stage"] == "won"
        assert data["win_reason"] == "Competitive pricing"
        print(f"Lead converted to won with reason: {data['win_reason']}")


class TestLeadDetailNotFound:
    """Test error handling for lead detail"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
        )
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_lead_detail_not_found(self, auth_headers):
        """Test lead detail with invalid ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/admin/crm-deals/leads/000000000000000000000000",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("Lead not found returns 404 as expected")
    
    def test_create_quote_lead_not_found(self, auth_headers):
        """Test create quote from nonexistent lead"""
        response = requests.post(
            f"{BASE_URL}/api/admin/crm-relationships/leads/000000000000000000000000/create-quote",
            headers=auth_headers,
            json={"line_items": [], "total": 0}
        )
        assert response.status_code == 404


class TestCRMListPage:
    """Test CRM leads list endpoint used by CRMPageV2"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
        )
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_leads_list(self, auth_headers):
        """Test GET /api/admin/crm/leads"""
        response = requests.get(
            f"{BASE_URL}/api/admin/crm/leads",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Can be list or dict with data
        if isinstance(data, list):
            print(f"Leads list has {len(data)} items")
        elif isinstance(data, dict):
            print(f"Leads response: {list(data.keys())}")


class TestCustomersEndpoint:
    """Test customers endpoint used by CustomerAccountsPage"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
        )
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_customers_list(self, auth_headers):
        """Test GET /api/admin/customers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers?limit=200",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # API returns list directly or dict with customers key
        if isinstance(data, list):
            print(f"Customers list has {len(data)} items")
        else:
            assert "customers" in data
            print(f"Customers list has {len(data.get('customers', []))} items")
    
    def test_get_users_customers(self, auth_headers):
        """Test GET /api/admin/users?role=customer"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users?role=customer&limit=200",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        print(f"Users (customer role) has {len(data.get('users', []))} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
