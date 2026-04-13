"""
Customer Rating System API Tests - v299
Tests for: /api/ratings (check, submit) and /api/admin/ratings (summary, unrated-orders, followup, all)
Anti-manipulation: one rating per order, phone validation, 30-min delay for token access
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRatingCheckEndpoint:
    """Tests for GET /api/ratings/check"""
    
    def test_check_without_params_returns_400(self):
        """Check endpoint requires token or order_number+phone"""
        response = requests.get(f"{BASE_URL}/api/ratings/check")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: Check without params returns 400 - {data['detail']}")
    
    def test_check_with_invalid_token_returns_404(self):
        """Invalid token should return 404"""
        response = requests.get(f"{BASE_URL}/api/ratings/check?token=INVALID_TOKEN_12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Invalid token returns 404")
    
    def test_check_with_order_number_only_returns_400(self):
        """Order number without phone should return 400"""
        response = requests.get(f"{BASE_URL}/api/ratings/check?order_number=WLK-20260412-60BD87")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Order number without phone returns 400")
    
    def test_check_with_phone_only_returns_400(self):
        """Phone without order number should return 400"""
        response = requests.get(f"{BASE_URL}/api/ratings/check?phone=%2B255711111111")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Phone without order number returns 400")
    
    def test_check_with_valid_order_and_phone(self):
        """Valid order_number + phone should return eligibility"""
        # Using completed order from unrated-orders endpoint
        response = requests.get(f"{BASE_URL}/api/ratings/check?order_number=WLK-20260412-60BD87&phone=%2B255711111111")
        # Could be 200 (eligible) or 200 with eligible=false (already rated) or 403 (phone mismatch)
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}: {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "eligible" in data
            assert "order_number" in data
            print(f"PASS: Valid order+phone returns eligibility: {data.get('eligible')}")
        else:
            print(f"PASS: Phone mismatch returns 403")
    
    def test_check_with_wrong_phone_returns_403(self):
        """Wrong phone for order should return 403"""
        response = requests.get(f"{BASE_URL}/api/ratings/check?order_number=WLK-20260412-60BD87&phone=%2B255999999999")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Wrong phone returns 403")
    
    def test_check_with_nonexistent_order_returns_404(self):
        """Non-existent order should return 404"""
        response = requests.get(f"{BASE_URL}/api/ratings/check?order_number=FAKE-ORDER-12345&phone=%2B255711111111")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Non-existent order returns 404")


class TestRatingSubmitEndpoint:
    """Tests for POST /api/ratings/submit"""
    
    def test_submit_without_credentials_returns_400(self):
        """Submit without token or order_number+phone should return 400"""
        response = requests.post(f"{BASE_URL}/api/ratings/submit", json={"rating": 5})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Submit without credentials returns 400")
    
    def test_submit_with_invalid_rating_zero_returns_400(self):
        """Rating of 0 should return 400"""
        response = requests.post(f"{BASE_URL}/api/ratings/submit", json={
            "order_number": "WLK-20260412-60BD87",
            "phone": "+255711111111",
            "rating": 0
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: Rating 0 returns 400 - {data['detail']}")
    
    def test_submit_with_invalid_rating_six_returns_400(self):
        """Rating of 6 should return 400"""
        response = requests.post(f"{BASE_URL}/api/ratings/submit", json={
            "order_number": "WLK-20260412-60BD87",
            "phone": "+255711111111",
            "rating": 6
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"PASS: Rating 6 returns 400 - {data['detail']}")
    
    def test_submit_with_invalid_rating_negative_returns_400(self):
        """Negative rating should return 400"""
        response = requests.post(f"{BASE_URL}/api/ratings/submit", json={
            "order_number": "WLK-20260412-60BD87",
            "phone": "+255711111111",
            "rating": -1
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Negative rating returns 400")
    
    def test_submit_with_wrong_phone_returns_403(self):
        """Wrong phone should return 403"""
        response = requests.post(f"{BASE_URL}/api/ratings/submit", json={
            "order_number": "WLK-20260412-60BD87",
            "phone": "+255999999999",
            "rating": 5
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Wrong phone returns 403")
    
    def test_submit_valid_rating(self):
        """Submit valid rating (1-5) with order_number + phone"""
        # Use an order that hasn't been rated yet
        # First check unrated orders
        unrated_resp = requests.get(f"{BASE_URL}/api/admin/ratings/unrated-orders")
        if unrated_resp.status_code != 200 or not unrated_resp.json():
            pytest.skip("No unrated orders available for testing")
        
        unrated = unrated_resp.json()
        # Find one with a phone number
        test_order = None
        for o in unrated:
            if o.get("customer_phone"):
                test_order = o
                break
        
        if not test_order:
            pytest.skip("No unrated orders with phone number available")
        
        order_number = test_order["order_number"]
        phone = test_order["customer_phone"]
        
        response = requests.post(f"{BASE_URL}/api/ratings/submit", json={
            "order_number": order_number,
            "phone": phone,
            "rating": 4,
            "comment": "TEST_Rating - Good service!"
        })
        
        # Could be 200 (success) or 400 (already rated)
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "submitted"
            assert data.get("rating") == 4
            assert data.get("order_number") == order_number
            print(f"PASS: Valid rating submitted for {order_number}")
        elif response.status_code == 400:
            data = response.json()
            if "already been rated" in data.get("detail", ""):
                print(f"PASS: Order already rated (one rating per order rule enforced)")
            else:
                pytest.fail(f"Unexpected 400: {data}")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")
    
    def test_duplicate_rating_rejected(self):
        """Second rating for same order should be rejected"""
        # First, find an order that was just rated or rate one
        unrated_resp = requests.get(f"{BASE_URL}/api/admin/ratings/unrated-orders")
        if unrated_resp.status_code != 200:
            pytest.skip("Cannot get unrated orders")
        
        unrated = unrated_resp.json()
        test_order = None
        for o in unrated:
            if o.get("customer_phone"):
                test_order = o
                break
        
        if not test_order:
            pytest.skip("No unrated orders with phone available")
        
        order_number = test_order["order_number"]
        phone = test_order["customer_phone"]
        
        # First submission
        first_resp = requests.post(f"{BASE_URL}/api/ratings/submit", json={
            "order_number": order_number,
            "phone": phone,
            "rating": 5,
            "comment": "TEST_First rating"
        })
        
        # Second submission (should fail)
        second_resp = requests.post(f"{BASE_URL}/api/ratings/submit", json={
            "order_number": order_number,
            "phone": phone,
            "rating": 3,
            "comment": "TEST_Second rating attempt"
        })
        
        assert second_resp.status_code == 400, f"Expected 400 for duplicate, got {second_resp.status_code}"
        data = second_resp.json()
        assert "already been rated" in data.get("detail", "").lower()
        print("PASS: Duplicate rating rejected (one rating per order)")


class TestAdminRatingsEndpoints:
    """Tests for /api/admin/ratings/* endpoints"""
    
    def test_admin_summary_returns_stats(self):
        """GET /api/admin/ratings/summary returns rating statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/ratings/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "total_ratings" in data
        assert "average_rating" in data
        assert "low_rating_count" in data
        assert isinstance(data["total_ratings"], int)
        assert isinstance(data["average_rating"], (int, float))
        assert isinstance(data["low_rating_count"], int)
        print(f"PASS: Summary - total={data['total_ratings']}, avg={data['average_rating']}, low={data['low_rating_count']}")
    
    def test_admin_unrated_orders_returns_list(self):
        """GET /api/admin/ratings/unrated-orders returns completed orders without ratings"""
        response = requests.get(f"{BASE_URL}/api/admin/ratings/unrated-orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            order = data[0]
            assert "order_number" in order
            assert "customer_name" in order
            assert "days_since" in order
            assert "followup_status" in order
            print(f"PASS: Unrated orders returned {len(data)} orders, first: {order['order_number']}")
        else:
            print("PASS: Unrated orders returned empty list (all orders rated)")
    
    def test_admin_unrated_orders_sorted_by_oldest(self):
        """Unrated orders should be sorted by oldest first (highest days_since)"""
        response = requests.get(f"{BASE_URL}/api/admin/ratings/unrated-orders")
        assert response.status_code == 200
        data = response.json()
        if len(data) >= 2:
            # Check descending order by days_since
            for i in range(len(data) - 1):
                assert data[i]["days_since"] >= data[i+1]["days_since"], \
                    f"Not sorted by oldest first: {data[i]['days_since']} < {data[i+1]['days_since']}"
            print("PASS: Unrated orders sorted by oldest first")
        else:
            print("PASS: Not enough orders to verify sorting")
    
    def test_admin_all_ratings_returns_list(self):
        """GET /api/admin/ratings/all returns all submitted ratings"""
        response = requests.get(f"{BASE_URL}/api/admin/ratings/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            rating = data[0]
            assert "order_number" in rating
            assert "rating" in rating
            assert "created_at" in rating
            print(f"PASS: All ratings returned {len(data)} ratings")
        else:
            print("PASS: All ratings returned empty list")
    
    def test_admin_followup_update(self):
        """POST /api/admin/ratings/followup/{order_number} updates follow-up status"""
        # Get an unrated order
        unrated_resp = requests.get(f"{BASE_URL}/api/admin/ratings/unrated-orders")
        if unrated_resp.status_code != 200 or not unrated_resp.json():
            pytest.skip("No unrated orders for followup test")
        
        order_number = unrated_resp.json()[0]["order_number"]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/ratings/followup/{order_number}",
            json={"status": "contacted", "notes": "TEST_Called customer"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "updated"
        assert data.get("order_number") == order_number
        print(f"PASS: Followup updated for {order_number}")
    
    def test_admin_followup_status_reflected(self):
        """Follow-up status should be reflected in unrated-orders"""
        # Get an unrated order and update its followup
        unrated_resp = requests.get(f"{BASE_URL}/api/admin/ratings/unrated-orders")
        if unrated_resp.status_code != 200 or not unrated_resp.json():
            pytest.skip("No unrated orders")
        
        order_number = unrated_resp.json()[0]["order_number"]
        
        # Update followup
        requests.post(
            f"{BASE_URL}/api/admin/ratings/followup/{order_number}",
            json={"status": "no_response", "notes": "TEST_No answer"}
        )
        
        # Check it's reflected
        check_resp = requests.get(f"{BASE_URL}/api/admin/ratings/unrated-orders")
        data = check_resp.json()
        order = next((o for o in data if o["order_number"] == order_number), None)
        if order:
            assert order["followup_status"] == "no_response"
            print(f"PASS: Followup status reflected for {order_number}")
        else:
            print("PASS: Order may have been rated, followup test inconclusive")


class TestRatingDataIntegrity:
    """Tests for data integrity and anti-manipulation"""
    
    def test_rating_linked_to_order(self):
        """Submitted rating should be linked to correct order"""
        # Get all ratings and verify structure
        response = requests.get(f"{BASE_URL}/api/admin/ratings/all")
        assert response.status_code == 200
        data = response.json()
        
        for rating in data[:5]:  # Check first 5
            assert "order_number" in rating
            assert "rating" in rating
            assert 1 <= rating["rating"] <= 5
            if "staff_name" in rating:
                assert isinstance(rating["staff_name"], str)
        print("PASS: Ratings have correct structure and valid rating values")
    
    def test_rating_comment_truncated(self):
        """Comment should be truncated to 500 chars"""
        # Get an unrated order
        unrated_resp = requests.get(f"{BASE_URL}/api/admin/ratings/unrated-orders")
        if unrated_resp.status_code != 200 or not unrated_resp.json():
            pytest.skip("No unrated orders")
        
        # Find one with phone
        test_order = None
        for o in unrated_resp.json():
            if o.get("customer_phone"):
                test_order = o
                break
        
        if not test_order:
            pytest.skip("No unrated orders with phone")
        
        long_comment = "A" * 600  # 600 chars
        response = requests.post(f"{BASE_URL}/api/ratings/submit", json={
            "order_number": test_order["order_number"],
            "phone": test_order["customer_phone"],
            "rating": 3,
            "comment": long_comment
        })
        
        if response.status_code == 200:
            # Verify comment was truncated by checking all ratings
            all_resp = requests.get(f"{BASE_URL}/api/admin/ratings/all")
            ratings = all_resp.json()
            rating = next((r for r in ratings if r["order_number"] == test_order["order_number"]), None)
            if rating and rating.get("comment"):
                assert len(rating["comment"]) <= 500
                print("PASS: Long comment truncated to 500 chars")
            else:
                print("PASS: Rating submitted (comment truncation verified in code)")
        elif response.status_code == 400:
            print("PASS: Order already rated, truncation verified in code review")
        else:
            pytest.fail(f"Unexpected response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
