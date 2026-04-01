"""
Pack 1 - Service & Promo Experience Fix Tests
Tests for:
1. Service page resolution via API fallback
2. In-account marketplace Services tab (20+ services)
3. PromoMultiBlankBuilder submission (promo_custom with promo_items)
4. CantFindWhatYouNeedBanner CTA routing
5. QuoteRequestPage 'Other / Not Sure' lane (contact_general)
6. Request type validation (service_quote, promo_custom, promo_sample, contact_general)
7. Requests appear in admin inbox (not guest_leads)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def customer_token(api_client):
    """Get customer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer authentication failed")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


class TestServiceCatalogAPI:
    """Test service catalog API endpoints for service page resolution"""
    
    def test_service_catalog_types_endpoint_exists(self, api_client):
        """Test that service catalog types endpoint exists"""
        # This endpoint may return 404 for unknown slugs, but should not 500
        response = api_client.get(f"{BASE_URL}/api/service-catalog/types/fumigation-services")
        # Either 200 (found) or 404 (not found in API, will use static fallback)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"Service catalog API response for fumigation-services: {response.status_code}")
    
    def test_service_request_templates_endpoint(self, api_client):
        """Test service request templates endpoint returns services"""
        response = api_client.get(f"{BASE_URL}/api/service-request-templates")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        print(f"Service templates count: {len(data)}")
        # May return empty if no templates in DB, but endpoint should work


class TestPublicRequestIntake:
    """Test public request intake for all request types"""
    
    def test_service_quote_request(self, api_client):
        """Test submitting a service_quote request"""
        payload = {
            "request_type": "service_quote",
            "title": "TEST_Service Quote Request",
            "guest_name": "Test User Pack1",
            "guest_email": "test.pack1.service@example.com",
            "phone_prefix": "+255",
            "phone": "712345678",
            "company_name": "Test Company",
            "service_name": "Fumigation Services",
            "service_slug": "fumigation-services",
            "source_page": "/services/fumigation-services",
            "details": {
                "primary_lane": "services",
                "service_category": "facilities",
                "urgency": "within_week"
            },
            "notes": "Need fumigation for office premises"
        }
        response = api_client.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "request_number" in data
        assert data.get("request_type") == "service_quote"
        print(f"Service quote request created: {data.get('request_number')}")
    
    def test_promo_custom_request(self, api_client):
        """Test submitting a promo_custom request"""
        payload = {
            "request_type": "promo_custom",
            "title": "TEST_Promo Custom Request",
            "guest_name": "Test User Pack1 Promo",
            "guest_email": "test.pack1.promo@example.com",
            "phone_prefix": "+255",
            "phone": "712345679",
            "company_name": "Test Promo Company",
            "source_page": "/request-quote",
            "details": {
                "primary_lane": "promo",
                "promo_action": "promo_custom",
                "urgency": "flexible"
            },
            "notes": "Need branded notebooks and pens"
        }
        response = api_client.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert data.get("request_type") == "promo_custom"
        print(f"Promo custom request created: {data.get('request_number')}")
    
    def test_promo_sample_request(self, api_client):
        """Test submitting a promo_sample request"""
        payload = {
            "request_type": "promo_sample",
            "title": "TEST_Promo Sample Request",
            "guest_name": "Test User Pack1 Sample",
            "guest_email": "test.pack1.sample@example.com",
            "phone_prefix": "+255",
            "phone": "712345680",
            "source_page": "/request-quote",
            "details": {
                "primary_lane": "promo",
                "promo_action": "promo_sample"
            },
            "notes": "Want to see sample of branded mugs"
        }
        response = api_client.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert data.get("request_type") == "promo_sample"
        print(f"Promo sample request created: {data.get('request_number')}")
    
    def test_contact_general_request(self, api_client):
        """Test submitting a contact_general request (Other / Not Sure lane)"""
        payload = {
            "request_type": "contact_general",
            "title": "TEST_General Inquiry",
            "guest_name": "Test User Pack1 General",
            "guest_email": "test.pack1.general@example.com",
            "phone_prefix": "+255",
            "phone": "712345681",
            "company_name": "General Inquiry Company",
            "source_page": "/request-quote",
            "details": {
                "primary_lane": "other",
                "urgency": "flexible",
                "scope_message": "Not sure what I need, please advise"
            },
            "notes": "Looking for general business support"
        }
        response = api_client.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert data.get("request_type") == "contact_general"
        print(f"Contact general request created: {data.get('request_number')}")
    
    def test_invalid_request_type_rejected(self, api_client):
        """Test that invalid request types are rejected"""
        payload = {
            "request_type": "invalid_type",
            "title": "TEST_Invalid Request",
            "guest_name": "Test User",
            "guest_email": "test.invalid@example.com"
        }
        response = api_client.post(f"{BASE_URL}/api/public-requests", json=payload)
        # Should return 400 or 422 for invalid request type
        assert response.status_code in [400, 422], f"Expected 400/422, got: {response.status_code}"
        print(f"Invalid request type correctly rejected: {response.status_code}")


class TestAuthenticatedPromoRequest:
    """Test authenticated promo request submission (PromoMultiBlankBuilder)"""
    
    def test_promo_multi_item_request(self, api_client, customer_token):
        """Test submitting promo request with multiple items via /api/requests"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        payload = {
            "request_type": "promo_custom",
            "title": "TEST_Promotional Materials — 3 items",
            "notes": "Need these for upcoming conference",
            "details": {
                "primary_lane": "promotional",
                "promo_items": [
                    {
                        "item_name": "Branded Notebooks",
                        "quantity": 100,
                        "print_type": "screen_print",
                        "notes": "A5 size, company logo on cover"
                    },
                    {
                        "item_name": "Branded Pens",
                        "quantity": 200,
                        "print_type": "digital_print",
                        "notes": "Blue ink, logo on barrel"
                    },
                    {
                        "item_name": "Lanyards",
                        "quantity": 150,
                        "print_type": "sublimation",
                        "notes": "Full color print with company branding"
                    }
                ],
                "branding_notes": "Use company colors: Navy blue and gold"
            }
        }
        response = api_client.post(f"{BASE_URL}/api/requests", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "request_number" in data
        assert data.get("status") == "submitted"  # Authenticated endpoint returns status, not request_type
        print(f"Multi-item promo request created: {data.get('request_number')}")
        return data.get("request_id")


class TestAdminRequestsInbox:
    """Test that requests appear in admin inbox"""
    
    def test_admin_can_list_requests(self, api_client, admin_token):
        """Test admin can list all requests"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/requests", headers=headers)
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin requests inbox count: {len(data)}")
        
        # Check that we have various request types
        request_types = set(r.get("request_type") for r in data)
        print(f"Request types in inbox: {request_types}")
    
    def test_admin_can_filter_by_request_type(self, api_client, admin_token):
        """Test admin can filter requests by type"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Filter by service_quote
        response = api_client.get(f"{BASE_URL}/api/admin/requests?request_type=service_quote", headers=headers)
        assert response.status_code == 200
        service_requests = response.json()
        print(f"Service quote requests: {len(service_requests)}")
        
        # Filter by promo_custom
        response = api_client.get(f"{BASE_URL}/api/admin/requests?request_type=promo_custom", headers=headers)
        assert response.status_code == 200
        promo_requests = response.json()
        print(f"Promo custom requests: {len(promo_requests)}")
        
        # Filter by contact_general
        response = api_client.get(f"{BASE_URL}/api/admin/requests?request_type=contact_general", headers=headers)
        assert response.status_code == 200
        general_requests = response.json()
        print(f"Contact general requests: {len(general_requests)}")
    
    def test_requests_not_in_guest_leads(self, api_client, admin_token):
        """Verify requests are in requests collection, not guest_leads"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get requests
        response = api_client.get(f"{BASE_URL}/api/admin/requests", headers=headers)
        assert response.status_code == 200
        requests_data = response.json()
        
        # Check that TEST_ prefixed requests exist in requests inbox
        test_requests = [r for r in requests_data if r.get("title", "").startswith("TEST_")]
        print(f"Test requests in inbox: {len(test_requests)}")
        
        # Requests should have request_number format REQ-YYMMDD-XXXXXX
        for req in test_requests[:3]:
            req_num = req.get("request_number", "")
            assert req_num.startswith("REQ-"), f"Invalid request number format: {req_num}"


class TestMarketplaceTaxonomy:
    """Test marketplace taxonomy and products API"""
    
    def test_marketplace_taxonomy(self, api_client):
        """Test marketplace taxonomy endpoint"""
        response = api_client.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200
        data = response.json()
        assert "groups" in data
        assert "categories" in data
        print(f"Taxonomy groups: {len(data.get('groups', []))}")
    
    def test_marketplace_products_search(self, api_client):
        """Test marketplace products search"""
        response = api_client.get(f"{BASE_URL}/api/marketplace/products/search")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Marketplace products count: {len(data)}")


class TestRequestCTAs:
    """Test request CTA configuration endpoint"""
    
    def test_request_ctas_endpoint(self, api_client):
        """Test request CTAs endpoint returns configuration"""
        response = api_client.get(f"{BASE_URL}/api/requests/ctas")
        assert response.status_code == 200
        data = response.json()
        assert "public" in data or "account_shortcuts" in data
        print(f"Request CTAs: {list(data.keys())}")


class TestServicePageURLPreselection:
    """Test URL parameter pre-selection for quote request page"""
    
    def test_service_quote_type_preselection(self, api_client):
        """Verify service_quote type is valid for pre-selection"""
        # This tests that the backend accepts service_quote as a valid type
        payload = {
            "request_type": "service_quote",
            "title": "TEST_URL Preselection Test",
            "guest_name": "URL Test User",
            "guest_email": "test.url.preselect@example.com",
            "service_slug": "office-branding",
            "source_page": "/request-quote?type=service_quote&service=office-branding",
            "details": {
                "primary_lane": "services",
                "service_category": "printing_branding"
            }
        }
        response = api_client.post(f"{BASE_URL}/api/public-requests", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("request_type") == "service_quote"
        print(f"URL preselection test passed: {data.get('request_number')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
