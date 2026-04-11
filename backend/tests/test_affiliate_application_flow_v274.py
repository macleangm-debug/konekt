"""
Affiliate Application Flow Tests - Iteration 274
Tests: Public application submission, admin review, approve/reject flow
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin auth failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_client(admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


@pytest.fixture(scope="module")
def public_client():
    """Session without auth for public endpoints"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPublicApplicationSubmission:
    """Test public affiliate application submission (no auth required)"""
    
    def test_submit_application_success(self, public_client):
        """POST /api/affiliate-applications creates application with status 'pending'"""
        unique_email = f"test_apply_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "TEST_Applicant User",
            "email": unique_email,
            "phone": "+255 712 345 678",
            "company_name": "TEST_Business Ltd",
            "region": "Dar es Salaam",
            "notes": "I want to become an affiliate partner"
        }
        
        response = public_client.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("ok") is True
        assert "application" in data
        
        app = data["application"]
        assert app["full_name"] == payload["full_name"]
        assert app["email"] == payload["email"]
        assert app["phone"] == payload["phone"]
        assert app["company_name"] == payload["company_name"]
        assert app["region"] == payload["region"]
        assert app["notes"] == payload["notes"]
        assert app["status"] == "pending"
        assert "id" in app
        assert "created_at" in app
        
        # Store for cleanup
        TestPublicApplicationSubmission.created_app_id = app["id"]
        TestPublicApplicationSubmission.created_email = unique_email
        
        print(f"✓ Application created with id={app['id']}, status=pending")
    
    def test_submit_application_duplicate_email_rejected(self, public_client):
        """POST /api/affiliate-applications rejects duplicate email"""
        # Use the email from previous test
        email = getattr(TestPublicApplicationSubmission, 'created_email', None)
        if not email:
            pytest.skip("No previous application to test duplicate")
        
        payload = {
            "full_name": "Another Applicant",
            "email": email,
            "phone": "+255 700 000 000"
        }
        
        response = public_client.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        
        # Should reject with 400
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        
        data = response.json()
        assert "already exists" in data.get("detail", "").lower()
        
        print(f"✓ Duplicate email correctly rejected")
    
    def test_submit_application_missing_required_fields(self, public_client):
        """POST /api/affiliate-applications validates required fields"""
        # Missing email
        payload = {"full_name": "Test User"}
        
        response = public_client.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        
        # Should fail validation (422 for Pydantic)
        assert response.status_code == 422, f"Expected 422 for missing email, got {response.status_code}"
        
        print(f"✓ Missing required fields correctly rejected")


class TestAdminListApplications:
    """Test admin listing of applications"""
    
    def test_list_all_applications(self, admin_client):
        """GET /api/affiliate-applications returns list of applications"""
        response = admin_client.get(f"{BASE_URL}/api/affiliate-applications")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "applications" in data
        assert isinstance(data["applications"], list)
        
        print(f"✓ Listed {len(data['applications'])} applications")
    
    def test_list_applications_filter_by_status(self, admin_client):
        """GET /api/affiliate-applications?status=pending filters correctly"""
        response = admin_client.get(f"{BASE_URL}/api/affiliate-applications?status=pending")
        
        assert response.status_code == 200
        
        data = response.json()
        applications = data.get("applications", [])
        
        # All returned should be pending
        for app in applications:
            assert app["status"] in ("pending", "pending_review"), f"Got non-pending status: {app['status']}"
        
        print(f"✓ Filtered to {len(applications)} pending applications")


class TestApproveRejectFlow:
    """Test approve and reject application flow"""
    
    @pytest.fixture(autouse=True)
    def setup_test_application(self, public_client, admin_client):
        """Create a fresh application for approve/reject tests"""
        unique_email = f"test_approve_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "TEST_ApproveReject User",
            "email": unique_email,
            "phone": "+255 711 111 111",
            "company_name": "TEST_ApproveReject Co",
            "region": "Arusha",
            "notes": "Testing approve/reject flow"
        }
        
        response = public_client.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code == 200
        
        self.test_app = response.json()["application"]
        self.test_email = unique_email
        self.admin_client = admin_client
        
        yield
        
        # Cleanup: Delete test affiliate if created
        # Note: No delete endpoint, so we leave cleanup to manual or next test run
    
    def test_approve_application_creates_affiliate(self, admin_client):
        """POST /api/affiliate-applications/{id}/approve creates affiliate with auto-commission"""
        app_id = self.test_app["id"]
        
        response = admin_client.post(f"{BASE_URL}/api/affiliate-applications/{app_id}/approve")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        assert "affiliate" in data
        
        affiliate = data["affiliate"]
        assert affiliate["email"] == self.test_email
        assert affiliate["name"] == "TEST_ApproveReject User"
        assert affiliate["is_active"] is True
        assert "affiliate_code" in affiliate
        assert "affiliate_link" in affiliate
        
        # Commission should be auto-set from settings (12% as per context)
        assert "commission_type" in affiliate
        assert "commission_value" in affiliate
        # Default is percentage with 12% from settings
        assert affiliate["commission_type"] == "percentage"
        assert affiliate["commission_value"] == 12.0 or affiliate["commission_value"] == 12
        
        print(f"✓ Approved application, created affiliate with code={affiliate['affiliate_code']}, commission={affiliate['commission_value']}%")
        
        # Verify application status updated
        list_response = admin_client.get(f"{BASE_URL}/api/affiliate-applications")
        apps = list_response.json().get("applications", [])
        approved_app = next((a for a in apps if a.get("id") == app_id), None)
        
        assert approved_app is not None
        assert approved_app["status"] == "approved"
        
        print(f"✓ Application status updated to 'approved'")
    
    def test_approve_already_approved_fails(self, admin_client):
        """POST /api/affiliate-applications/{id}/approve on already approved fails"""
        # First approve
        app_id = self.test_app["id"]
        admin_client.post(f"{BASE_URL}/api/affiliate-applications/{app_id}/approve")
        
        # Try to approve again
        response = admin_client.post(f"{BASE_URL}/api/affiliate-applications/{app_id}/approve")
        
        assert response.status_code == 400, f"Expected 400 for double approve, got {response.status_code}"
        
        print(f"✓ Double approve correctly rejected")


class TestRejectFlow:
    """Test reject application flow"""
    
    @pytest.fixture(autouse=True)
    def setup_reject_application(self, public_client, admin_client):
        """Create a fresh application for reject test"""
        unique_email = f"test_reject_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "TEST_Reject User",
            "email": unique_email,
            "phone": "+255 722 222 222",
            "company_name": "TEST_Reject Co",
            "region": "Mwanza"
        }
        
        response = public_client.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert response.status_code == 200
        
        self.test_app = response.json()["application"]
        self.admin_client = admin_client
        
        yield
    
    def test_reject_application_updates_status(self, admin_client):
        """POST /api/affiliate-applications/{id}/reject updates status to rejected"""
        app_id = self.test_app["id"]
        
        response = admin_client.post(
            f"{BASE_URL}/api/affiliate-applications/{app_id}/reject",
            json={"note": "Not meeting requirements"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        assert data.get("status") == "rejected"
        
        print(f"✓ Application rejected successfully")
        
        # Verify status in list
        list_response = admin_client.get(f"{BASE_URL}/api/affiliate-applications")
        apps = list_response.json().get("applications", [])
        rejected_app = next((a for a in apps if a.get("id") == app_id), None)
        
        assert rejected_app is not None
        assert rejected_app["status"] == "rejected"
        
        print(f"✓ Application status verified as 'rejected'")


class TestApplicationNotFound:
    """Test error handling for non-existent applications"""
    
    def test_approve_nonexistent_application(self, admin_client):
        """POST /api/affiliate-applications/{id}/approve returns 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        
        response = admin_client.post(f"{BASE_URL}/api/affiliate-applications/{fake_id}/approve")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print(f"✓ Non-existent application approve returns 404")
    
    def test_reject_nonexistent_application(self, admin_client):
        """POST /api/affiliate-applications/{id}/reject returns 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        
        response = admin_client.post(
            f"{BASE_URL}/api/affiliate-applications/{fake_id}/reject",
            json={"note": "test"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print(f"✓ Non-existent application reject returns 404")


class TestCheckApplicationStatus:
    """Test public status check endpoint"""
    
    def test_check_status_existing_email(self, public_client):
        """GET /api/affiliate-applications/check/{email} returns status for existing"""
        # First create an application
        unique_email = f"test_check_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "TEST_Check User",
            "email": unique_email
        }
        
        create_response = public_client.post(f"{BASE_URL}/api/affiliate-applications", json=payload)
        assert create_response.status_code == 200
        
        # Check status
        response = public_client.get(f"{BASE_URL}/api/affiliate-applications/check/{unique_email}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("exists") is True
        assert data.get("status") == "pending"
        
        print(f"✓ Status check returns exists=True, status=pending")
    
    def test_check_status_nonexistent_email(self, public_client):
        """GET /api/affiliate-applications/check/{email} returns exists=False for non-existent"""
        fake_email = f"nonexistent_{uuid.uuid4().hex[:8]}@example.com"
        
        response = public_client.get(f"{BASE_URL}/api/affiliate-applications/check/{fake_email}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("exists") is False
        
        print(f"✓ Status check returns exists=False for non-existent email")
