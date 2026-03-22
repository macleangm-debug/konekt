"""
Test GTM + Partner Management + Onboarding Pack APIs
- Go-To-Market Configuration Admin API
- Affiliate Partner Manager API
- Vendor Dashboard API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGTMSettings:
    """Go-To-Market Settings API tests"""
    
    def test_get_gtm_settings(self):
        """GET /api/admin/go-to-market/settings - Returns GTM commercial settings"""
        response = requests.get(f"{BASE_URL}/api/admin/go-to-market/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected fields exist
        assert "minimum_company_margin_percent" in data
        assert "distribution_layer_percent" in data
        assert "affiliate_percent" in data
        assert "sales_percent_self_generated" in data
        assert "sales_percent_affiliate_generated" in data
        assert "promo_percent" in data
        assert "referral_percent" in data
        assert "country_bonus_percent" in data
        assert "payout_threshold" in data
        assert "payout_cycle" in data
        assert "attribution_window_days" in data
        assert "bank_only_payments" in data
        assert "payment_verification_mode" in data
        assert "ai_enabled" in data
        assert "ai_handoff_after_messages" in data
        assert "assignment_mode" in data
        print(f"GTM Settings retrieved: {data}")
    
    def test_update_gtm_settings(self):
        """PUT /api/admin/go-to-market/settings - Updates GTM settings"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/go-to-market/settings")
        assert get_response.status_code == 200
        original = get_response.json()
        
        # Update with new values
        update_payload = {
            "minimum_company_margin_percent": 25.0,
            "affiliate_percent": 12.0,
            "payout_cycle": "weekly",
            "ai_enabled": False
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/go-to-market/settings",
            json=update_payload
        )
        assert put_response.status_code == 200, f"Expected 200, got {put_response.status_code}: {put_response.text}"
        
        updated = put_response.json()
        assert updated["minimum_company_margin_percent"] == 25.0
        assert updated["affiliate_percent"] == 12.0
        assert updated["payout_cycle"] == "weekly"
        assert updated["ai_enabled"] == False
        assert "updated_at" in updated
        print(f"GTM Settings updated: {updated}")
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/admin/go-to-market/settings")
        assert verify_response.status_code == 200
        verified = verify_response.json()
        assert verified["minimum_company_margin_percent"] == 25.0
        assert verified["affiliate_percent"] == 12.0
        print("GTM Settings persistence verified")
        
        # Restore original values
        restore_payload = {
            "minimum_company_margin_percent": original.get("minimum_company_margin_percent", 20.0),
            "affiliate_percent": original.get("affiliate_percent", 10.0),
            "payout_cycle": original.get("payout_cycle", "monthly"),
            "ai_enabled": original.get("ai_enabled", True)
        }
        requests.put(f"{BASE_URL}/api/admin/go-to-market/settings", json=restore_payload)


class TestAffiliatePartnerManager:
    """Affiliate Partner Manager API tests"""
    
    def test_list_affiliates(self):
        """GET /api/admin/affiliates - Lists all affiliates with metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/affiliates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of affiliates"
        print(f"Found {len(data)} affiliates")
        
        # If affiliates exist, verify structure
        if data:
            affiliate = data[0]
            assert "id" in affiliate
            assert "name" in affiliate
            assert "email" in affiliate
            assert "promo_code" in affiliate
            assert "clicks" in affiliate
            assert "sales" in affiliate
            assert "total_commission" in affiliate
            assert "affiliate_status" in affiliate
            print(f"Sample affiliate: {affiliate}")
    
    def test_list_affiliates_with_status_filter(self):
        """GET /api/admin/affiliates?status=active - Filter by status"""
        response = requests.get(f"{BASE_URL}/api/admin/affiliates?status=active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        # All returned affiliates should have active status
        for affiliate in data:
            assert affiliate.get("affiliate_status") == "active", f"Expected active status, got {affiliate.get('affiliate_status')}"
        print(f"Found {len(data)} active affiliates")
    
    def test_get_affiliate_detail(self):
        """GET /api/admin/affiliates/:affiliateId - Gets affiliate detail"""
        # First get list to find an affiliate ID
        list_response = requests.get(f"{BASE_URL}/api/admin/affiliates")
        assert list_response.status_code == 200
        affiliates = list_response.json()
        
        if not affiliates:
            pytest.skip("No affiliates found to test detail endpoint")
        
        affiliate_id = affiliates[0]["id"]
        
        # Get detail
        detail_response = requests.get(f"{BASE_URL}/api/admin/affiliates/{affiliate_id}")
        assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}: {detail_response.text}"
        
        detail = detail_response.json()
        assert detail["id"] == affiliate_id
        assert "name" in detail
        assert "email" in detail
        assert "promo_code" in detail
        assert "affiliate_status" in detail
        assert "clicks" in detail
        assert "sales" in detail
        assert "total_commission" in detail
        assert "masked_sales" in detail
        assert isinstance(detail["masked_sales"], list)
        print(f"Affiliate detail: {detail}")
    
    def test_get_affiliate_detail_not_found(self):
        """GET /api/admin/affiliates/:affiliateId - Returns 404 for invalid ID"""
        # Use a valid ObjectId format but non-existent
        fake_id = "000000000000000000000000"
        response = requests.get(f"{BASE_URL}/api/admin/affiliates/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returns 404 for non-existent affiliate")
    
    def test_update_affiliate_status(self):
        """PUT /api/admin/affiliates/:affiliateId/status - Updates affiliate status"""
        # First get list to find an affiliate ID
        list_response = requests.get(f"{BASE_URL}/api/admin/affiliates")
        assert list_response.status_code == 200
        affiliates = list_response.json()
        
        if not affiliates:
            pytest.skip("No affiliates found to test status update")
        
        affiliate_id = affiliates[0]["id"]
        original_status = affiliates[0].get("affiliate_status", "active")
        
        # Update status
        new_status = "watchlist" if original_status != "watchlist" else "active"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/affiliates/{affiliate_id}/status",
            json={"affiliate_status": new_status}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        result = update_response.json()
        assert result.get("ok") == True
        print(f"Status updated to {new_status}")
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/admin/affiliates/{affiliate_id}")
        assert verify_response.status_code == 200
        verified = verify_response.json()
        assert verified["affiliate_status"] == new_status
        print("Status update persistence verified")
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/admin/affiliates/{affiliate_id}/status",
            json={"affiliate_status": original_status}
        )
    
    def test_update_affiliate_promo_code(self):
        """PUT /api/admin/affiliates/:affiliateId/promo-code - Updates promo code"""
        # First get list to find an affiliate ID
        list_response = requests.get(f"{BASE_URL}/api/admin/affiliates")
        assert list_response.status_code == 200
        affiliates = list_response.json()
        
        if not affiliates:
            pytest.skip("No affiliates found to test promo code update")
        
        affiliate_id = affiliates[0]["id"]
        original_code = affiliates[0].get("promo_code", "AFF")
        
        # Update promo code
        new_code = "TEST_PROMO_123"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/affiliates/{affiliate_id}/promo-code",
            json={"promo_code": new_code}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        result = update_response.json()
        assert result.get("ok") == True
        print(f"Promo code updated to {new_code}")
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/admin/affiliates/{affiliate_id}")
        assert verify_response.status_code == 200
        verified = verify_response.json()
        assert verified["promo_code"] == new_code
        print("Promo code update persistence verified")
        
        # Restore original code
        requests.put(
            f"{BASE_URL}/api/admin/affiliates/{affiliate_id}/promo-code",
            json={"promo_code": original_code}
        )


class TestVendorPartnerPortal:
    """Vendor Partner Portal API tests"""
    
    def test_get_vendor_jobs(self):
        """GET /api/partner/vendor/jobs - Gets vendor assigned jobs"""
        response = requests.get(f"{BASE_URL}/api/partner/vendor/jobs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of jobs"
        print(f"Found {len(data)} vendor jobs")
        
        # If jobs exist, verify structure
        if data:
            job = data[0]
            assert "id" in job
            print(f"Sample job: {job}")
    
    def test_get_vendor_performance(self):
        """GET /api/partner/vendor/performance - Gets vendor performance metrics"""
        response = requests.get(f"{BASE_URL}/api/partner/vendor/performance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_jobs" in data
        assert "completed_jobs" in data
        assert "completion_rate" in data
        assert "avg_quality_score" in data
        
        # Verify data types
        assert isinstance(data["total_jobs"], int)
        assert isinstance(data["completed_jobs"], int)
        assert isinstance(data["completion_rate"], (int, float))
        assert isinstance(data["avg_quality_score"], (int, float))
        print(f"Vendor performance: {data}")
    
    def test_update_job_progress(self):
        """POST /api/partner/vendor/jobs/:jobId/progress - Updates job progress"""
        # This endpoint requires a job_id - test with a mock job_id
        # The endpoint should handle non-existent jobs gracefully
        test_job_id = "test_job_123"
        
        response = requests.post(
            f"{BASE_URL}/api/partner/vendor/jobs/{test_job_id}/progress",
            json={
                "internal_status": "in_progress",
                "progress_note": "Test progress update"
            }
        )
        # Should return 200 even if job doesn't exist (upsert=False means no update happens)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("ok") == True
        print("Job progress update endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
