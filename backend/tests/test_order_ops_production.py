"""
Test Order Operations and Production Queue APIs
- Order Operations: list, get, status update, reserve inventory, assign task, send to production
- Production Queue: list, get, status update (syncs to order), stats
- Document Send: email stubs for quote/invoice/order confirmation
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrderOperationsAPI:
    """Tests for Order Operations endpoints at /api/admin/orders-ops"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get test order and inventory item"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_list_orders(self):
        """GET /api/admin/orders-ops - List all orders"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ List orders: Found {len(data)} orders")
        
        # Store first order for subsequent tests
        if len(data) > 0:
            self.order = data[0]
            assert "id" in self.order, "Order should have id"
            assert "order_number" in self.order or "id" in self.order, "Order should have order_number or id"
            print(f"✓ First order: {self.order.get('order_number')} - Status: {self.order.get('status') or self.order.get('current_status')}")
    
    def test_list_orders_with_status_filter(self):
        """GET /api/admin/orders-ops?status=pending - List orders filtered by status"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders-ops", params={"status": "pending"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Filtered orders (pending): Found {len(data)} orders")
    
    def test_get_single_order(self):
        """GET /api/admin/orders-ops/{id} - Get single order by ID"""
        # First get list to find an order
        list_resp = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        orders = list_resp.json()
        
        if len(orders) == 0:
            pytest.skip("No orders to test")
        
        order_id = orders[0]["id"]
        response = self.session.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == order_id, "Order ID should match"
        assert "order_number" in data or "id" in data, "Order should have order_number"
        print(f"✓ Get single order: {data.get('order_number')} - Customer: {data.get('customer_name')}")
    
    def test_get_nonexistent_order_returns_404(self):
        """GET /api/admin/orders-ops/{invalid_id} - Should return 404"""
        fake_id = "000000000000000000000000"  # Valid ObjectId format but doesn't exist
        response = self.session.get(f"{BASE_URL}/api/admin/orders-ops/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent order returns 404")
    
    def test_update_order_status(self):
        """PATCH /api/admin/orders-ops/{id}/status - Update order status with history"""
        # First get list to find an order
        list_resp = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        orders = list_resp.json()
        
        if len(orders) == 0:
            pytest.skip("No orders to test")
        
        order_id = orders[0]["id"]
        original_status = orders[0].get("status") or orders[0].get("current_status") or "pending"
        
        # Update status to 'in_review' with note
        new_status = "in_review" if original_status != "in_review" else "confirmed"
        response = self.session.patch(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}/status",
            params={"status": new_status, "note": "Test status update from pytest"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == new_status or data.get("current_status") == new_status, \
            f"Status should be {new_status}, got {data.get('status')}"
        
        # Verify history was updated
        history = data.get("status_history", [])
        assert len(history) > 0, "Status history should exist"
        latest = history[-1]
        assert latest.get("status") == new_status, "Latest history should have new status"
        print(f"✓ Updated order status: {original_status} → {new_status}")
        
        # Restore original status
        self.session.patch(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}/status",
            params={"status": original_status, "note": "Restored after test"}
        )


class TestInventoryReservation:
    """Tests for inventory reservation from orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_reserve_inventory_success(self):
        """POST /api/admin/orders-ops/reserve-inventory - Reserve inventory for order"""
        # Get orders
        orders_resp = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        orders = orders_resp.json()
        
        if len(orders) == 0:
            pytest.skip("No orders to test")
        
        # Get inventory items
        inv_resp = self.session.get(f"{BASE_URL}/api/admin/inventory/items")
        items = inv_resp.json()
        
        if len(items) == 0:
            pytest.skip("No inventory items to test")
        
        order_id = orders[0]["id"]
        sku = items[0]["sku"]
        
        # Reserve 1 unit
        payload = {
            "order_id": order_id,
            "items": [{"sku": sku, "quantity": 1}]
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/orders-ops/reserve-inventory", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "reservations" in data, "Response should have reservations"
        assert len(data["reservations"]) > 0, "Should have at least one reservation"
        print(f"✓ Reserved inventory: {data['reservations'][0]}")
    
    def test_reserve_inventory_invalid_order(self):
        """POST /api/admin/orders-ops/reserve-inventory - Should fail with invalid order"""
        payload = {
            "order_id": "000000000000000000000000",
            "items": [{"sku": "TEST-SKU", "quantity": 1}]
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/orders-ops/reserve-inventory", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid order returns 404 for reservation")
    
    def test_reserve_inventory_invalid_sku(self):
        """POST /api/admin/orders-ops/reserve-inventory - Should fail with invalid SKU"""
        # Get orders
        orders_resp = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        orders = orders_resp.json()
        
        if len(orders) == 0:
            pytest.skip("No orders to test")
        
        payload = {
            "order_id": orders[0]["id"],
            "items": [{"sku": "NONEXISTENT-SKU-12345", "quantity": 1}]
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/orders-ops/reserve-inventory", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid SKU returns 404 for reservation")


class TestAssignOrderTask:
    """Tests for task assignment from orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_assign_task_success(self):
        """POST /api/admin/orders-ops/assign-task - Create task linked to order"""
        # Get orders
        orders_resp = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        orders = orders_resp.json()
        
        if len(orders) == 0:
            pytest.skip("No orders to test")
        
        order_id = orders[0]["id"]
        unique_id = str(uuid.uuid4())[:6]
        
        payload = {
            "order_id": order_id,
            "title": f"TEST Task {unique_id}",
            "description": "Test task description from pytest",
            "assigned_to": "Test User",
            "department": "Production",
            "priority": "high"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/orders-ops/assign-task", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have id"
        assert data["title"] == payload["title"], "Title should match"
        assert data["related_type"] == "order", "Related type should be 'order'"
        assert data["related_id"] == order_id, "Related ID should match order"
        assert data["priority"] == "high", "Priority should be high"
        print(f"✓ Created task linked to order: {data['title']}")
    
    def test_assign_task_invalid_order(self):
        """POST /api/admin/orders-ops/assign-task - Should fail with invalid order"""
        payload = {
            "order_id": "000000000000000000000000",
            "title": "Test Task",
            "priority": "medium"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/orders-ops/assign-task", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid order returns 404 for task assignment")


class TestSendToProduction:
    """Tests for sending orders to production queue"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_send_to_production_success(self):
        """POST /api/admin/orders-ops/send-to-production - Add order to production queue"""
        # Get orders
        orders_resp = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        orders = orders_resp.json()
        
        if len(orders) == 0:
            pytest.skip("No orders to test")
        
        # Find an order not already in production (or use an order that isn't completed in production)
        order = orders[-1]  # Use last order
        order_id = order["id"]
        unique_id = str(uuid.uuid4())[:6]
        
        payload = {
            "order_id": order_id,
            "order_number": f"ORD-TEST-{unique_id}",
            "customer_name": order.get("customer_name", "Test Customer"),
            "production_type": "embroidery",
            "assigned_to": "Production Team",
            "priority": "urgent",
            "notes": "Test production item from pytest",
            "status": "queued"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/orders-ops/send-to-production", json=payload)
        
        # Could be 200 (success) or 400 (already in production)
        if response.status_code == 400:
            assert "already in production" in response.json().get("detail", "").lower(), \
                "400 should indicate already in production"
            print(f"✓ Order already in production queue (expected)")
        else:
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            assert "id" in data, "Response should have id"
            assert data["production_type"] == "embroidery", "Production type should match"
            assert data["priority"] == "urgent", "Priority should be urgent"
            print(f"✓ Sent order to production: {data.get('order_number')}")
    
    def test_send_to_production_invalid_order(self):
        """POST /api/admin/orders-ops/send-to-production - Should fail with invalid order"""
        payload = {
            "order_id": "000000000000000000000000",
            "order_number": "ORD-INVALID",
            "customer_name": "Test",
            "production_type": "printing",
            "priority": "medium"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/orders-ops/send-to-production", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid order returns 404 for production")


class TestProductionQueue:
    """Tests for Production Queue endpoints at /api/admin/production"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_list_production_queue(self):
        """GET /api/admin/production/queue - List all production items"""
        response = self.session.get(f"{BASE_URL}/api/admin/production/queue")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Production queue: Found {len(data)} items")
        
        if len(data) > 0:
            item = data[0]
            assert "id" in item, "Item should have id"
            assert "status" in item, "Item should have status"
            assert "order_number" in item, "Item should have order_number"
            print(f"✓ First item: {item.get('order_number')} - Status: {item.get('status')}")
    
    def test_list_production_queue_filtered(self):
        """GET /api/admin/production/queue?status=in_progress - Filter by status"""
        response = self.session.get(f"{BASE_URL}/api/admin/production/queue", params={"status": "in_progress"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Verify all items have the filtered status
        for item in data:
            assert item.get("status") == "in_progress", f"Item should have in_progress status, got {item.get('status')}"
        print(f"✓ Filtered production queue (in_progress): Found {len(data)} items")
    
    def test_get_production_stats(self):
        """GET /api/admin/production/stats - Get production statistics"""
        response = self.session.get(f"{BASE_URL}/api/admin/production/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Stats should have total"
        assert "queued" in data, "Stats should have queued"
        assert "in_progress" in data, "Stats should have in_progress"
        assert "completed" in data, "Stats should have completed"
        assert "blocked" in data, "Stats should have blocked"
        
        assert isinstance(data["total"], int), "Total should be integer"
        print(f"✓ Production stats: Total={data['total']}, In Progress={data['in_progress']}, Completed={data['completed']}")
    
    def test_update_production_status(self):
        """PATCH /api/admin/production/queue/{id}/status - Update production status"""
        # Get queue items
        queue_resp = self.session.get(f"{BASE_URL}/api/admin/production/queue")
        items = queue_resp.json()
        
        if len(items) == 0:
            pytest.skip("No production items to test")
        
        queue_id = items[0]["id"]
        original_status = items[0]["status"]
        
        # Update to different status
        new_status = "quality_check" if original_status != "quality_check" else "in_progress"
        
        payload = {
            "status": new_status,
            "note": "Test status update from pytest"
        }
        
        response = self.session.patch(f"{BASE_URL}/api/admin/production/queue/{queue_id}/status", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == new_status, f"Status should be {new_status}, got {data['status']}"
        
        # Verify history was updated
        history = data.get("history", [])
        assert len(history) > 0, "History should exist"
        latest = history[-1]
        assert latest.get("status") == new_status, "Latest history should have new status"
        print(f"✓ Updated production status: {original_status} → {new_status}")
        
        # Verify order status was synced
        order_id = items[0].get("order_id")
        if order_id:
            order_resp = self.session.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}")
            if order_resp.status_code == 200:
                order_data = order_resp.json()
                # Production status maps to order status
                status_map = {
                    "queued": "in_production",
                    "assigned": "in_production",
                    "in_progress": "in_production",
                    "waiting_approval": "in_review",
                    "quality_check": "quality_check",
                    "completed": "ready_for_dispatch",
                    "blocked": "in_review",
                }
                expected_order_status = status_map.get(new_status, "in_production")
                actual_status = order_data.get("status") or order_data.get("current_status")
                assert actual_status == expected_order_status, \
                    f"Order status should be {expected_order_status}, got {actual_status}"
                print(f"✓ Order status synced: {expected_order_status}")
        
        # Restore original status
        self.session.patch(
            f"{BASE_URL}/api/admin/production/queue/{queue_id}/status",
            json={"status": original_status, "note": "Restored after test"}
        )
    
    def test_update_production_status_invalid_id(self):
        """PATCH /api/admin/production/queue/{invalid_id}/status - Should return 404"""
        payload = {"status": "in_progress"}
        response = self.session.patch(
            f"{BASE_URL}/api/admin/production/queue/000000000000000000000000/status",
            json=payload
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid production item returns 404")


class TestDocumentSend:
    """Tests for Document Send stubs at /api/admin/send"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_send_quote_stub(self):
        """POST /api/admin/send/quote/{id} - Quote send stub"""
        # Get quotes
        quotes_resp = self.session.get(f"{BASE_URL}/api/admin/quotes-v2")
        quotes = quotes_resp.json()
        
        if len(quotes) == 0:
            pytest.skip("No quotes to test")
        
        quote_id = quotes[0]["id"]
        
        response = self.session.post(f"{BASE_URL}/api/admin/send/quote/{quote_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "status" in data, "Response should have status"
        assert data["status"] == "pending_email_integration", "Status should indicate stub"
        print(f"✓ Quote send stub: {data.get('quote_number')} - {data['status']}")
    
    def test_send_invoice_stub(self):
        """POST /api/admin/send/invoice/{id} - Invoice send stub"""
        # Get invoices
        invoices_resp = self.session.get(f"{BASE_URL}/api/admin/invoices-v2")
        invoices = invoices_resp.json()
        
        if len(invoices) == 0:
            pytest.skip("No invoices to test")
        
        invoice_id = invoices[0]["id"]
        
        response = self.session.post(f"{BASE_URL}/api/admin/send/invoice/{invoice_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "status" in data, "Response should have status"
        assert data["status"] == "pending_email_integration", "Status should indicate stub"
        print(f"✓ Invoice send stub: {data.get('invoice_number')} - {data['status']}")
    
    def test_send_order_confirmation_stub(self):
        """POST /api/admin/send/order/{id}/confirmation - Order confirmation send stub"""
        # Get orders
        orders_resp = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        orders = orders_resp.json()
        
        if len(orders) == 0:
            pytest.skip("No orders to test")
        
        order_id = orders[0]["id"]
        
        response = self.session.post(f"{BASE_URL}/api/admin/send/order/{order_id}/confirmation")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "status" in data, "Response should have status"
        assert data["status"] == "pending_email_integration", "Status should indicate stub"
        print(f"✓ Order confirmation stub: {data.get('order_number')} - {data['status']}")
    
    def test_send_quote_invalid_id(self):
        """POST /api/admin/send/quote/{invalid_id} - Should return 404"""
        response = self.session.post(f"{BASE_URL}/api/admin/send/quote/000000000000000000000000")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid quote returns 404 for send")
    
    def test_send_invoice_invalid_id(self):
        """POST /api/admin/send/invoice/{invalid_id} - Should return 404"""
        response = self.session.post(f"{BASE_URL}/api/admin/send/invoice/000000000000000000000000")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid invoice returns 404 for send")


class TestFullOrderOperationsWorkflow:
    """End-to-end test of order operations workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_complete_workflow(self):
        """Test full workflow: List orders → Update status → Send to production → Update production"""
        # Step 1: Get orders
        orders_resp = self.session.get(f"{BASE_URL}/api/admin/orders-ops")
        assert orders_resp.status_code == 200
        orders = orders_resp.json()
        print(f"✓ Step 1: Listed {len(orders)} orders")
        
        if len(orders) == 0:
            pytest.skip("No orders for workflow test")
        
        order = orders[0]
        order_id = order["id"]
        
        # Step 2: Update order status to confirmed
        status_resp = self.session.patch(
            f"{BASE_URL}/api/admin/orders-ops/{order_id}/status",
            params={"status": "confirmed", "note": "Workflow test - confirmed"}
        )
        assert status_resp.status_code == 200
        print(f"✓ Step 2: Updated order status to confirmed")
        
        # Step 3: Get production stats before
        stats_before = self.session.get(f"{BASE_URL}/api/admin/production/stats").json()
        print(f"✓ Step 3: Production stats before - Total: {stats_before['total']}")
        
        # Step 4: Try to send to production
        unique_id = str(uuid.uuid4())[:6]
        production_payload = {
            "order_id": order_id,
            "order_number": f"ORD-WORKFLOW-{unique_id}",
            "customer_name": order.get("customer_name", "Test Customer"),
            "production_type": "printing",
            "assigned_to": "Workflow Test",
            "priority": "high",
            "notes": "Created during workflow test",
            "status": "queued"
        }
        
        prod_resp = self.session.post(f"{BASE_URL}/api/admin/orders-ops/send-to-production", json=production_payload)
        if prod_resp.status_code == 200:
            prod_data = prod_resp.json()
            prod_id = prod_data["id"]
            print(f"✓ Step 4: Sent to production - ID: {prod_id}")
            
            # Step 5: Update production status
            update_resp = self.session.patch(
                f"{BASE_URL}/api/admin/production/queue/{prod_id}/status",
                json={"status": "in_progress", "note": "Workflow test - started"}
            )
            assert update_resp.status_code == 200
            print(f"✓ Step 5: Updated production status to in_progress")
            
            # Step 6: Verify order status synced
            order_resp = self.session.get(f"{BASE_URL}/api/admin/orders-ops/{order_id}")
            order_data = order_resp.json()
            assert order_data.get("status") == "in_production" or order_data.get("current_status") == "in_production"
            print(f"✓ Step 6: Order status synced to in_production")
            
            # Step 7: Get production stats after
            stats_after = self.session.get(f"{BASE_URL}/api/admin/production/stats").json()
            print(f"✓ Step 7: Production stats after - Total: {stats_after['total']}, In Progress: {stats_after['in_progress']}")
        else:
            # Order already in production
            assert prod_resp.status_code == 400
            print(f"✓ Step 4: Order already in production (expected)")
            
            # Get current production item for this order
            queue_resp = self.session.get(f"{BASE_URL}/api/admin/production/queue")
            queue_items = queue_resp.json()
            for item in queue_items:
                if item.get("order_id") == order_id:
                    # Update its status
                    update_resp = self.session.patch(
                        f"{BASE_URL}/api/admin/production/queue/{item['id']}/status",
                        json={"status": "quality_check", "note": "Workflow test - quality check"}
                    )
                    assert update_resp.status_code == 200
                    print(f"✓ Step 5-7: Updated existing production item to quality_check")
                    break
        
        print("✓ Full workflow test completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
