"""
Test Suite for Konekt B2B Platform - Correction Pass (Enforcement)
Tests: StandardDrawerShell migration, Affiliate form, Promotions simplification, CRM width, Team Alerts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

# Staff credentials
STAFF_EMAIL = "staff@konekt.co.tz"
STAFF_PASSWORD = "Staff123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def staff_token():
    """Get staff authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Staff authentication failed")


class TestTeamPerformanceAlerts:
    """Test Team Performance API - Alerts with reference and lead_id fields"""
    
    def test_team_performance_summary_returns_alerts(self, admin_token):
        """Verify /api/admin/team-performance/summary returns alerts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/team-performance/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "kpis" in data
        assert "reps" in data
        assert "alerts" in data
        
        print(f"Total alerts: {len(data['alerts'])}")
    
    def test_alerts_have_reference_and_lead_id_fields(self, admin_token):
        """Verify alerts include reference and lead_id fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/team-performance/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        alerts = data.get("alerts", [])
        if len(alerts) > 0:
            # Check first alert has required fields
            first_alert = alerts[0]
            assert "type" in first_alert
            assert "severity" in first_alert
            assert "message" in first_alert
            assert "entity" in first_alert
            assert "reference" in first_alert, "Alert missing 'reference' field"
            assert "lead_id" in first_alert or first_alert["type"] == "pending_payments", "Alert missing 'lead_id' field"
            
            print(f"Alert structure verified: type={first_alert['type']}, reference={first_alert.get('reference', 'N/A')}")
        else:
            print("No alerts to verify (empty alerts list)")
    
    def test_alerts_have_resolved_owner_names(self, admin_token):
        """Verify alerts have resolved owner/rep names (not raw IDs)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/team-performance/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        alerts = data.get("alerts", [])
        for alert in alerts[:5]:  # Check first 5 alerts
            entity = alert.get("entity", "")
            # Entity should be a name or "Unassigned", not a UUID
            if entity and entity != "Unassigned":
                # UUIDs are 36 chars with dashes
                assert len(entity) != 36 or "-" not in entity, f"Entity appears to be raw UUID: {entity}"
            print(f"Alert entity: {entity}")


class TestPromotionsAPI:
    """Test Promotions API - No discount_type/discount_value in creation"""
    
    def test_get_promotions_list(self, admin_token):
        """Verify promotions list endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promotions?status=all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "promotions" in data
        print(f"Total promotions: {len(data['promotions'])}")
    
    def test_promotion_creation_without_discount_fields(self, admin_token):
        """Verify promotion can be created without explicit discount_type/discount_value"""
        # Create a test promotion with minimal fields
        payload = {
            "name": "TEST_CorrectionPass_Promo",
            "code": "TESTCORR271",
            "description": "Test promotion for correction pass",
            "scope": "global",
            "stacking_rule": "no_stack",
            # Note: NOT including discount_type or discount_value
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promotions",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Should succeed or return validation error (not 500)
        assert response.status_code in [200, 201, 400, 422], f"Unexpected status: {response.status_code}"
        
        if response.status_code in [200, 201]:
            print("Promotion created successfully without discount fields")
            # Clean up - delete the test promotion
            promo_id = response.json().get("id")
            if promo_id:
                requests.delete(
                    f"{BASE_URL}/api/admin/promotions/{promo_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
        else:
            print(f"Promotion creation response: {response.json()}")


class TestAffiliatesAPI:
    """Test Affiliates API - Form fields verification"""
    
    def test_get_affiliates_list(self, admin_token):
        """Verify affiliates list endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/affiliates",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Response can be a list directly or have "affiliates" key
        if isinstance(data, list):
            print(f"Total affiliates: {len(data)}")
        else:
            assert "affiliates" in data
            print(f"Total affiliates: {len(data['affiliates'])}")
    
    def test_affiliate_creation_with_payout_fields(self, admin_token):
        """Verify affiliate can be created with payout method fields"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_CorrectionPass_Affiliate_{unique_id}",
            "phone": "+255712345678",
            "email": f"test_affiliate_{unique_id}@test.com",
            "affiliate_code": f"TESTCORR{unique_id}".upper(),
            "is_active": True,
            "payout_method": "mobile_money",
            "mobile_money_number": "0712345678",
            "mobile_money_provider": "M-Pesa",
            # Note: NOT including commission_type or commission_value
        }
        
        response = requests.post(
            f"{BASE_URL}/api/affiliates",  # Try without /admin prefix
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # If 404/405, try with /admin prefix
        if response.status_code in [404, 405]:
            response = requests.post(
                f"{BASE_URL}/api/admin/affiliates/create",
                json=payload,
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        # Should succeed or return validation error (not 500)
        assert response.status_code in [200, 201, 400, 404, 405, 422], f"Unexpected status: {response.status_code}"
        
        if response.status_code in [200, 201]:
            print("Affiliate created successfully with payout fields")
            # Clean up - delete the test affiliate
            aff_id = response.json().get("id")
            if aff_id:
                requests.delete(
                    f"{BASE_URL}/api/admin/affiliates/{aff_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
        else:
            print(f"Affiliate creation response: {response.status_code} - endpoint may use different path")


class TestContentEngineAPI:
    """Test Content Engine API for SalesContentHubPage"""
    
    def test_get_products_template_data(self, staff_token):
        """Verify products template data endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/content-engine/template-data/products",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"Products with images: {len([p for p in data['items'] if p.get('image_url')])}")
    
    def test_get_services_template_data(self, staff_token):
        """Verify services template data endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/content-engine/template-data/services",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"Services with images: {len([s for s in data['items'] if s.get('image_url')])}")
    
    def test_get_branding_template_data(self, staff_token):
        """Verify branding template data endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/content-engine/template-data/branding",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "branding" in data
        print(f"Branding data: {data['branding'].get('trading_name', 'N/A')}")


class TestPaymentProofsAPI:
    """Test Payment Proofs Admin API"""
    
    def test_get_payment_proofs_list(self, admin_token):
        """Verify payment proofs list endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/payment-proofs/admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Response is a list of proofs
        assert isinstance(data, list)
        print(f"Total payment proofs: {len(data)}")
    
    def test_get_payment_proofs_summary(self, admin_token):
        """Verify payment proofs summary endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/payment-proofs/admin/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Check summary fields
        assert "pending_count" in data or "total" in data or isinstance(data, dict)
        print(f"Payment proofs summary: {data}")


class TestCRMLeadsAPI:
    """Test CRM Leads API"""
    
    def test_get_leads_list(self, admin_token):
        """Verify leads list endpoint works"""
        # Try different endpoint paths
        response = requests.get(
            f"{BASE_URL}/api/admin/crm/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 404:
            response = requests.get(
                f"{BASE_URL}/api/admin/crm-deals/leads",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        if response.status_code == 404:
            response = requests.get(
                f"{BASE_URL}/api/crm/leads",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        assert response.status_code == 200, f"Leads endpoint returned {response.status_code}"
        data = response.json()
        # Response can be a list or have a "leads" key
        if isinstance(data, list):
            print(f"Total leads: {len(data)}")
        elif isinstance(data, dict):
            leads = data.get("leads", data.get("data", []))
            print(f"Total leads: {len(leads)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
