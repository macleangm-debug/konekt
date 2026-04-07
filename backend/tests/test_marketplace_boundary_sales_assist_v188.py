"""
Test Suite for Iteration 188: Marketplace Boundary Enforcement, Sales Assist CTA, and Service Quote Margin Engine

Features tested:
1. Sales Assist API: POST /api/public/sales-assist creates request with status=new
2. Service Quote Margin API: POST /api/admin/service-quote-margin/preview returns internal + customer views
3. Service Quote Margin: Customer view shows ONLY quoted_amount (no margin details)
4. Service Quote Margin: Internal view shows full breakdown
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSalesAssistAPI:
    """Tests for the Sales Assist public endpoint"""
    
    def test_sales_assist_endpoint_exists(self):
        """Verify the sales assist endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/public/sales-assist",
            json={
                "customer_name": "Test User",
                "email": "test@example.com"
            },
            headers={"Content-Type": "application/json"}
        )
        # Should return 200 OK
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_sales_assist_creates_request_with_status_new(self):
        """POST /api/public/sales-assist creates a request with status=new and returns ok=true"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "customer_name": "Test Customer",
            "company_name": "Test Company Ltd",
            "email": unique_email,
            "phone": "+255712345678",
            "product_id": "6d927ec9-a7b8-43f5-8ade-15f211d2112a",
            "product_name": "Classic Cotton T-Shirt",
            "quantity": 100,
            "notes": "Need bulk pricing for corporate event",
            "page_url": "https://konekt.co.tz/marketplace/classic-cotton-t-shirt",
            "source": "pdp_sales_assist"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/sales-assist",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify ok=true
        assert data.get("ok") == True, f"Expected ok=true, got {data}"
        
        # Verify request object is returned
        assert "request" in data, f"Expected 'request' in response, got {data}"
        request_obj = data["request"]
        
        # Verify status=new
        assert request_obj.get("status") == "new", f"Expected status='new', got {request_obj.get('status')}"
        
        # Verify other fields are persisted
        assert request_obj.get("customer_name") == "Test Customer"
        assert request_obj.get("email") == unique_email
        assert request_obj.get("product_name") == "Classic Cotton T-Shirt"
        assert request_obj.get("quantity") == 100
        assert request_obj.get("source") == "pdp_sales_assist"
        
        # Verify ID is generated
        assert "id" in request_obj, "Expected 'id' in request object"
        
        print(f"✓ Sales Assist request created with id={request_obj['id']}, status={request_obj['status']}")
        
    def test_sales_assist_minimal_payload(self):
        """Sales assist works with minimal payload (just name and email)"""
        payload = {
            "customer_name": "Minimal Test",
            "email": f"minimal_{uuid.uuid4().hex[:8]}@test.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/sales-assist",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert data["request"]["status"] == "new"
        print("✓ Sales Assist works with minimal payload")
        
    def test_sales_assist_from_cart_source(self):
        """Sales assist request from cart page has correct source"""
        payload = {
            "customer_name": "Cart User",
            "email": f"cart_{uuid.uuid4().hex[:8]}@test.com",
            "product_name": "Multiple Products",
            "source": "cart_sales_assist"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/sales-assist",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["request"]["source"] == "cart_sales_assist"
        print("✓ Sales Assist from cart has correct source")
        
    def test_sales_assist_from_checkout_source(self):
        """Sales assist request from checkout page has correct source"""
        payload = {
            "customer_name": "Checkout User",
            "email": f"checkout_{uuid.uuid4().hex[:8]}@test.com",
            "source": "checkout_sales_assist"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/sales-assist",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["request"]["source"] == "checkout_sales_assist"
        print("✓ Sales Assist from checkout has correct source")


class TestServiceQuoteMarginAPI:
    """Tests for the Service Quote Margin admin endpoint"""
    
    def test_service_quote_margin_preview_endpoint_exists(self):
        """Verify the service quote margin preview endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/admin/service-quote-margin/preview",
            json={
                "service_name": "Test Service",
                "vendor_base_tax_inclusive": 100000,
                "margin_percent": 20
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_service_quote_margin_returns_internal_and_customer_views(self):
        """POST /api/admin/service-quote-margin/preview returns internal breakdown AND customer-facing amount"""
        payload = {
            "service_name": "Office Deep Cleaning",
            "vendor_base_tax_inclusive": 500000,  # TZS 500,000
            "margin_percent": 25  # 25% margin
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/service-quote-margin/preview",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify ok=true
        assert data.get("ok") == True, f"Expected ok=true, got {data}"
        
        # Verify both views are present
        assert "internal" in data, f"Expected 'internal' view in response"
        assert "customer" in data, f"Expected 'customer' view in response"
        
        print(f"✓ Service Quote Margin returns both internal and customer views")
        
    def test_service_quote_margin_internal_view_has_full_breakdown(self):
        """Internal view shows base_tax_inclusive_cost, margin_percent, margin_value, final_quote_amount"""
        payload = {
            "service_name": "Printer Servicing",
            "vendor_base_tax_inclusive": 200000,  # TZS 200,000
            "margin_percent": 30  # 30% margin
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/service-quote-margin/preview",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        internal = data["internal"]
        
        # Verify all internal fields are present
        assert "service_name" in internal, "Internal view missing service_name"
        assert "base_tax_inclusive_cost" in internal, "Internal view missing base_tax_inclusive_cost"
        assert "margin_percent" in internal, "Internal view missing margin_percent"
        assert "margin_value" in internal, "Internal view missing margin_value"
        assert "final_quote_amount" in internal, "Internal view missing final_quote_amount"
        
        # Verify values
        assert internal["service_name"] == "Printer Servicing"
        assert internal["base_tax_inclusive_cost"] == 200000.0
        assert internal["margin_percent"] == 30.0
        
        # Margin calculation: 200000 * 0.30 = 60000
        assert internal["margin_value"] == 60000.0, f"Expected margin_value=60000, got {internal['margin_value']}"
        
        # Final amount: 200000 + 60000 = 260000
        assert internal["final_quote_amount"] == 260000.0, f"Expected final_quote_amount=260000, got {internal['final_quote_amount']}"
        
        print(f"✓ Internal view has full breakdown: base={internal['base_tax_inclusive_cost']}, margin={internal['margin_value']}, final={internal['final_quote_amount']}")
        
    def test_service_quote_margin_customer_view_only_shows_quoted_amount(self):
        """Customer view shows ONLY quoted_amount (no margin details)"""
        payload = {
            "service_name": "Graphic Design Support",
            "vendor_base_tax_inclusive": 150000,
            "margin_percent": 20
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/service-quote-margin/preview",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        customer = data["customer"]
        
        # Customer view should have service_name and quoted_amount
        assert "service_name" in customer, "Customer view missing service_name"
        assert "quoted_amount" in customer, "Customer view missing quoted_amount"
        
        # Customer view should NOT have margin details
        assert "base_tax_inclusive_cost" not in customer, "Customer view should NOT have base_tax_inclusive_cost"
        assert "margin_percent" not in customer, "Customer view should NOT have margin_percent"
        assert "margin_value" not in customer, "Customer view should NOT have margin_value"
        
        # Verify quoted_amount is correct (150000 + 20% = 180000)
        assert customer["quoted_amount"] == 180000.0, f"Expected quoted_amount=180000, got {customer['quoted_amount']}"
        
        print(f"✓ Customer view only shows: service_name={customer['service_name']}, quoted_amount={customer['quoted_amount']}")
        
    def test_service_quote_margin_zero_margin(self):
        """Service quote with 0% margin returns base cost as final amount"""
        payload = {
            "service_name": "Pass-through Service",
            "vendor_base_tax_inclusive": 100000,
            "margin_percent": 0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/service-quote-margin/preview",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["internal"]["margin_value"] == 0.0
        assert data["internal"]["final_quote_amount"] == 100000.0
        assert data["customer"]["quoted_amount"] == 100000.0
        
        print("✓ Zero margin works correctly")
        
    def test_service_quote_margin_high_margin(self):
        """Service quote with high margin (50%) calculates correctly"""
        payload = {
            "service_name": "Premium Service",
            "vendor_base_tax_inclusive": 1000000,
            "margin_percent": 50
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/service-quote-margin/preview",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 1000000 * 0.50 = 500000 margin
        assert data["internal"]["margin_value"] == 500000.0
        # 1000000 + 500000 = 1500000 final
        assert data["internal"]["final_quote_amount"] == 1500000.0
        assert data["customer"]["quoted_amount"] == 1500000.0
        
        print("✓ High margin (50%) calculates correctly")


class TestPublicMarketplaceAPI:
    """Tests for public marketplace listing API"""
    
    def test_marketplace_listing_detail_api(self):
        """Verify marketplace listing detail API works"""
        # Using the test product ID
        response = requests.get(
            f"{BASE_URL}/api/public-marketplace/listing/6d927ec9-a7b8-43f5-8ade-15f211d2112a"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "listing" in data, "Expected 'listing' in response"
        listing = data["listing"]
        
        # Verify listing has expected fields
        assert "name" in listing
        assert "base_price" in listing or "price" in listing
        
        print(f"✓ Marketplace listing API works: {listing.get('name')}")


class TestHealthCheck:
    """Basic health checks"""
    
    def test_api_health(self):
        """Verify API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        # Accept 200 or 404 (endpoint may not exist but server is up)
        assert response.status_code in [200, 404], f"API not responding: {response.status_code}"
        print("✓ API is responding")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
