"""
Test Suite for List & Quote Catalog + Commercial Flow Correction (v319)
Features tested:
1. POST /api/public/quote-requests - multi-item quote requests with CRM + assignment
2. Quote approval flow: PATCH /api/admin/quotes-v2/{id}/status?status=approved → auto-generates Invoice + Order
3. Generated Order must have: current_status=pending_payment, payment_confirmed=false, fulfillment_locked=true
4. AI Assistant chat endpoint with page/role context
5. AI Assistant quick-actions endpoint with role-specific actions
"""
import pytest
import requests
import os
from uuid import uuid4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

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
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestPublicQuoteRequests:
    """Test POST /api/public/quote-requests endpoint"""
    
    def test_submit_quote_request_with_items(self):
        """Submit a quote request with structured items"""
        payload = {
            "items": [
                {
                    "product_id": f"test-prod-{uuid4().hex[:6]}",
                    "name": "Office Chair",
                    "quantity": 10,
                    "unit_of_measurement": "Piece",
                    "category": "Office Equipment",
                    "notes": "Ergonomic preferred"
                },
                {
                    "product_id": f"test-prod-{uuid4().hex[:6]}",
                    "name": "Standing Desk",
                    "quantity": 5,
                    "unit_of_measurement": "Piece",
                    "category": "Office Equipment",
                    "notes": ""
                }
            ],
            "custom_items": [],
            "category": "Office Equipment",
            "customer_note": "Need delivery within 2 weeks",
            "customer": {
                "first_name": "Test",
                "last_name": "Customer",
                "email": f"test_{uuid4().hex[:6]}@example.com",
                "phone": "+255712345678",
                "company": "Test Corp"
            },
            "source": "list_quote_catalog"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/quote-requests", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("ok") is True, "Response should have ok: true"
        assert "request_id" in data, "Response should include request_id"
        assert "message" in data, "Response should include message"
        
        print(f"✓ Quote request submitted: {data.get('request_id')}")
    
    def test_submit_quote_request_with_custom_items(self):
        """Submit a quote request with custom items"""
        payload = {
            "items": [],
            "custom_items": [
                {
                    "name": "Custom Branded Notebooks",
                    "quantity": 100,
                    "unit_of_measurement": "Piece",
                    "description": "A5 size, company logo on cover"
                },
                {
                    "name": "Custom Pens",
                    "quantity": 500,
                    "unit_of_measurement": "Piece",
                    "description": "Blue ink, branded"
                }
            ],
            "category": "Promotional Materials",
            "customer_note": "For company event",
            "customer": {
                "first_name": "Custom",
                "last_name": "Buyer",
                "email": f"custom_{uuid4().hex[:6]}@example.com",
                "phone": "+255787654321",
                "company": "Event Corp"
            },
            "source": "list_quote_catalog"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/quote-requests", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("ok") is True
        assert "request_id" in data
        
        print(f"✓ Custom items quote request submitted: {data.get('request_id')}")
    
    def test_submit_quote_request_mixed_items(self):
        """Submit a quote request with both catalog and custom items"""
        payload = {
            "items": [
                {
                    "product_id": f"test-prod-{uuid4().hex[:6]}",
                    "name": "Printer Paper",
                    "quantity": 50,
                    "unit_of_measurement": "Ream",
                    "category": "Printing & Stationery"
                }
            ],
            "custom_items": [
                {
                    "name": "Custom Letterhead",
                    "quantity": 1000,
                    "unit_of_measurement": "Piece",
                    "description": "Company letterhead design"
                }
            ],
            "category": "Printing & Stationery",
            "customer_note": "",
            "customer": {
                "first_name": "Mixed",
                "last_name": "Order",
                "email": f"mixed_{uuid4().hex[:6]}@example.com",
                "phone": "+255700000000",
                "company": ""
            },
            "source": "list_quote_catalog"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/quote-requests", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("ok") is True
        print(f"✓ Mixed items quote request submitted: {data.get('request_id')}")
    
    def test_submit_quote_request_empty_items_fails(self):
        """Submit a quote request with no items should fail"""
        payload = {
            "items": [],
            "custom_items": [],
            "category": "Office Equipment",
            "customer": {
                "first_name": "Empty",
                "last_name": "Cart",
                "email": "empty@example.com",
                "phone": "+255700000001"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/public/quote-requests", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for empty items, got {response.status_code}"
        print("✓ Empty items correctly rejected with 400")


class TestQuoteApprovalCommercialFlow:
    """Test Quote approval → auto-generate Invoice + Order flow"""
    
    def test_create_quote_and_approve(self, admin_headers):
        """Create a quote and approve it - should auto-generate Invoice + Order"""
        # Step 1: Create a quote
        quote_payload = {
            "customer_name": f"Test Customer {uuid4().hex[:6]}",
            "customer_email": f"quote_test_{uuid4().hex[:6]}@example.com",
            "customer_company": "Test Company Ltd",
            "customer_phone": "+255712345678",
            "line_items": [
                {
                    "description": "Office Supplies Bundle",
                    "quantity": 10,
                    "unit_price": 50000,
                    "total": 500000
                },
                {
                    "description": "Printing Services",
                    "quantity": 1,
                    "unit_price": 200000,
                    "total": 200000
                }
            ],
            "subtotal": 700000,
            "tax": 126000,
            "discount": 0,
            "total": 826000,
            "currency": "TZS",
            "notes": "Test quote for approval flow",
            "status": "draft"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/quotes-v2",
            json=quote_payload,
            headers=admin_headers
        )
        
        assert create_response.status_code == 200, f"Quote creation failed: {create_response.status_code} - {create_response.text}"
        quote_data = create_response.json()
        quote_id = quote_data.get("id")
        quote_number = quote_data.get("quote_number")
        
        assert quote_id, "Quote should have an ID"
        assert quote_number, "Quote should have a quote_number"
        print(f"✓ Quote created: {quote_number} (ID: {quote_id})")
        
        # Step 2: Approve the quote
        approve_response = requests.patch(
            f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=approved",
            headers=admin_headers
        )
        
        assert approve_response.status_code == 200, f"Quote approval failed: {approve_response.status_code} - {approve_response.text}"
        approve_data = approve_response.json()
        
        # Verify auto-generated documents
        assert approve_data.get("status") == "approved", "Quote status should be 'approved'"
        assert "generated_invoice" in approve_data, "Response should include generated_invoice"
        assert "generated_order" in approve_data, "Response should include generated_order"
        
        generated_invoice = approve_data.get("generated_invoice")
        generated_order = approve_data.get("generated_order")
        
        assert generated_invoice, f"generated_invoice should not be empty: {approve_data}"
        assert generated_order, f"generated_order should not be empty: {approve_data}"
        
        print(f"✓ Quote approved. Generated Invoice: {generated_invoice}, Order: {generated_order}")
        
        return {
            "quote_id": quote_id,
            "quote_number": quote_number,
            "invoice_number": generated_invoice,
            "order_number": generated_order
        }
    
    def test_generated_order_has_correct_status(self, admin_headers):
        """Verify the generated Order has correct pending_payment status and locks"""
        # Create and approve a quote first
        quote_payload = {
            "customer_name": f"Order Status Test {uuid4().hex[:6]}",
            "customer_email": f"order_status_{uuid4().hex[:6]}@example.com",
            "customer_company": "Status Test Corp",
            "customer_phone": "+255700000002",
            "line_items": [
                {
                    "description": "Test Item",
                    "quantity": 1,
                    "unit_price": 100000,
                    "total": 100000
                }
            ],
            "subtotal": 100000,
            "tax": 18000,
            "discount": 0,
            "total": 118000,
            "currency": "TZS",
            "status": "draft"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/quotes-v2",
            json=quote_payload,
            headers=admin_headers
        )
        assert create_response.status_code == 200
        quote_id = create_response.json().get("id")
        
        # Approve the quote
        approve_response = requests.patch(
            f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/status?status=approved",
            headers=admin_headers
        )
        assert approve_response.status_code == 200
        approve_data = approve_response.json()
        
        order_number = approve_data.get("generated_order")
        assert order_number, "Should have generated_order"
        
        # Fetch the order to verify its status - use search to find the specific order
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders?search={order_number}",
            headers=admin_headers
        )
        assert orders_response.status_code == 200
        orders_data = orders_response.json()
        
        # Handle both list and dict response formats
        if isinstance(orders_data, dict):
            orders = orders_data.get("orders", [])
        else:
            orders = orders_data
        
        # Find the generated order
        generated_order = None
        for order in orders:
            if isinstance(order, dict) and order.get("order_number") == order_number:
                generated_order = order
                break
        
        assert generated_order, f"Could not find order {order_number} in orders list"
        
        # Verify order status fields
        assert generated_order.get("current_status") == "pending_payment", \
            f"Order current_status should be 'pending_payment', got: {generated_order.get('current_status')}"
        
        assert generated_order.get("payment_confirmed") is False, \
            f"Order payment_confirmed should be False, got: {generated_order.get('payment_confirmed')}"
        
        assert generated_order.get("fulfillment_locked") is True, \
            f"Order fulfillment_locked should be True, got: {generated_order.get('fulfillment_locked')}"
        
        assert generated_order.get("commission_triggered") is False, \
            f"Order commission_triggered should be False, got: {generated_order.get('commission_triggered')}"
        
        print(f"✓ Order {order_number} has correct status: pending_payment, fulfillment_locked=True, payment_confirmed=False")


class TestAIAssistantEndpoints:
    """Test Mr. Konekt AI Assistant endpoints"""
    
    def test_chat_endpoint_basic(self):
        """Test POST /api/ai-assistant/chat with basic message"""
        payload = {
            "message": "How do I order products?",
            "page": "/marketplace",
            "role": "customer"
        }
        
        response = requests.post(f"{BASE_URL}/api/ai-assistant/chat", json=payload)
        
        assert response.status_code == 200, f"Chat endpoint failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "reply" in data, "Response should include 'reply'"
        assert len(data["reply"]) > 0, "Reply should not be empty"
        
        print(f"✓ AI Chat response received ({len(data['reply'])} chars)")
    
    def test_chat_endpoint_with_admin_context(self):
        """Test chat with admin page context"""
        payload = {
            "message": "What is this page?",
            "page": "/admin/crm",
            "role": "admin"
        }
        
        response = requests.post(f"{BASE_URL}/api/ai-assistant/chat", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "reply" in data
        # Should mention CRM context
        reply_lower = data["reply"].lower()
        assert "crm" in reply_lower or "lead" in reply_lower or "customer" in reply_lower, \
            f"Reply should be context-aware for CRM page: {data['reply'][:200]}"
        
        print("✓ AI Chat is context-aware for admin pages")
    
    def test_chat_endpoint_empty_message(self):
        """Test chat with empty message returns greeting"""
        payload = {
            "message": "",
            "page": "/admin",
            "role": "admin"
        }
        
        response = requests.post(f"{BASE_URL}/api/ai-assistant/chat", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "reply" in data
        # Should return a greeting
        reply_lower = data["reply"].lower()
        assert "hello" in reply_lower or "mr. konekt" in reply_lower or "help" in reply_lower, \
            f"Empty message should return greeting: {data['reply'][:200]}"
        
        print("✓ AI Chat returns greeting for empty message")
    
    def test_quick_actions_admin_role(self):
        """Test GET /api/ai-assistant/quick-actions?role=admin"""
        response = requests.get(f"{BASE_URL}/api/ai-assistant/quick-actions?role=admin")
        
        assert response.status_code == 200, f"Quick actions failed: {response.status_code}"
        data = response.json()
        
        assert "actions" in data, "Response should include 'actions'"
        actions = data["actions"]
        
        assert isinstance(actions, list), "Actions should be a list"
        assert len(actions) > 0, "Should have at least one action"
        
        # Each action should have label and value
        for action in actions:
            assert "label" in action, "Action should have 'label'"
            assert "value" in action, "Action should have 'value'"
        
        # Admin should have specific actions
        action_labels = [a["label"].lower() for a in actions]
        assert any("quote" in l for l in action_labels), "Admin should have quote-related action"
        
        print(f"✓ Admin quick actions: {[a['label'] for a in actions]}")
    
    def test_quick_actions_customer_role(self):
        """Test GET /api/ai-assistant/quick-actions?role=customer"""
        response = requests.get(f"{BASE_URL}/api/ai-assistant/quick-actions?role=customer")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "actions" in data
        actions = data["actions"]
        
        assert len(actions) > 0
        
        # Customer should have order/track related actions
        action_labels = [a["label"].lower() for a in actions]
        assert any("order" in l or "track" in l or "payment" in l for l in action_labels), \
            f"Customer should have order/track actions: {action_labels}"
        
        print(f"✓ Customer quick actions: {[a['label'] for a in actions]}")
    
    def test_quick_actions_sales_role(self):
        """Test GET /api/ai-assistant/quick-actions?role=sales"""
        response = requests.get(f"{BASE_URL}/api/ai-assistant/quick-actions?role=sales")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "actions" in data
        actions = data["actions"]
        
        assert len(actions) > 0
        
        print(f"✓ Sales quick actions: {[a['label'] for a in actions]}")


class TestSettingsHubSalesAssignment:
    """Test Settings Hub Sales Assignment Policy endpoint"""
    
    def test_get_settings_hub(self, admin_headers):
        """Test GET /api/admin/settings-hub returns sales assignment policy"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        
        assert response.status_code == 200, f"Settings hub failed: {response.status_code}"
        data = response.json()
        
        # Check if sales section exists with assignment_policy
        if "sales" in data:
            sales = data["sales"]
            if "assignment_policy" in sales:
                policy = sales["assignment_policy"]
                print(f"✓ Sales assignment policy found: {policy}")
                
                # Verify expected fields
                if "primary_strategy" in policy:
                    assert policy["primary_strategy"] in ["customer_ownership", "weighted_availability"], \
                        f"Invalid primary_strategy: {policy['primary_strategy']}"
                
                if "fallback_strategy" in policy:
                    assert policy["fallback_strategy"] in ["round_robin", "random"], \
                        f"Invalid fallback_strategy: {policy['fallback_strategy']}"
            else:
                print("⚠ assignment_policy not in sales section (may use defaults)")
        else:
            print("⚠ sales section not in settings (may use defaults)")
        
        print("✓ Settings hub endpoint accessible")
    
    def test_update_sales_assignment_policy(self, admin_headers):
        """Test updating sales assignment policy via PUT /api/admin/settings-hub"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update with new assignment policy
        updated_settings = current_settings.copy()
        if "sales" not in updated_settings:
            updated_settings["sales"] = {}
        
        updated_settings["sales"]["assignment_policy"] = {
            "primary_strategy": "customer_ownership",
            "fallback_strategy": "round_robin",
            "track_deal_source": True
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json=updated_settings,
            headers=admin_headers
        )
        
        assert put_response.status_code == 200, f"Settings update failed: {put_response.status_code} - {put_response.text}"
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert verify_response.status_code == 200
        verified = verify_response.json()
        
        if "sales" in verified and "assignment_policy" in verified["sales"]:
            policy = verified["sales"]["assignment_policy"]
            assert policy.get("primary_strategy") == "customer_ownership"
            assert policy.get("fallback_strategy") == "round_robin"
            print("✓ Sales assignment policy updated and verified")
        else:
            print("⚠ Could not verify assignment policy update")


class TestMarketplaceCheckoutAlignment:
    """Test marketplace checkout creates Invoice + Order"""
    
    def test_public_checkout_creates_invoice_and_order(self):
        """Test POST /api/public/checkout creates both Invoice and Order"""
        payload = {
            "items": [
                {
                    "product_id": f"test-{uuid4().hex[:6]}",
                    "product_name": "Test Product",
                    "quantity": 2,
                    "unit_price": 50000,
                    "price": 50000
                }
            ],
            "customer_name": f"Checkout Test {uuid4().hex[:6]}",
            "email": f"checkout_{uuid4().hex[:6]}@example.com",
            "phone": "+255700000003",
            "company_name": "Checkout Corp",
            "delivery_address": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/checkout", json=payload)
        
        assert response.status_code == 200, f"Checkout failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert data.get("ok") is True, "Checkout should return ok: true"
        assert "order_id" in data, "Should return order_id"
        assert "order_number" in data, "Should return order_number"
        assert "invoice_number" in data, "Should return invoice_number"
        
        print(f"✓ Checkout created Order: {data['order_number']}, Invoice: {data['invoice_number']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
