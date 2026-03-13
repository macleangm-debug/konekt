"""
Test Audit Log and Launch Readiness Report APIs
Tests for iteration 25: Menu simplification, activity logs, launch readiness PDF
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
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
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin authentication"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestAuditLogEndpoints:
    """Audit Log API - /api/admin/audit endpoints"""
    
    def test_audit_log_requires_auth(self):
        """Test audit log endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/audit")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_list_audit_logs(self, admin_headers):
        """Test listing audit logs - returns array (may be empty)"""
        response = requests.get(f"{BASE_URL}/api/admin/audit", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of audit logs"
        print(f"Found {len(data)} audit logs")
    
    def test_list_audit_logs_with_filters(self, admin_headers):
        """Test audit logs with filter parameters"""
        params = {"actor_email": "test@test.com", "entity_type": "quote", "action": "create"}
        response = requests.get(f"{BASE_URL}/api/admin/audit", params=params, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of audit logs"
    
    def test_get_entity_audit_logs(self, admin_headers):
        """Test getting audit logs for specific entity"""
        response = requests.get(
            f"{BASE_URL}/api/admin/audit/entity/quote/test-entity-id", 
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of entity audit logs"
    
    def test_list_audit_actions(self, admin_headers):
        """Test listing distinct audit actions"""
        response = requests.get(f"{BASE_URL}/api/admin/audit/actions", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of action types"
        print(f"Found {len(data)} distinct action types")
    
    def test_list_entity_types(self, admin_headers):
        """Test listing distinct entity types"""
        response = requests.get(f"{BASE_URL}/api/admin/audit/entity-types", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of entity types"
        print(f"Found {len(data)} distinct entity types")


class TestLaunchReportEndpoints:
    """Launch Readiness Report API - /api/admin/launch-report endpoints"""
    
    def test_launch_report_json_requires_auth(self):
        """Test launch report JSON endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/launch-report/json")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_launch_report_pdf_requires_auth(self):
        """Test launch report PDF endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/launch-report/pdf")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_get_launch_report_json(self, admin_headers):
        """Test getting launch readiness report as JSON"""
        response = requests.get(f"{BASE_URL}/api/admin/launch-report/json", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate structure
        assert "generated_at" in data, "Expected generated_at in response"
        assert "counts" in data, "Expected counts in response"
        assert "checks" in data, "Expected checks in response"
        assert "ready_score" in data, "Expected ready_score in response"
        assert "max_score" in data, "Expected max_score in response"
        assert "status" in data, "Expected status in response"
        assert "manual_checklist" in data, "Expected manual_checklist in response"
        
        # Validate data types
        assert isinstance(data["counts"], dict), "counts should be a dict"
        assert isinstance(data["checks"], dict), "checks should be a dict"
        assert isinstance(data["ready_score"], int), "ready_score should be int"
        assert isinstance(data["max_score"], int), "max_score should be int"
        assert isinstance(data["manual_checklist"], list), "manual_checklist should be list"
        
        print(f"Launch readiness: {data['ready_score']}/{data['max_score']} - {data['status']}")
    
    def test_get_launch_report_pdf(self, admin_headers):
        """Test getting launch readiness report as PDF"""
        response = requests.get(f"{BASE_URL}/api/admin/launch-report/pdf", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Validate PDF response
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content-type, got {content_type}"
        
        content_disposition = response.headers.get("content-disposition", "")
        assert "konekt-launch-readiness" in content_disposition, "Expected konekt-launch-readiness in filename"
        
        # Validate PDF content exists
        assert len(response.content) > 1000, f"PDF seems too small: {len(response.content)} bytes"
        print(f"PDF generated successfully: {len(response.content)} bytes")


class TestExistingHealthEndpoints:
    """Verify existing health/QA endpoints still work (used by LaunchReadinessPage)"""
    
    def test_qa_health_check(self, admin_headers):
        """Test QA health check endpoint (used by LaunchReadinessPage)"""
        response = requests.get(f"{BASE_URL}/api/admin/qa/health-check", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate structure matches what LaunchReadinessPage expects
        assert "checks" in data or "ready_score" in data, "Expected checks or ready_score in response"
        print(f"QA Health check response keys: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
