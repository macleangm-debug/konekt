"""
Test Contract Clients + Billing Discipline Pack and Admin Performance & Insights Pack APIs

Covers:
- Contract Client CRUD: /api/admin/contract-clients
- Negotiated Pricing CRUD: /api/admin/negotiated-pricing
- Contract SLAs CRUD: /api/admin/contract-slas
- Recurring Invoice Plans: /api/admin/recurring-invoices/plans
- Partner Performance: /api/admin/partner-performance
- Product Insights: /api/admin/product-insights
- Service Insights: /api/admin/service-insights
- Staff Performance: /api/admin/staff-performance
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="session")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="session")
def admin_headers(auth_token):
    """Admin headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="session")
def test_customer_id(admin_headers):
    """Get or create a test customer ID"""
    response = requests.get(f"{BASE_URL}/api/admin/customers?limit=1", headers=admin_headers)
    if response.status_code == 200:
        customers = response.json()
        if isinstance(customers, list) and len(customers) > 0:
            return customers[0].get("id")
        if isinstance(customers, dict) and customers.get("customers"):
            return customers["customers"][0].get("id")
    pytest.skip("No customer found for testing")


# ============= Contract Clients Tests =============
class TestContractClients:
    """Contract Client CRUD tests"""
    
    created_ids = []
    
    def test_list_contract_clients_returns_200(self, admin_headers):
        """GET /api/admin/contract-clients - List all contract clients"""
        response = requests.get(f"{BASE_URL}/api/admin/contract-clients", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert isinstance(response.json(), list)
        print(f"Listed {len(response.json())} contract clients")
    
    def test_create_contract_client(self, admin_headers, test_customer_id):
        """POST /api/admin/contract-clients - Create new contract client"""
        payload = {
            "customer_id": test_customer_id,
            "company_name": "TEST_Contract Company",
            "tier": "premium",
            "account_manager_email": "test-manager@konekt.co.tz",
            "account_manager_name": "Test Manager",
            "payment_terms_days": 45,
            "credit_limit": 5000000,
            "currency": "TZS",
            "notes": "Test contract client"
        }
        response = requests.post(f"{BASE_URL}/api/admin/contract-clients", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["tier"] == "premium"
        assert data["payment_terms_days"] == 45
        
        TestContractClients.created_ids.append(data["id"])
        print(f"Created contract client: {data['id']}")
    
    def test_get_contract_client(self, admin_headers):
        """GET /api/admin/contract-clients/{id} - Get specific contract client"""
        if not TestContractClients.created_ids:
            pytest.skip("No contract client created")
        
        client_id = TestContractClients.created_ids[0]
        response = requests.get(f"{BASE_URL}/api/admin/contract-clients/{client_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == client_id
        print(f"Fetched contract client: {data['company_name']}")
    
    def test_update_contract_client(self, admin_headers):
        """PUT /api/admin/contract-clients/{id} - Update contract client"""
        if not TestContractClients.created_ids:
            pytest.skip("No contract client created")
        
        client_id = TestContractClients.created_ids[0]
        payload = {
            "tier": "strategic",
            "credit_limit": 10000000,
            "notes": "Updated test contract client"
        }
        response = requests.put(f"{BASE_URL}/api/admin/contract-clients/{client_id}", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["tier"] == "strategic"
        assert data["credit_limit"] == 10000000
        print(f"Updated contract client: {client_id}")
    
    def test_list_contract_clients_with_filter(self, admin_headers):
        """GET /api/admin/contract-clients?tier=strategic - Filter by tier"""
        response = requests.get(f"{BASE_URL}/api/admin/contract-clients?tier=strategic", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Filtered contract clients by tier: {len(response.json())} results")
    
    def test_delete_contract_client(self, admin_headers):
        """DELETE /api/admin/contract-clients/{id} - Delete contract client"""
        if not TestContractClients.created_ids:
            pytest.skip("No contract client created")
        
        client_id = TestContractClients.created_ids.pop()
        response = requests.delete(f"{BASE_URL}/api/admin/contract-clients/{client_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("deleted") == True
        print(f"Deleted contract client: {client_id}")


# ============= Negotiated Pricing Tests =============
class TestNegotiatedPricing:
    """Negotiated Pricing CRUD tests"""
    
    created_ids = []
    
    def test_list_negotiated_pricing_returns_200(self, admin_headers):
        """GET /api/admin/negotiated-pricing - List all pricing rules"""
        response = requests.get(f"{BASE_URL}/api/admin/negotiated-pricing", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert isinstance(response.json(), list)
        print(f"Listed {len(response.json())} negotiated pricing rules")
    
    def test_create_negotiated_pricing(self, admin_headers, test_customer_id):
        """POST /api/admin/negotiated-pricing - Create pricing rule"""
        payload = {
            "customer_id": test_customer_id,
            "pricing_scope": "sku",
            "sku": "TEST-SKU-001",
            "price_type": "discount_percent",
            "price_value": 15,
            "currency": "TZS",
            "min_quantity": 10,
            "notes": "Test negotiated price"
        }
        response = requests.post(f"{BASE_URL}/api/admin/negotiated-pricing", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["pricing_scope"] == "sku"
        assert data["price_value"] == 15
        
        TestNegotiatedPricing.created_ids.append(data["id"])
        print(f"Created negotiated pricing: {data['id']}")
    
    def test_get_negotiated_pricing(self, admin_headers):
        """GET /api/admin/negotiated-pricing/{id} - Get specific pricing rule"""
        if not TestNegotiatedPricing.created_ids:
            pytest.skip("No pricing rule created")
        
        pricing_id = TestNegotiatedPricing.created_ids[0]
        response = requests.get(f"{BASE_URL}/api/admin/negotiated-pricing/{pricing_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == pricing_id
        print(f"Fetched negotiated pricing: {data['id']}")
    
    def test_update_negotiated_pricing(self, admin_headers):
        """PUT /api/admin/negotiated-pricing/{id} - Update pricing rule"""
        if not TestNegotiatedPricing.created_ids:
            pytest.skip("No pricing rule created")
        
        pricing_id = TestNegotiatedPricing.created_ids[0]
        payload = {
            "price_value": 20,
            "min_quantity": 5,
            "notes": "Updated test negotiated price"
        }
        response = requests.put(f"{BASE_URL}/api/admin/negotiated-pricing/{pricing_id}", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["price_value"] == 20
        print(f"Updated negotiated pricing: {pricing_id}")
    
    def test_delete_negotiated_pricing(self, admin_headers):
        """DELETE /api/admin/negotiated-pricing/{id} - Delete pricing rule"""
        if not TestNegotiatedPricing.created_ids:
            pytest.skip("No pricing rule created")
        
        pricing_id = TestNegotiatedPricing.created_ids.pop()
        response = requests.delete(f"{BASE_URL}/api/admin/negotiated-pricing/{pricing_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("deleted") == True
        print(f"Deleted negotiated pricing: {pricing_id}")


# ============= Contract SLAs Tests =============
class TestContractSLAs:
    """Contract SLA CRUD tests"""
    
    created_ids = []
    
    def test_list_contract_slas_returns_200(self, admin_headers):
        """GET /api/admin/contract-slas - List all SLA settings"""
        response = requests.get(f"{BASE_URL}/api/admin/contract-slas", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert isinstance(response.json(), list)
        print(f"Listed {len(response.json())} contract SLAs")
    
    def test_create_contract_sla(self, admin_headers, test_customer_id):
        """POST /api/admin/contract-slas - Create SLA setting"""
        payload = {
            "customer_id": test_customer_id,
            "service_key": "printing",
            "response_time_hours": 12,
            "quote_turnaround_hours": 24,
            "delivery_target_days": 5,
            "priority_level": "premium",
            "escalation_email": "escalation@test.com",
            "auto_escalate": True,
            "notes": "Test SLA"
        }
        response = requests.post(f"{BASE_URL}/api/admin/contract-slas", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["priority_level"] == "premium"
        assert data["response_time_hours"] == 12
        
        TestContractSLAs.created_ids.append(data["id"])
        print(f"Created contract SLA: {data['id']}")
    
    def test_get_contract_sla(self, admin_headers):
        """GET /api/admin/contract-slas/{id} - Get specific SLA"""
        if not TestContractSLAs.created_ids:
            pytest.skip("No SLA created")
        
        sla_id = TestContractSLAs.created_ids[0]
        response = requests.get(f"{BASE_URL}/api/admin/contract-slas/{sla_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == sla_id
        print(f"Fetched contract SLA: {data['id']}")
    
    def test_update_contract_sla(self, admin_headers):
        """PUT /api/admin/contract-slas/{id} - Update SLA"""
        if not TestContractSLAs.created_ids:
            pytest.skip("No SLA created")
        
        sla_id = TestContractSLAs.created_ids[0]
        payload = {
            "response_time_hours": 8,
            "priority_level": "strategic",
            "notes": "Updated test SLA"
        }
        response = requests.put(f"{BASE_URL}/api/admin/contract-slas/{sla_id}", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["response_time_hours"] == 8
        assert data["priority_level"] == "strategic"
        print(f"Updated contract SLA: {sla_id}")
    
    def test_get_slas_for_customer(self, admin_headers, test_customer_id):
        """GET /api/admin/contract-slas/for-customer/{customer_id} - Get customer SLAs"""
        response = requests.get(f"{BASE_URL}/api/admin/contract-slas/for-customer/{test_customer_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Fetched {len(response.json())} SLAs for customer")
    
    def test_delete_contract_sla(self, admin_headers):
        """DELETE /api/admin/contract-slas/{id} - Delete SLA"""
        if not TestContractSLAs.created_ids:
            pytest.skip("No SLA created")
        
        sla_id = TestContractSLAs.created_ids.pop()
        response = requests.delete(f"{BASE_URL}/api/admin/contract-slas/{sla_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("deleted") == True
        print(f"Deleted contract SLA: {sla_id}")


# ============= Recurring Invoice Plans Tests =============
class TestRecurringInvoicePlans:
    """Recurring Invoice Plans CRUD and actions tests"""
    
    created_ids = []
    
    def test_list_recurring_plans_returns_200(self, admin_headers):
        """GET /api/admin/recurring-invoices/plans - List all plans"""
        response = requests.get(f"{BASE_URL}/api/admin/recurring-invoices/plans", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert isinstance(response.json(), list)
        print(f"Listed {len(response.json())} recurring invoice plans")
    
    def test_create_recurring_plan(self, admin_headers, test_customer_id):
        """POST /api/admin/recurring-invoices/plans - Create recurring plan"""
        payload = {
            "customer_id": test_customer_id,
            "plan_name": "TEST Monthly Retainer",
            "frequency": "monthly",
            "invoice_items": [
                {"description": "Monthly Service Fee", "amount": 500000, "quantity": 1},
                {"description": "Support Hours", "amount": 50000, "quantity": 10}
            ],
            "currency": "TZS",
            "payment_terms_days": 30,
            "auto_send": True,
            "notes": "Test recurring plan"
        }
        response = requests.post(f"{BASE_URL}/api/admin/recurring-invoices/plans", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["plan_name"] == "TEST Monthly Retainer"
        assert data["frequency"] == "monthly"
        assert data["status"] == "active"
        
        TestRecurringInvoicePlans.created_ids.append(data["id"])
        print(f"Created recurring plan: {data['id']}")
    
    def test_get_recurring_plan(self, admin_headers):
        """GET /api/admin/recurring-invoices/plans/{id} - Get specific plan"""
        if not TestRecurringInvoicePlans.created_ids:
            pytest.skip("No plan created")
        
        plan_id = TestRecurringInvoicePlans.created_ids[0]
        response = requests.get(f"{BASE_URL}/api/admin/recurring-invoices/plans/{plan_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == plan_id
        print(f"Fetched recurring plan: {data['plan_name']}")
    
    def test_update_recurring_plan(self, admin_headers):
        """PUT /api/admin/recurring-invoices/plans/{id} - Update plan"""
        if not TestRecurringInvoicePlans.created_ids:
            pytest.skip("No plan created")
        
        plan_id = TestRecurringInvoicePlans.created_ids[0]
        payload = {
            "plan_name": "TEST Updated Monthly Plan",
            "payment_terms_days": 45,
            "notes": "Updated test plan"
        }
        response = requests.put(f"{BASE_URL}/api/admin/recurring-invoices/plans/{plan_id}", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["plan_name"] == "TEST Updated Monthly Plan"
        assert data["payment_terms_days"] == 45
        print(f"Updated recurring plan: {plan_id}")
    
    def test_pause_recurring_plan(self, admin_headers):
        """POST /api/admin/recurring-invoices/plans/{id}/pause - Pause plan"""
        if not TestRecurringInvoicePlans.created_ids:
            pytest.skip("No plan created")
        
        plan_id = TestRecurringInvoicePlans.created_ids[0]
        response = requests.post(f"{BASE_URL}/api/admin/recurring-invoices/plans/{plan_id}/pause", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "paused"
        print(f"Paused recurring plan: {plan_id}")
    
    def test_resume_recurring_plan(self, admin_headers):
        """POST /api/admin/recurring-invoices/plans/{id}/resume - Resume plan"""
        if not TestRecurringInvoicePlans.created_ids:
            pytest.skip("No plan created")
        
        plan_id = TestRecurringInvoicePlans.created_ids[0]
        response = requests.post(f"{BASE_URL}/api/admin/recurring-invoices/plans/{plan_id}/resume", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "active"
        print(f"Resumed recurring plan: {plan_id}")
    
    def test_generate_invoice_now(self, admin_headers):
        """POST /api/admin/recurring-invoices/plans/{id}/generate-now - Manual invoice generation"""
        if not TestRecurringInvoicePlans.created_ids:
            pytest.skip("No plan created")
        
        plan_id = TestRecurringInvoicePlans.created_ids[0]
        response = requests.post(f"{BASE_URL}/api/admin/recurring-invoices/plans/{plan_id}/generate-now", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "invoice_number" in data
        assert "total" in data
        print(f"Generated invoice: {data['invoice_number']} - Total: {data['total']}")
    
    def test_list_recurring_plans_with_filter(self, admin_headers):
        """GET /api/admin/recurring-invoices/plans?status=active - Filter by status"""
        response = requests.get(f"{BASE_URL}/api/admin/recurring-invoices/plans?status=active", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Filtered recurring plans by status: {len(response.json())} results")
    
    def test_delete_recurring_plan(self, admin_headers):
        """DELETE /api/admin/recurring-invoices/plans/{id} - Delete plan"""
        if not TestRecurringInvoicePlans.created_ids:
            pytest.skip("No plan created")
        
        plan_id = TestRecurringInvoicePlans.created_ids.pop()
        response = requests.delete(f"{BASE_URL}/api/admin/recurring-invoices/plans/{plan_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("deleted") == True
        print(f"Deleted recurring plan: {plan_id}")


# ============= Partner Performance Tests =============
class TestPartnerPerformance:
    """Partner Performance analytics tests"""
    
    def test_partner_performance_summary(self, admin_headers):
        """GET /api/admin/partner-performance/summary - Performance summary"""
        response = requests.get(f"{BASE_URL}/api/admin/partner-performance/summary", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Partner performance summary: {len(data)} partners")
        
        # Verify structure if data exists
        if data:
            partner = data[0]
            assert "partner_id" in partner
            assert "partner_name" in partner
            assert "completion_rate" in partner
            print(f"First partner: {partner['partner_name']} - {partner['completion_rate']}% completion")
    
    def test_partner_queue_load(self, admin_headers):
        """GET /api/admin/partner-performance/queue-load - Queue load"""
        response = requests.get(f"{BASE_URL}/api/admin/partner-performance/queue-load", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Partner queue load: {len(data)} active partners")
        
        if data:
            partner = data[0]
            assert "partner_name" in partner
            assert "total_queue" in partner
            assert "utilization_percent" in partner
    
    def test_partner_performance_by_service(self, admin_headers):
        """GET /api/admin/partner-performance/by-service - Performance by service"""
        response = requests.get(f"{BASE_URL}/api/admin/partner-performance/by-service", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Partner performance by service: {len(data)} records")
    
    def test_partner_performance_by_service_filtered(self, admin_headers):
        """GET /api/admin/partner-performance/by-service?service_key=printing - Filter by service"""
        response = requests.get(f"{BASE_URL}/api/admin/partner-performance/by-service?service_key=printing", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Partner performance for printing: {len(response.json())} records")


# ============= Product Insights Tests =============
class TestProductInsights:
    """Product Insights analytics tests"""
    
    def test_fast_moving_products(self, admin_headers):
        """GET /api/admin/product-insights/fast-moving - Fast moving products"""
        response = requests.get(f"{BASE_URL}/api/admin/product-insights/fast-moving", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Fast moving products: {len(data)} products")
        
        if data:
            product = data[0]
            assert "sku" in product
            assert "total_qty" in product
            assert "revenue" in product
    
    def test_top_revenue_products(self, admin_headers):
        """GET /api/admin/product-insights/top-revenue - Top revenue products"""
        response = requests.get(f"{BASE_URL}/api/admin/product-insights/top-revenue", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Top revenue products: {len(data)} products")
    
    def test_high_margin_products(self, admin_headers):
        """GET /api/admin/product-insights/high-margin - High margin products"""
        response = requests.get(f"{BASE_URL}/api/admin/product-insights/high-margin", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"High margin products: {len(data)} products")
    
    def test_repeat_orders(self, admin_headers):
        """GET /api/admin/product-insights/repeat-orders - Repeat order products"""
        response = requests.get(f"{BASE_URL}/api/admin/product-insights/repeat-orders", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Repeat order products: {len(data)} products")
    
    def test_product_in_house_opportunity(self, admin_headers):
        """GET /api/admin/product-insights/in-house-opportunity - In-house opportunity"""
        response = requests.get(f"{BASE_URL}/api/admin/product-insights/in-house-opportunity", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"In-house opportunity products: {len(data)} products")
        
        if data:
            product = data[0]
            assert "sku" in product
            assert "opportunity_score" in product


# ============= Service Insights Tests =============
class TestServiceInsights:
    """Service Insights analytics tests"""
    
    def test_service_demand(self, admin_headers):
        """GET /api/admin/service-insights/demand - Service demand"""
        response = requests.get(f"{BASE_URL}/api/admin/service-insights/demand", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Service demand: {len(data)} services")
        
        if data:
            service = data[0]
            assert "service_key" in service
            assert "total_requests" in service
    
    def test_service_conversion(self, admin_headers):
        """GET /api/admin/service-insights/conversion - Service conversion funnel"""
        response = requests.get(f"{BASE_URL}/api/admin/service-insights/conversion", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Service conversion data: {len(data)} services")
        
        if data:
            service = data[0]
            assert "quote_rate" in service
            assert "approval_rate" in service
            assert "completion_rate" in service
    
    def test_service_delays(self, admin_headers):
        """GET /api/admin/service-insights/delays - Services with delays"""
        response = requests.get(f"{BASE_URL}/api/admin/service-insights/delays", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Services with delays: {len(data)} services")
    
    def test_partner_coverage(self, admin_headers):
        """GET /api/admin/service-insights/partner-coverage - Partner coverage needs"""
        response = requests.get(f"{BASE_URL}/api/admin/service-insights/partner-coverage", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Partner coverage: {len(data)} services")
        
        if data:
            service = data[0]
            assert "service_key" in service
            assert "partner_count" in service
            assert "needs_more_partners" in service
    
    def test_service_in_house_opportunity(self, admin_headers):
        """GET /api/admin/service-insights/in-house-opportunity - In-house service opportunity"""
        response = requests.get(f"{BASE_URL}/api/admin/service-insights/in-house-opportunity", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"In-house opportunity services: {len(data)} services")


# ============= Staff Performance Tests =============
class TestStaffPerformance:
    """Staff Performance analytics tests"""
    
    def test_staff_performance_summary(self, admin_headers):
        """GET /api/admin/staff-performance/summary - Staff performance summary"""
        response = requests.get(f"{BASE_URL}/api/admin/staff-performance/summary", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Staff performance summary: {len(data)} staff members")
        
        if data:
            staff = data[0]
            assert "staff_email" in staff
            assert "role" in staff
    
    def test_staff_workload(self, admin_headers):
        """GET /api/admin/staff-performance/workload - Staff workload distribution"""
        response = requests.get(f"{BASE_URL}/api/admin/staff-performance/workload", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Staff workload: {len(data)} staff with active assignments")
        
        if data:
            staff = data[0]
            assert "staff_email" in staff
            assert "active_assignments" in staff


# ============= Test cleanup =============
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data(admin_headers):
    """Cleanup test data after all tests"""
    yield
    # Cleanup is handled by individual test methods deleting their created data
    print("Test cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
