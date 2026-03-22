"""
Phase 3 & 4 E2E Testing: Admin Control (Risk & Money Layer) and Partner Execution Layer
Tests payment approvals, service-partner mapping, routing, and partner fulfillment workflows.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


class TestAdminAuthentication:
    """Admin authentication tests"""
    
    def test_admin_login(self):
        """Test admin login returns token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        # Admin login returns 'token' not 'access_token'
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"


class TestPaymentProofRoutes:
    """Payment proof submission and approval workflow tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_list_payment_proofs_admin(self, admin_token):
        """Test listing all payment proofs for admin"""
        response = requests.get(
            f"{BASE_URL}/api/payment-proofs/admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to list payment proofs: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_payment_proof_summary(self, admin_token):
        """Test payment proof summary endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/payment-proofs/admin/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get summary: {response.text}"
        data = response.json()
        assert "pending_count" in data, "Missing pending_count"
        assert "approved_count" in data, "Missing approved_count"
        assert "rejected_count" in data, "Missing rejected_count"
        assert "total_pending_amount" in data, "Missing total_pending_amount"
    
    def test_submit_payment_proof(self, admin_token):
        """Test submitting a payment proof"""
        payload = {
            "invoice_id": "TEST_INV_001",
            "customer_email": "test@example.com",
            "customer_name": "TEST_Phase3_Customer",
            "amount_paid": 50000,
            "currency": "TZS",
            "payment_date": "2026-03-22",
            "bank_reference": "TEST_REF_001",
            "payment_method": "bank_transfer",
            "notes": "Test payment proof submission"
        }
        response = requests.post(
            f"{BASE_URL}/api/payment-proofs/submit",
            json=payload
        )
        assert response.status_code == 200, f"Failed to submit proof: {response.text}"
        data = response.json()
        assert "submission" in data, "Missing submission in response"
        assert data["submission"]["status"] == "pending", "Status should be pending"
        return data["submission"]["id"]
    
    def test_approve_payment_proof_flow(self, admin_token):
        """Test full payment proof approval flow"""
        # First submit a proof
        submit_payload = {
            "invoice_id": "TEST_INV_APPROVE",
            "customer_email": "test@example.com",
            "customer_name": "TEST_Approval_Customer",
            "amount_paid": 75000,
            "currency": "TZS",
            "bank_reference": "TEST_APPROVE_REF",
            "payment_method": "bank_transfer"
        }
        submit_res = requests.post(f"{BASE_URL}/api/payment-proofs/submit", json=submit_payload)
        assert submit_res.status_code == 200
        proof_id = submit_res.json()["submission"]["id"]
        
        # Approve the proof
        approve_res = requests.post(
            f"{BASE_URL}/api/payment-proofs/admin/{proof_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"approved_by": "admin", "notes": "Test approval"}
        )
        assert approve_res.status_code == 200, f"Failed to approve: {approve_res.text}"
        data = approve_res.json()
        assert data["submission"]["status"] == "approved", "Status should be approved"
    
    def test_reject_payment_proof_flow(self, admin_token):
        """Test payment proof rejection flow"""
        # Submit a proof
        submit_payload = {
            "invoice_id": "TEST_INV_REJECT",
            "customer_email": "test@example.com",
            "customer_name": "TEST_Reject_Customer",
            "amount_paid": 25000,
            "currency": "TZS",
            "bank_reference": "TEST_REJECT_REF",
            "payment_method": "bank_transfer"
        }
        submit_res = requests.post(f"{BASE_URL}/api/payment-proofs/submit", json=submit_payload)
        assert submit_res.status_code == 200
        proof_id = submit_res.json()["submission"]["id"]
        
        # Reject the proof
        reject_res = requests.post(
            f"{BASE_URL}/api/payment-proofs/admin/{proof_id}/reject",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"rejected_by": "admin", "reason": "Test rejection - invalid reference"}
        )
        assert reject_res.status_code == 200, f"Failed to reject: {reject_res.text}"
        data = reject_res.json()
        assert data["submission"]["status"] == "rejected", "Status should be rejected"


class TestInvoiceRoutes:
    """Invoice management tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_list_invoices(self, admin_token):
        """Test listing invoices"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices-v2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to list invoices: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_invoice_by_id(self, admin_token):
        """Test getting invoice by ID - using known invoice ID"""
        # Known invoice ID from context
        invoice_id = "69bf96f8ad812dc857c4134c"
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices-v2/{invoice_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # May be 200 or 404 depending on data state
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
    
    def test_update_invoice_status(self, admin_token):
        """Test updating invoice status"""
        # First get list of invoices
        list_res = requests.get(
            f"{BASE_URL}/api/admin/invoices-v2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        invoices = list_res.json()
        
        if invoices:
            invoice_id = invoices[0]["id"]
            current_status = invoices[0].get("status", "draft")
            
            # Update to sent if draft, otherwise keep same
            new_status = "sent" if current_status == "draft" else current_status
            
            response = requests.patch(
                f"{BASE_URL}/api/admin/invoices-v2/{invoice_id}/status?status={new_status}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Failed to update status: {response.text}"
        else:
            pytest.skip("No invoices available for status update test")


class TestServicePartnerCapabilities:
    """Service-partner capability mapping and routing tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_list_capabilities(self, admin_token):
        """Test listing service-partner capabilities"""
        response = requests.get(
            f"{BASE_URL}/api/admin/service-partner-capabilities",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to list capabilities: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_list_capabilities_with_filter(self, admin_token):
        """Test filtering capabilities by service_key"""
        response = requests.get(
            f"{BASE_URL}/api/admin/service-partner-capabilities?service_key=printing_branding",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to filter capabilities: {response.text}"
    
    def test_create_capability_mapping(self, admin_token):
        """Test creating a new service-partner capability mapping"""
        payload = {
            "partner_id": "TEST_PARTNER_001",
            "partner_name": "TEST_Phase3_Partner",
            "service_key": "test_service",
            "service_name": "Test Service",
            "country_code": "TZ",
            "regions": ["Dar es Salaam"],
            "capability_status": "active",
            "priority_rank": 1,
            "quality_score": 85,
            "avg_turnaround_days": 3,
            "success_rate": 95,
            "current_active_queue": 0,
            "preferred_routing": False,
            "notes": "Test capability mapping"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/service-partner-capabilities",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload
        )
        assert response.status_code == 200, f"Failed to create capability: {response.text}"
        data = response.json()
        assert data["partner_name"] == "TEST_Phase3_Partner"
        assert data["service_key"] == "test_service"
        return data["id"]
    
    def test_update_capability_mapping(self, admin_token):
        """Test updating a capability mapping"""
        # First create one
        create_payload = {
            "partner_id": "TEST_UPDATE_PARTNER",
            "partner_name": "TEST_Update_Partner",
            "service_key": "test_update_service",
            "service_name": "Test Update Service",
            "country_code": "TZ",
            "capability_status": "active",
            "priority_rank": 2,
            "quality_score": 70
        }
        create_res = requests.post(
            f"{BASE_URL}/api/admin/service-partner-capabilities",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=create_payload
        )
        assert create_res.status_code == 200
        capability_id = create_res.json()["id"]
        
        # Update it
        update_payload = {
            "quality_score": 90,
            "priority_rank": 1,
            "notes": "Updated quality score"
        }
        update_res = requests.put(
            f"{BASE_URL}/api/admin/service-partner-capabilities/{capability_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_payload
        )
        assert update_res.status_code == 200, f"Failed to update: {update_res.text}"
        data = update_res.json()
        assert data["quality_score"] == 90
    
    def test_routing_best_partner(self, admin_token):
        """Test best partner routing logic"""
        # First ensure we have a capability for printing_branding
        response = requests.get(
            f"{BASE_URL}/api/admin/service-partner-capabilities/routing/best?service_key=printing_branding&country_code=TZ",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get best partner: {response.text}"
        data = response.json()
        # May or may not have a best partner depending on data
        assert "best_partner" in data, "Response should have best_partner key"
    
    def test_delete_capability_mapping(self, admin_token):
        """Test deleting a capability mapping"""
        # Create one to delete
        create_payload = {
            "partner_id": "TEST_DELETE_PARTNER",
            "partner_name": "TEST_Delete_Partner",
            "service_key": "test_delete_service",
            "country_code": "TZ",
            "capability_status": "active"
        }
        create_res = requests.post(
            f"{BASE_URL}/api/admin/service-partner-capabilities",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=create_payload
        )
        assert create_res.status_code == 200
        capability_id = create_res.json()["id"]
        
        # Delete it
        delete_res = requests.delete(
            f"{BASE_URL}/api/admin/service-partner-capabilities/{capability_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_res.status_code == 200, f"Failed to delete: {delete_res.text}"


class TestPartnerAuthentication:
    """Partner authentication tests"""
    
    def test_partner_login(self):
        """Test partner login"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        assert response.status_code == 200, f"Partner login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_partner_login_invalid_credentials(self):
        """Test partner login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": "invalid@partner.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400], f"Expected auth failure, got: {response.status_code}"


class TestPartnerPortalDashboard:
    """Partner portal dashboard tests"""
    
    @pytest.fixture
    def partner_token(self):
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Partner login failed - skipping partner tests")
        return response.json().get("access_token")
    
    def test_partner_dashboard(self, partner_token):
        """Test partner dashboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/dashboard",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Failed to get dashboard: {response.text}"
        data = response.json()
        assert "partner" in data, "Missing partner info"
        assert "summary" in data, "Missing summary"


class TestPartnerFulfillment:
    """Partner fulfillment workflow tests"""
    
    @pytest.fixture
    def partner_token(self):
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Partner login failed - skipping partner tests")
        return response.json().get("access_token")
    
    def test_list_fulfillment_jobs(self, partner_token):
        """Test listing fulfillment jobs"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/fulfillment-jobs",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Failed to list jobs: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_list_fulfillment_jobs_filtered(self, partner_token):
        """Test listing fulfillment jobs with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/fulfillment-jobs?status=allocated",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Failed to filter jobs: {response.text}"


class TestPartnerSettlements:
    """Partner settlements tests"""
    
    @pytest.fixture
    def partner_token(self):
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Partner login failed - skipping partner tests")
        return response.json().get("access_token")
    
    def test_partner_settlements(self, partner_token):
        """Test partner settlements endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/partner-portal/settlements",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert response.status_code == 200, f"Failed to get settlements: {response.text}"
        data = response.json()
        assert "total_due" in data or "rows" in data, "Missing settlement data"


class TestOrdersOperations:
    """Orders operations tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_list_orders(self, admin_token):
        """Test listing orders"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to list orders: {response.text}"
        data = response.json()
        # Orders endpoint returns object with 'orders' key
        assert "orders" in data, "Response should have orders key"
        assert isinstance(data["orders"], list), "Orders should be a list"
    
    def test_list_orders_filtered(self, admin_token):
        """Test listing orders with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders?status=pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to filter orders: {response.text}"


class TestNotifications:
    """Notification system tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_list_notifications(self, admin_token):
        """Test listing notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to list notifications: {response.text}"
    
    def test_unread_count(self, admin_token):
        """Test unread notification count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get unread count: {response.text}"


class TestMarketplaceProducts:
    """Marketplace products tests"""
    
    def test_list_marketplace_listings_by_country(self):
        """Test listing marketplace products by country (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/country/TZ")
        assert response.status_code == 200, f"Failed to list products: {response.text}"
        data = response.json()
        assert "items" in data, "Response should have items key"
        assert "total" in data, "Response should have total key"
        # Note: May have 0 items if no listings are published


class TestAdminAnalytics:
    """Admin analytics/dashboard tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_analytics_overview(self, admin_token):
        """Test admin analytics overview"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get analytics: {response.text}"
        data = response.json()
        assert "summary" in data, "Missing summary in analytics"


# Cleanup fixture to remove test data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests complete"""
    yield
    # Cleanup would go here if needed
    # For now, test data with TEST_ prefix can be identified and cleaned manually


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
