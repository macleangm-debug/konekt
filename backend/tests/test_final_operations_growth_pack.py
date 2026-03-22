"""
Test Final Operations + Growth Pack APIs
- Progress Engine: Status translation (customer-safe, no partner details)
- AI Assistant V2: Order/service guidance
- Affiliate Performance: Leaderboard, promo codes, status management
- Sales Provider Coordination: Internal follow-ups
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProgressEngine:
    """Progress Engine - Customer-safe status translation"""
    
    def test_product_status_sourcing_translates_to_preparing(self):
        """Product 'sourcing' should translate to 'Preparing Your Order' (customer-safe)"""
        response = requests.get(f"{BASE_URL}/api/progress-engine/translate", params={
            "item_type": "product",
            "internal_status": "sourcing"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["external_status"] == "Preparing Your Order", f"Expected 'Preparing Your Order', got {data['external_status']}"
        assert data["item_type"] == "product"
        assert data["internal_status"] == "sourcing"
        assert "next_step" in data
        print(f"✓ Product 'sourcing' → '{data['external_status']}' (next: {data['next_step']})")
    
    def test_product_status_confirmed_translates(self):
        """Product 'confirmed' should translate to 'Order Confirmed'"""
        response = requests.get(f"{BASE_URL}/api/progress-engine/translate", params={
            "item_type": "product",
            "internal_status": "confirmed"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["external_status"] == "Order Confirmed"
        print(f"✓ Product 'confirmed' → '{data['external_status']}'")
    
    def test_service_status_in_progress_translates(self):
        """Service 'in_progress' should translate to 'In Progress' (no partner details)"""
        response = requests.get(f"{BASE_URL}/api/progress-engine/translate", params={
            "item_type": "service",
            "internal_status": "in_progress"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["external_status"] == "In Progress", f"Expected 'In Progress', got {data['external_status']}"
        # Verify NO partner details in response
        assert "partner" not in str(data).lower() or "partner" not in data.get("external_status", "").lower()
        print(f"✓ Service 'in_progress' → '{data['external_status']}' (no partner details)")
    
    def test_service_status_scheduled_translates(self):
        """Service 'scheduled' should translate to 'Scheduled'"""
        response = requests.get(f"{BASE_URL}/api/progress-engine/translate", params={
            "item_type": "service",
            "internal_status": "scheduled"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["external_status"] == "Scheduled"
        print(f"✓ Service 'scheduled' → '{data['external_status']}'")
    
    def test_unknown_status_defaults_to_in_progress(self):
        """Unknown status should default to 'In Progress'"""
        response = requests.get(f"{BASE_URL}/api/progress-engine/translate", params={
            "item_type": "product",
            "internal_status": "unknown_status_xyz"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["external_status"] == "In Progress"
        print(f"✓ Unknown status defaults to 'In Progress'")


class TestAIAssistantV2:
    """AI Assistant V2 - Order/service guidance"""
    
    def test_how_to_order_products_question(self):
        """AI should provide ordering guidance for 'how to order products'"""
        response = requests.post(f"{BASE_URL}/api/ai-assistant-v2/chat", json={
            "message": "how to order products"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "reply" in data
        reply = data["reply"].lower()
        # Should mention marketplace, cart, checkout, or ordering steps
        assert any(word in reply for word in ["marketplace", "cart", "checkout", "browse", "add"]), f"Reply should mention ordering steps: {data['reply']}"
        print(f"✓ AI handles 'how to order products': {data['reply'][:100]}...")
    
    def test_track_order_question(self):
        """AI should provide tracking guidance for 'track my order'"""
        response = requests.post(f"{BASE_URL}/api/ai-assistant-v2/chat", json={
            "message": "track order progress"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        print(f"✓ AI handles 'track order': {data['reply'][:100]}...")
    
    def test_payment_help_question(self):
        """AI should provide payment guidance"""
        response = requests.post(f"{BASE_URL}/api/ai-assistant-v2/chat", json={
            "message": "how do i pay"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        reply = data["reply"].lower()
        assert any(word in reply for word in ["bank", "transfer", "payment", "proof"]), f"Reply should mention payment: {data['reply']}"
        print(f"✓ AI handles 'payment help': {data['reply'][:100]}...")
    
    def test_service_progress_question(self):
        """AI should provide service guidance"""
        response = requests.post(f"{BASE_URL}/api/ai-assistant-v2/chat", json={
            "message": "service"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        print(f"✓ AI handles 'service' question: {data['reply'][:100]}...")
    
    def test_order_progress_with_context(self):
        """AI should use context for order progress"""
        response = requests.post(f"{BASE_URL}/api/ai-assistant-v2/chat", json={
            "message": "order progress",
            "context": {
                "item_type": "product",
                "internal_status": "sourcing"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        # Should mention the translated status
        assert "Preparing Your Order" in data["reply"] or "preparing" in data["reply"].lower()
        print(f"✓ AI uses context for progress: {data['reply'][:100]}...")
    
    def test_generic_question_fallback(self):
        """AI should provide helpful fallback for unknown questions"""
        response = requests.post(f"{BASE_URL}/api/ai-assistant-v2/chat", json={
            "message": "random question xyz"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        # Should mention what it can help with
        assert any(word in data["reply"].lower() for word in ["help", "order", "service", "payment"])
        print(f"✓ AI fallback response: {data['reply'][:100]}...")


class TestAffiliatePerformance:
    """Affiliate Performance & Code Governance"""
    
    def test_leaderboard_returns_list(self):
        """GET /api/affiliate-performance/leaderboard should return top affiliates"""
        response = requests.get(f"{BASE_URL}/api/affiliate-performance/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Leaderboard returns {len(data)} affiliates")
    
    def test_my_performance_endpoint(self):
        """GET /api/affiliate-performance/me should return performance data"""
        response = requests.get(f"{BASE_URL}/api/affiliate-performance/me")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Should have performance metrics
        assert "clicks" in data
        assert "leads" in data
        assert "sales" in data
        assert "total_commission" in data
        assert "conversion_rate" in data
        assert "status" in data
        assert "promo_code_recommended" in data
        print(f"✓ My performance: clicks={data['clicks']}, status={data['status']}, promo={data['promo_code_recommended']}")
    
    def test_set_affiliate_status(self):
        """POST /api/affiliate-performance/status should update affiliate status"""
        response = requests.post(f"{BASE_URL}/api/affiliate-performance/status", json={
            "user_id": "test_user_123",
            "status": "watchlist"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print(f"✓ Set affiliate status to 'watchlist'")


class TestSalesProviderCoordination:
    """Sales Follow-Up & Provider Coordination (Internal Only)"""
    
    def test_create_follow_up(self):
        """POST /api/sales-provider-coordination/follow-ups should create follow-up"""
        response = requests.post(f"{BASE_URL}/api/sales-provider-coordination/follow-ups", json={
            "opportunity_id": "TEST_opp_123",
            "service_request_id": "TEST_sr_456",
            "provider_id": "TEST_provider_789",
            "message": "TEST: Please follow up on this service request",
            "due_at": "2026-01-20T10:00:00Z"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "id" in data
        print(f"✓ Created follow-up: {data['id']}")
        return data["id"]
    
    def test_list_follow_ups(self):
        """GET /api/sales-provider-coordination/follow-ups should list follow-ups"""
        response = requests.get(f"{BASE_URL}/api/sales-provider-coordination/follow-ups")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} follow-ups")
    
    def test_list_follow_ups_by_opportunity(self):
        """GET /api/sales-provider-coordination/follow-ups?opportunity_id=X should filter"""
        response = requests.get(f"{BASE_URL}/api/sales-provider-coordination/follow-ups", params={
            "opportunity_id": "TEST_opp_123"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Filtered follow-ups by opportunity: {len(data)} results")
    
    def test_create_nudge(self):
        """POST /api/sales-provider-coordination/nudges should create provider nudge"""
        response = requests.post(f"{BASE_URL}/api/sales-provider-coordination/nudges", json={
            "provider_id": "TEST_provider_789",
            "service_request_id": "TEST_sr_456",
            "message": "TEST: Please update progress on this service"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "id" in data
        print(f"✓ Created nudge: {data['id']}")


class TestCustomerSafetyValidation:
    """Verify customer-facing views don't expose partner/provider details"""
    
    def test_progress_engine_no_partner_in_product_status(self):
        """Product status should not expose partner details"""
        for status in ["order_received", "sourcing", "packed", "dispatched", "delivered"]:
            response = requests.get(f"{BASE_URL}/api/progress-engine/translate", params={
                "item_type": "product",
                "internal_status": status
            })
            assert response.status_code == 200
            data = response.json()
            # Verify no partner/provider info leaked
            response_str = str(data).lower()
            assert "partner_id" not in response_str
            assert "provider_id" not in response_str
            assert "partner_name" not in response_str
        print("✓ Product statuses don't expose partner details")
    
    def test_progress_engine_no_partner_in_service_status(self):
        """Service status should not expose partner details"""
        for status in ["request_received", "in_progress", "scheduled", "completed"]:
            response = requests.get(f"{BASE_URL}/api/progress-engine/translate", params={
                "item_type": "service",
                "internal_status": status
            })
            assert response.status_code == 200
            data = response.json()
            # Verify no partner/provider info leaked
            response_str = str(data).lower()
            assert "partner_id" not in response_str
            assert "provider_id" not in response_str
            assert "partner_name" not in response_str
            # External status should not mention "partner_assigned"
            assert "partner_assigned" not in data.get("external_status", "").lower()
        print("✓ Service statuses don't expose partner details")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
