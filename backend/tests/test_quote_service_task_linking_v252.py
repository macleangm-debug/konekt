"""
Test Suite: Quote ↔ Service Task Auto-Linking (v252)
Tests the complete flow of:
1. Creating service tasks from quote lines
2. Partner cost submission with pricing engine
3. Quote line auto-update with selling price
4. Duplicate task prevention
5. Partner data isolation (no selling_price/margin in partner response)
6. Admin visibility of both costs
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"

# Known test data from previous iterations
DEMO_PARTNER_ID = "69b827eae21f56c57362c6b7"


class TestQuoteServiceTaskLinking:
    """Tests for Quote ↔ Service Task auto-linking feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth tokens"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Get admin token
        admin_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_login.status_code == 200:
            self.admin_token = admin_login.json().get("token")
        else:
            pytest.skip(f"Admin login failed: {admin_login.status_code}")
        
        # Get partner token
        partner_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if partner_login.status_code == 200:
            self.partner_token = partner_login.json().get("token")
        else:
            pytest.skip(f"Partner login failed: {partner_login.status_code}")
    
    def test_api_health(self):
        """Verify API is accessible"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("API health check passed")
    
    # ─────────────────────────────────────────────────────────────
    # QUOTE CREATION WITH SERVICE LINES
    # ─────────────────────────────────────────────────────────────
    
    def test_create_quote_with_service_lines(self):
        """Create a quote with service-type line items"""
        quote_payload = {
            "customer_name": "Test Customer V252",
            "customer_email": "test.v252@example.com",
            "customer_phone": "+255712345678",
            "delivery_address": "123 Test Street, Dar es Salaam",
            "contact_person": "John Test",
            "contact_phone": "+255712345678",
            "currency": "TZS",
            "line_items": [
                {
                    "name": "Branding Service",
                    "description": "Logo design and brand identity",
                    "type": "service",
                    "service_type": "branding",
                    "quantity": 1,
                    "unit_price": 100000,
                    "total": 100000
                },
                {
                    "name": "Product Item",
                    "description": "Physical product",
                    "type": "product",
                    "quantity": 10,
                    "unit_price": 5000,
                    "total": 50000
                },
                {
                    "name": "Logistics Service",
                    "description": "Delivery to customer",
                    "type": "logistics",
                    "service_type": "delivery",
                    "quantity": 1,
                    "unit_price": 25000,
                    "total": 25000
                }
            ],
            "subtotal": 175000,
            "tax": 0,
            "discount": 0,
            "total": 175000,
            "notes": "Test quote for v252 testing"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/quotes-v2",
            json=quote_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create quote: {response.text}"
        data = response.json()
        
        assert "id" in data, "Quote should have an ID"
        assert "quote_number" in data, "Quote should have a quote_number"
        assert data["customer_name"] == "Test Customer V252"
        
        # Store for subsequent tests
        self.test_quote_id = data["id"]
        self.test_quote_number = data["quote_number"]
        print(f"Created test quote: {self.test_quote_number} (ID: {self.test_quote_id})")
        
        return data
    
    # ─────────────────────────────────────────────────────────────
    # SERVICE TASK CREATION FROM QUOTE LINE
    # ─────────────────────────────────────────────────────────────
    
    def test_create_task_from_service_line(self):
        """Create a service task from a service-type quote line"""
        # First create a quote
        quote = self.test_create_quote_with_service_lines()
        quote_id = quote["id"]
        
        # Create task from line 0 (service line)
        task_payload = {
            "quote_id": quote_id,
            "line_index": 0,
            "partner_id": DEMO_PARTNER_ID,
            "partner_name": "Demo Partner"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/service-tasks/from-quote-line",
            json=task_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create task: {response.text}"
        task = response.json()
        
        # Verify task structure
        assert "id" in task, "Task should have an ID"
        assert task["quote_id"] == quote_id, "Task should be linked to quote"
        assert task["quote_line_index"] == 0, "Task should reference line index 0"
        assert task["service_type"] == "branding", "Task should inherit service_type from line"
        assert task["partner_id"] == DEMO_PARTNER_ID, "Task should be assigned to partner"
        assert task["status"] == "assigned", "Task should be in assigned status"
        
        print(f"Created task from quote line: {task['id']}")
        return task, quote_id
    
    def test_reject_task_from_product_line(self):
        """Verify that product-type lines cannot create tasks"""
        quote = self.test_create_quote_with_service_lines()
        quote_id = quote["id"]
        
        # Try to create task from line 1 (product line)
        task_payload = {
            "quote_id": quote_id,
            "line_index": 1  # Product line
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/service-tasks/from-quote-line",
            json=task_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 400, f"Should reject product line: {response.status_code}"
        error = response.json()
        assert "product" in error.get("detail", "").lower() or "service" in error.get("detail", "").lower()
        print("Correctly rejected task creation from product line")
    
    def test_prevent_duplicate_task(self):
        """Verify duplicate task prevention for same quote line"""
        task, quote_id = self.test_create_task_from_service_line()
        
        # Try to create another task for the same line
        task_payload = {
            "quote_id": quote_id,
            "line_index": 0
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/service-tasks/from-quote-line",
            json=task_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 409, f"Should return 409 for duplicate: {response.status_code}"
        error = response.json()
        assert "already exists" in error.get("detail", "").lower()
        print("Correctly prevented duplicate task creation")
    
    # ─────────────────────────────────────────────────────────────
    # PARTNER COST SUBMISSION & PRICING ENGINE
    # ─────────────────────────────────────────────────────────────
    
    def test_partner_submit_cost_and_pricing_engine(self):
        """Test partner cost submission triggers pricing engine and quote update"""
        task, quote_id = self.test_create_task_from_service_line()
        task_id = task["id"]
        
        # Partner submits cost
        cost_payload = {
            "cost": 50000,
            "notes": "Test cost submission v252"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/partner-portal/assigned-work/{task_id}/submit-cost",
            json=cost_payload,
            headers={"Authorization": f"Bearer {self.partner_token}"}
        )
        
        assert response.status_code == 200, f"Failed to submit cost: {response.text}"
        result = response.json()
        
        # Verify partner response does NOT contain selling_price or margin
        assert "selling_price" not in result, "Partner should NOT see selling_price"
        assert "margin_pct" not in result, "Partner should NOT see margin_pct"
        assert "margin_amount" not in result, "Partner should NOT see margin_amount"
        
        # Verify partner sees their cost
        assert result["partner_cost"] == 50000, "Partner should see their submitted cost"
        assert result["status"] == "cost_submitted"
        assert result["quote_updated"] == True, "Quote should be updated"
        
        print("Partner cost submission successful, pricing engine triggered")
        return task_id, quote_id
    
    def test_partner_data_isolation(self):
        """Verify partner cannot see selling_price or margin in their work list"""
        # Get partner's assigned work
        response = self.session.get(
            f"{BASE_URL}/api/partner-portal/assigned-work",
            headers={"Authorization": f"Bearer {self.partner_token}"}
        )
        
        assert response.status_code == 200
        tasks = response.json()
        
        for task in tasks:
            # Partner should see partner_cost but NOT selling_price/margin
            assert "selling_price" not in task, f"Task {task.get('id')} should not expose selling_price"
            assert "margin_pct" not in task, f"Task {task.get('id')} should not expose margin_pct"
            assert "margin_amount" not in task, f"Task {task.get('id')} should not expose margin_amount"
        
        print(f"Partner data isolation verified for {len(tasks)} tasks")
    
    # ─────────────────────────────────────────────────────────────
    # QUOTE LINE TRACEABILITY & TOTALS
    # ─────────────────────────────────────────────────────────────
    
    def test_quote_line_traceability_after_cost(self):
        """Verify quote line has service_task_id and cost_source markers after cost submission"""
        task_id, quote_id = self.test_partner_submit_cost_and_pricing_engine()
        
        # Fetch the quote
        response = self.session.get(
            f"{BASE_URL}/api/admin/quotes-v2/{quote_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to fetch quote: {response.text}"
        quote = response.json()
        
        items = quote.get("line_items") or quote.get("items") or []
        assert len(items) >= 1, "Quote should have items"
        
        service_line = items[0]
        
        # Verify traceability markers
        assert service_line.get("service_task_id") == task_id, "Line should have service_task_id"
        assert service_line.get("cost_source") == "partner_submitted", "Line should have cost_source=partner_submitted"
        
        # Verify pricing was applied (30% margin on 50000 = 65000)
        assert service_line.get("effective_cost") == 50000, "Line should have effective_cost from partner"
        assert service_line.get("unit_price") == 65000, "Line should have unit_price with margin applied"
        
        print(f"Quote line traceability verified: task_id={task_id}, cost_source=partner_submitted")
        return quote
    
    def test_quote_totals_recalculation(self):
        """Verify quote subtotal and total are recalculated after cost propagation"""
        quote = self.test_quote_line_traceability_after_cost()
        
        items = quote.get("line_items") or quote.get("items") or []
        
        # Calculate expected subtotal
        expected_subtotal = sum(float(item.get("total", 0) or 0) for item in items)
        
        # Verify subtotal matches
        actual_subtotal = float(quote.get("subtotal", 0) or 0)
        assert abs(actual_subtotal - expected_subtotal) < 1, f"Subtotal mismatch: expected {expected_subtotal}, got {actual_subtotal}"
        
        # Verify total = subtotal + tax - discount
        tax = float(quote.get("tax", 0) or 0)
        discount = float(quote.get("discount", 0) or 0)
        expected_total = expected_subtotal + tax - discount
        actual_total = float(quote.get("total", 0) or 0)
        
        assert abs(actual_total - expected_total) < 1, f"Total mismatch: expected {expected_total}, got {actual_total}"
        
        print(f"Quote totals verified: subtotal={actual_subtotal}, total={actual_total}")
    
    # ─────────────────────────────────────────────────────────────
    # ADMIN VISIBILITY
    # ─────────────────────────────────────────────────────────────
    
    def test_admin_sees_both_costs(self):
        """Verify admin can see both partner_cost and selling_price"""
        task_id, quote_id = self.test_partner_submit_cost_and_pricing_engine()
        
        # Get task details as admin
        response = self.session.get(
            f"{BASE_URL}/api/admin/service-tasks/{task_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get task: {response.text}"
        task = response.json()
        
        # Admin should see all cost fields
        assert task.get("partner_cost") == 50000, "Admin should see partner_cost"
        assert task.get("selling_price") == 65000, "Admin should see selling_price (50000 * 1.3)"
        assert task.get("margin_pct") == 30, "Admin should see margin_pct"
        assert task.get("margin_amount") == 15000, "Admin should see margin_amount"
        
        print(f"Admin visibility verified: partner_cost={task['partner_cost']}, selling_price={task['selling_price']}")
    
    # ─────────────────────────────────────────────────────────────
    # LINKED TASKS ENDPOINT
    # ─────────────────────────────────────────────────────────────
    
    def test_get_linked_tasks(self):
        """Test GET /api/admin/quotes-v2/{quote_id}/linked-tasks endpoint"""
        task, quote_id = self.test_create_task_from_service_line()
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/linked-tasks",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get linked tasks: {response.text}"
        tasks = response.json()
        
        assert isinstance(tasks, list), "Should return a list"
        assert len(tasks) >= 1, "Should have at least one linked task"
        
        linked_task = tasks[0]
        assert "id" in linked_task
        assert "task_ref" in linked_task
        assert "quote_line_index" in linked_task
        assert "partner_name" in linked_task
        assert "status" in linked_task
        assert "created_at" in linked_task
        
        print(f"Linked tasks endpoint verified: {len(tasks)} tasks found")
    
    # ─────────────────────────────────────────────────────────────
    # SERVICE TASKS LIST & STATS
    # ─────────────────────────────────────────────────────────────
    
    def test_service_tasks_list(self):
        """Test GET /api/admin/service-tasks endpoint"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/service-tasks",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        tasks = response.json()
        assert isinstance(tasks, list)
        print(f"Service tasks list: {len(tasks)} tasks")
    
    def test_service_tasks_stats(self):
        """Test GET /api/admin/service-tasks/stats/summary endpoint"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/service-tasks/stats/summary",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        stats = response.json()
        
        # Verify expected fields
        assert "total" in stats
        assert "assigned" in stats or "unassigned" in stats
        
        print(f"Service tasks stats: total={stats.get('total')}")


class TestAdminPagesRegression:
    """Regression tests for Admin pages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        admin_login = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_login.status_code == 200:
            self.admin_token = admin_login.json().get("token")
        else:
            pytest.skip("Admin login failed")
    
    def test_admin_orders_list(self):
        """Verify Admin Orders page data is not blank"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        orders = data.get("orders") if isinstance(data, dict) else data
        
        if orders and len(orders) > 0:
            order = orders[0]
            # Verify order has required fields
            assert "order_number" in order or "id" in order
            print(f"Admin Orders: {len(orders)} orders found")
        else:
            print("Admin Orders: No orders in system (OK for fresh DB)")
    
    def test_admin_quotes_list(self):
        """Verify Admin Quotes page data"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/quotes-v2",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        quotes = response.json()
        
        if quotes and len(quotes) > 0:
            quote = quotes[0]
            assert "quote_number" in quote or "id" in quote
            print(f"Admin Quotes: {len(quotes)} quotes found")
        else:
            print("Admin Quotes: No quotes in system")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
