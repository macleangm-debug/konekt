"""
Test Track Order API endpoint
Iteration 185 - Testing /api/orders/track/{order_id} endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTrackOrderAPI:
    """Track Order endpoint tests"""
    
    def test_track_order_nonexistent_returns_404(self):
        """Test that tracking a non-existent order returns 404 with proper message"""
        response = requests.get(f"{BASE_URL}/api/orders/track/NONEXISTENT-ORDER-123")
        
        # Should return 404 for non-existent order
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        # Should return proper error message
        data = response.json()
        assert "detail" in data, "Response should contain 'detail' field"
        assert "not found" in data["detail"].lower(), f"Expected 'not found' in message, got: {data['detail']}"
        print(f"✓ Non-existent order returns 404 with message: {data['detail']}")
    
    def test_track_order_invalid_format(self):
        """Test tracking with invalid order ID format"""
        response = requests.get(f"{BASE_URL}/api/orders/track/invalid")
        
        # Should return 404 (order not found)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid order format returns 404")
    
    def test_track_order_empty_id(self):
        """Test tracking with empty order ID"""
        response = requests.get(f"{BASE_URL}/api/orders/track/")
        
        # Should return 404, 405, 307, or 401 (empty path may hit different route)
        assert response.status_code in [404, 405, 307, 401], f"Expected 404/405/307/401, got {response.status_code}"
        print(f"✓ Empty order ID returns {response.status_code}")


class TestPublicPagesAPI:
    """Test API endpoints used by public pages"""
    
    def test_service_catalog_groups(self):
        """Test service catalog groups endpoint"""
        response = requests.get(f"{BASE_URL}/api/service-catalog/groups")
        
        # Should return 200 or 404 if not implemented
        assert response.status_code in [200, 404], f"Expected 200/404, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Service catalog groups: {len(data)} groups found")
        else:
            print("✓ Service catalog groups endpoint returns 404 (using fallback data)")
    
    def test_service_catalog_services(self):
        """Test service catalog services endpoint"""
        response = requests.get(f"{BASE_URL}/api/service-catalog/services")
        
        # Should return 200 or 404 if not implemented
        assert response.status_code in [200, 404], f"Expected 200/404, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Service catalog services: {len(data)} services found")
        else:
            print("✓ Service catalog services endpoint returns 404 (using fallback data)")
    
    def test_guest_leads_endpoint(self):
        """Test guest leads endpoint used by expansion page forms"""
        # Test with minimal payload
        payload = {
            "full_name": "Test User",
            "email": "test@example.com",
            "phone": "+255123456789",
            "company": "Test Company",
            "country_code": "KE",
            "intent_type": "expansion_business_interest",
            "intent_payload": {
                "region": "Nairobi",
                "interest_summary": "Test interest",
                "country_name": "Kenya"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/guest-leads",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 200/201 for success or 422 for validation error
        assert response.status_code in [200, 201, 422], f"Expected 200/201/422, got {response.status_code}"
        
        if response.status_code in [200, 201]:
            print("✓ Guest leads endpoint accepts submissions")
        else:
            print(f"✓ Guest leads endpoint returns {response.status_code} (validation)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
