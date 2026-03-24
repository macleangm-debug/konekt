"""
Test Admin Flow Fixes Pack - Admin Simplification + Payments Fixes
Tests for:
- Service Leads CRM API
- Finance Queue API
- Admin Orders Split View API
- Promo Customization Quote Request API
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


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        print(f"Admin login successful, role: {data.get('admin', {}).get('role', 'N/A')}")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"


class TestCustomerLogin:
    """Customer authentication tests"""
    
    def test_customer_login_success(self):
        """Test customer login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data or "user" in data, "No token/user in response"
        print(f"Customer login successful")


class TestServiceLeadsAPI:
    """Service Leads CRM API tests"""
    
    def test_get_service_leads(self):
        """GET /api/admin-flow-fixes/sales/service-leads returns array"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/sales/service-leads")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected array of leads"
        print(f"Service leads count: {len(data)}")
        if data:
            lead = data[0]
            assert "id" in lead, "Lead missing id"
            assert "customer_name" in lead, "Lead missing customer_name"
            assert "lead_type" in lead, "Lead missing lead_type"
            assert "status" in lead, "Lead missing status"
            print(f"Sample lead: {lead.get('title')} - {lead.get('status')}")
    
    def test_get_service_leads_with_search(self):
        """GET /api/admin-flow-fixes/sales/service-leads with search query"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/sales/service-leads?q=test")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected array"


class TestFinanceQueueAPI:
    """Finance Queue API tests"""
    
    def test_get_finance_queue(self):
        """GET /api/admin-flow-fixes/finance/queue returns array"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/finance/queue")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected array of payment proofs"
        print(f"Finance queue count: {len(data)}")
        if data:
            proof = data[0]
            assert "payment_proof_id" in proof, "Proof missing payment_proof_id"
            assert "customer_name" in proof, "Proof missing customer_name"
            assert "amount_paid" in proof, "Proof missing amount_paid"
            print(f"Sample proof: {proof.get('invoice_number')} - {proof.get('status')}")
    
    def test_get_finance_queue_with_search(self):
        """GET /api/admin-flow-fixes/finance/queue with search query"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/finance/queue?q=test")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected array"


class TestAdminOrdersSplitAPI:
    """Admin Orders Split View API tests"""
    
    def test_get_orders_split(self):
        """GET /api/admin-flow-fixes/admin/orders-split returns array"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/admin/orders-split")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected array of orders"
        print(f"Orders count: {len(data)}")
        if data:
            order = data[0]
            assert "id" in order, "Order missing id"
            assert "order_number" in order, "Order missing order_number"
            assert "customer_name" in order, "Order missing customer_name"
            assert "status" in order, "Order missing status"
            assert "total_amount" in order, "Order missing total_amount"
            print(f"Sample order: {order.get('order_number')} - {order.get('status')}")
    
    def test_get_orders_split_with_search(self):
        """GET /api/admin-flow-fixes/admin/orders-split with search query"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/admin/orders-split?q=KON")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected array"


class TestPromoCustomizationQuoteAPI:
    """Promotional Material Customization Quote Request API tests"""
    
    def test_request_customization_quote_success(self):
        """POST /api/admin-flow-fixes/promo/request-customization-quote creates lead"""
        test_item_id = f"TEST_ITEM_{uuid4().hex[:8]}"
        payload = {
            "customer_id": "test_customer_123",
            "item_id": test_item_id,
            "item_name": "TEST Promotional T-Shirt",
            "selected_color": "Blue",
            "selected_size": "XL",
            "blank_unit_price": 15000,
            "quantity": 50,
            "customization_brief": "Logo on front, company name on back"
        }
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/promo/request-customization-quote", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Expected ok: true"
        assert "lead" in data, "Expected lead in response"
        lead = data["lead"]
        assert lead.get("customer_id") == "test_customer_123"
        assert lead.get("item_id") == test_item_id
        assert lead.get("type") == "promotional_material_customization"
        assert lead.get("status") == "new"
        print(f"Created lead: {lead.get('id')}")
    
    def test_request_customization_quote_missing_customer_id(self):
        """POST /api/admin-flow-fixes/promo/request-customization-quote fails without customer_id"""
        payload = {
            "item_id": "some_item"
        }
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/promo/request-customization-quote", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_request_customization_quote_missing_item_id(self):
        """POST /api/admin-flow-fixes/promo/request-customization-quote fails without item_id"""
        payload = {
            "customer_id": "some_customer"
        }
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/promo/request-customization-quote", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestLeadStatusUpdate:
    """Lead status update API tests"""
    
    def test_update_lead_status_missing_params(self):
        """POST /api/admin-flow-fixes/leads/update-status fails without required params"""
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/leads/update-status", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_update_lead_status_not_found(self):
        """POST /api/admin-flow-fixes/leads/update-status returns 404 for non-existent lead"""
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/leads/update-status", json={
            "lead_id": "non_existent_lead_id",
            "status": "contacted"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestFinanceApproveReject:
    """Finance approve/reject API tests"""
    
    def test_approve_proof_not_found(self):
        """POST /api/admin-flow-fixes/finance/approve-proof returns 404 for non-existent proof"""
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/finance/approve-proof", json={
            "payment_proof_id": "non_existent_proof_id",
            "approver_role": "finance"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_approve_proof_invalid_role(self):
        """POST /api/admin-flow-fixes/finance/approve-proof rejects invalid role"""
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/finance/approve-proof", json={
            "payment_proof_id": "some_proof_id",
            "approver_role": "sales"  # Invalid role
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_reject_proof_not_found(self):
        """POST /api/admin-flow-fixes/finance/reject-proof returns 404 for non-existent proof"""
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/finance/reject-proof", json={
            "payment_proof_id": "non_existent_proof_id",
            "approver_role": "finance",
            "reason": "Test rejection"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_reject_proof_invalid_role(self):
        """POST /api/admin-flow-fixes/finance/reject-proof rejects invalid role"""
        response = requests.post(f"{BASE_URL}/api/admin-flow-fixes/finance/reject-proof", json={
            "payment_proof_id": "some_proof_id",
            "approver_role": "sales",  # Invalid role
            "reason": "Test"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
