"""
Test Admin Business Operating System - CRM, Tasks, Inventory, Invoices, Quotes
This test suite covers the Admin Business OS features for Konekt B2B platform.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDashboardSummary:
    """Test Admin Dashboard Summary API"""
    
    def test_dashboard_summary_returns_all_metrics(self):
        """Dashboard summary should return all required metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify all required fields exist
        required_fields = ["orders", "leads", "open_tasks", "invoices", "low_stock_items"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["orders"], int)
        assert isinstance(data["leads"], int)
        assert isinstance(data["open_tasks"], int)
        assert isinstance(data["invoices"], int)
        assert isinstance(data["low_stock_items"], int)
        print(f"Dashboard summary: orders={data['orders']}, leads={data['leads']}, tasks={data['open_tasks']}, invoices={data['invoices']}, low_stock={data['low_stock_items']}")


class TestCRMLeads:
    """Test CRM Leads CRUD Operations"""
    
    @pytest.fixture
    def test_lead_id(self):
        """Create a test lead and return its ID, then clean up after test"""
        # Create lead
        lead_data = {
            "company_name": f"TEST_Company_{uuid.uuid4().hex[:6]}",
            "contact_name": "Test Contact",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+255123456789",
            "source": "Website",
            "industry": "Technology",
            "notes": "Test lead created by pytest",
            "status": "new",
            "assigned_to": "Sales Team",
            "estimated_value": 100000
        }
        response = requests.post(f"{BASE_URL}/api/admin/crm/leads", json=lead_data)
        assert response.status_code == 200, f"Failed to create test lead: {response.text}"
        lead_id = response.json()["id"]
        
        yield lead_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/crm/leads/{lead_id}")
    
    def test_create_lead(self):
        """Create a new CRM lead"""
        lead_data = {
            "company_name": f"TEST_NewCo_{uuid.uuid4().hex[:6]}",
            "contact_name": "John Doe",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+255987654321",
            "source": "Referral",
            "industry": "Manufacturing",
            "notes": "Created during test",
            "status": "new",
            "estimated_value": 50000
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/crm/leads", json=lead_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["company_name"] == lead_data["company_name"]
        assert data["contact_name"] == lead_data["contact_name"]
        assert data["email"] == lead_data["email"]
        assert data["status"] == "new"
        assert "id" in data
        print(f"Created lead: {data['id']} - {data['company_name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/crm/leads/{data['id']}")
    
    def test_list_leads(self):
        """List all CRM leads"""
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} leads")
    
    def test_list_leads_filter_by_status(self):
        """List leads filtered by status"""
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads", params={"status": "new"})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned leads should have status "new"
        for lead in data:
            assert lead["status"] == "new", f"Lead {lead['id']} has status {lead['status']}, expected 'new'"
        print(f"Found {len(data)} leads with status 'new'")
    
    def test_get_lead(self, test_lead_id):
        """Get a specific lead by ID"""
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads/{test_lead_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_lead_id
        print(f"Retrieved lead: {data['company_name']}")
    
    def test_update_lead_status(self, test_lead_id):
        """Update lead status"""
        new_status = "contacted"
        response = requests.patch(
            f"{BASE_URL}/api/admin/crm/leads/{test_lead_id}/status",
            params={"status": new_status}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == new_status
        print(f"Updated lead status to: {data['status']}")
        
        # Verify with GET
        verify_response = requests.get(f"{BASE_URL}/api/admin/crm/leads/{test_lead_id}")
        assert verify_response.json()["status"] == new_status
    
    def test_delete_lead(self):
        """Delete a lead"""
        # First create a lead to delete
        lead_data = {
            "company_name": f"TEST_DeleteMe_{uuid.uuid4().hex[:6]}",
            "contact_name": "Delete Test",
            "email": f"delete_{uuid.uuid4().hex[:6]}@example.com",
            "status": "new"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/crm/leads", json=lead_data)
        lead_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/admin/crm/leads/{lead_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/admin/crm/leads/{lead_id}")
        assert get_response.status_code == 404
        print(f"Successfully deleted lead: {lead_id}")


class TestTasks:
    """Test Task Management CRUD Operations"""
    
    @pytest.fixture
    def test_task_id(self):
        """Create a test task and return its ID"""
        task_data = {
            "title": f"TEST_Task_{uuid.uuid4().hex[:6]}",
            "description": "Test task created by pytest",
            "assigned_to": "Test User",
            "department": "Sales",
            "priority": "medium",
            "status": "todo"
        }
        response = requests.post(f"{BASE_URL}/api/admin/tasks", json=task_data)
        assert response.status_code == 200
        task_id = response.json()["id"]
        
        yield task_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/tasks/{task_id}")
    
    def test_create_task(self):
        """Create a new task"""
        task_data = {
            "title": f"TEST_NewTask_{uuid.uuid4().hex[:6]}",
            "description": "Task description here",
            "assigned_to": "Developer",
            "department": "Engineering",
            "priority": "high",
            "status": "todo"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/tasks", json=task_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == task_data["title"]
        assert data["priority"] == "high"
        assert data["status"] == "todo"
        assert "id" in data
        print(f"Created task: {data['id']} - {data['title']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/tasks/{data['id']}")
    
    def test_list_tasks(self):
        """List all tasks"""
        response = requests.get(f"{BASE_URL}/api/admin/tasks")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} tasks")
    
    def test_list_tasks_filter_by_status(self):
        """List tasks filtered by status"""
        response = requests.get(f"{BASE_URL}/api/admin/tasks", params={"status": "todo"})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for task in data:
            assert task["status"] == "todo"
        print(f"Found {len(data)} tasks with status 'todo'")
    
    def test_update_task_status(self, test_task_id):
        """Update task status"""
        new_status = "in_progress"
        response = requests.patch(
            f"{BASE_URL}/api/admin/tasks/{test_task_id}/status",
            params={"status": new_status}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == new_status
        print(f"Updated task status to: {data['status']}")
    
    def test_delete_task(self):
        """Delete a task"""
        # Create task to delete
        task_data = {
            "title": f"TEST_DeleteTask_{uuid.uuid4().hex[:6]}",
            "priority": "low",
            "status": "todo"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/tasks", json=task_data)
        task_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/admin/tasks/{task_id}")
        assert delete_response.status_code == 200
        
        print(f"Successfully deleted task: {task_id}")


class TestInventory:
    """Test Inventory Management Operations"""
    
    @pytest.fixture
    def test_inventory_item(self):
        """Create a test inventory item"""
        sku = f"TEST-SKU-{uuid.uuid4().hex[:6].upper()}"
        item_data = {
            "product_slug": f"test-product-{uuid.uuid4().hex[:6]}",
            "product_title": f"TEST Product {uuid.uuid4().hex[:4]}",
            "sku": sku,
            "category": "Test Category",
            "branch": "Test Branch",
            "quantity_on_hand": 100,
            "reorder_level": 10,
            "unit_cost": 5000,
            "location": "Warehouse A"
        }
        response = requests.post(f"{BASE_URL}/api/admin/inventory/items", json=item_data)
        assert response.status_code == 200, f"Failed to create item: {response.text}"
        
        yield response.json()
        
        # Note: No delete endpoint for inventory items, leave for now
    
    def test_create_inventory_item(self):
        """Create a new inventory item"""
        sku = f"TEST-NEW-{uuid.uuid4().hex[:6].upper()}"
        item_data = {
            "product_slug": f"new-test-product-{uuid.uuid4().hex[:6]}",
            "product_title": f"TEST New Product {uuid.uuid4().hex[:4]}",
            "sku": sku,
            "category": "Electronics",
            "branch": "Main Store",
            "quantity_on_hand": 50,
            "reorder_level": 5,
            "unit_cost": 10000,
            "location": "Shelf B3"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/inventory/items", json=item_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["sku"] == sku
        assert data["quantity_on_hand"] == 50
        assert "id" in data
        print(f"Created inventory item: {data['sku']} - {data['product_title']}")
    
    def test_create_inventory_item_duplicate_sku_fails(self, test_inventory_item):
        """Creating item with duplicate SKU should fail"""
        duplicate_data = {
            "product_slug": "duplicate-product",
            "product_title": "Duplicate",
            "sku": test_inventory_item["sku"],  # Same SKU
            "category": "Test",
            "branch": "Test",
            "quantity_on_hand": 10
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/inventory/items", json=duplicate_data)
        assert response.status_code == 400, "Duplicate SKU should return 400"
        print("Duplicate SKU correctly rejected")
    
    def test_list_inventory_items(self):
        """List all inventory items"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory/items")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} inventory items")
    
    def test_get_inventory_item(self, test_inventory_item):
        """Get a specific inventory item"""
        item_id = test_inventory_item["id"]
        response = requests.get(f"{BASE_URL}/api/admin/inventory/items/{item_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == item_id
        print(f"Retrieved item: {data['sku']}")
    
    def test_create_stock_movement_in(self, test_inventory_item):
        """Create stock IN movement"""
        movement_data = {
            "sku": test_inventory_item["sku"],
            "movement_type": "in",
            "quantity": 20,
            "note": "Test stock in"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/inventory/movements", json=movement_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["movement_type"] == "in"
        assert data["new_qty"] == test_inventory_item["quantity_on_hand"] + 20
        print(f"Stock IN: {data['previous_qty']} -> {data['new_qty']}")
    
    def test_create_stock_movement_out(self, test_inventory_item):
        """Create stock OUT movement"""
        movement_data = {
            "sku": test_inventory_item["sku"],
            "movement_type": "out",
            "quantity": 10,
            "note": "Test stock out"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/inventory/movements", json=movement_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["movement_type"] == "out"
        print(f"Stock OUT: {data['previous_qty']} -> {data['new_qty']}")
    
    def test_create_stock_movement_adjustment(self, test_inventory_item):
        """Create stock ADJUSTMENT movement"""
        movement_data = {
            "sku": test_inventory_item["sku"],
            "movement_type": "adjustment",
            "quantity": 75,
            "note": "Physical count adjustment"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/inventory/movements", json=movement_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["movement_type"] == "adjustment"
        assert data["new_qty"] == 75
        print(f"Stock ADJUSTMENT to: {data['new_qty']}")
    
    def test_list_stock_movements(self):
        """List stock movements"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory/movements")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} stock movements")
    
    def test_get_low_stock_items(self):
        """Get low stock items"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory/low-stock")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} low stock items")


class TestInvoices:
    """Test Invoice Management CRUD Operations"""
    
    @pytest.fixture
    def test_invoice_id(self):
        """Create a test invoice"""
        invoice_data = {
            "customer_name": f"TEST Customer {uuid.uuid4().hex[:6]}",
            "customer_email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "customer_company": "TEST Company",
            "currency": "TZS",
            "line_items": [
                {"description": "Test Item 1", "quantity": 2, "unit_price": 5000, "total": 10000},
                {"description": "Test Item 2", "quantity": 1, "unit_price": 15000, "total": 15000}
            ],
            "subtotal": 25000,
            "tax": 4500,
            "discount": 0,
            "total": 29500
        }
        response = requests.post(f"{BASE_URL}/api/admin/invoices", json=invoice_data)
        assert response.status_code == 200
        
        yield response.json()["id"]
    
    def test_create_invoice(self):
        """Create a new invoice"""
        invoice_data = {
            "customer_name": f"TEST NewCustomer {uuid.uuid4().hex[:6]}",
            "customer_email": f"new_{uuid.uuid4().hex[:6]}@example.com",
            "customer_company": "NEW Test Corp",
            "currency": "TZS",
            "line_items": [
                {"description": "Product A", "quantity": 5, "unit_price": 2000, "total": 10000}
            ],
            "subtotal": 10000,
            "tax": 1800,
            "discount": 500,
            "total": 11300
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/invoices", json=invoice_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer_name"] == invoice_data["customer_name"]
        assert data["total"] == 11300
        assert "invoice_number" in data
        assert data["invoice_number"].startswith("INV-")
        print(f"Created invoice: {data['invoice_number']} - Total: TZS {data['total']}")
    
    def test_list_invoices(self):
        """List all invoices"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} invoices")
    
    def test_list_invoices_filter_by_status(self):
        """List invoices filtered by status"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices", params={"status": "draft"})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for inv in data:
            assert inv["status"] == "draft"
        print(f"Found {len(data)} draft invoices")
    
    def test_get_invoice(self, test_invoice_id):
        """Get a specific invoice"""
        response = requests.get(f"{BASE_URL}/api/admin/invoices/{test_invoice_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_invoice_id
        print(f"Retrieved invoice: {data['invoice_number']}")
    
    def test_update_invoice_status(self, test_invoice_id):
        """Update invoice status"""
        new_status = "sent"
        response = requests.patch(
            f"{BASE_URL}/api/admin/invoices/{test_invoice_id}/status",
            params={"status": new_status}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == new_status
        print(f"Updated invoice status to: {data['status']}")
    
    def test_update_invoice_invalid_status_fails(self, test_invoice_id):
        """Updating with invalid status should fail"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/invoices/{test_invoice_id}/status",
            params={"status": "invalid_status"}
        )
        assert response.status_code == 400
        print("Invalid status correctly rejected")
    
    def test_add_payment_to_invoice(self, test_invoice_id):
        """Add payment to invoice"""
        payment_data = {
            "amount": 15000,
            "method": "bank_transfer",
            "reference": "TXN123456",
            "notes": "Partial payment"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/invoices/{test_invoice_id}/payments",
            json=payment_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["amount_paid"] >= payment_data["amount"]
        assert data["status"] in ["partially_paid", "paid"]
        print(f"Added payment of TZS {payment_data['amount']}. Status: {data['status']}")
    
    def test_add_full_payment_marks_as_paid(self):
        """Adding full payment should mark invoice as paid"""
        # Create invoice with known total
        invoice_data = {
            "customer_name": f"TEST FullPay {uuid.uuid4().hex[:6]}",
            "customer_email": f"fullpay_{uuid.uuid4().hex[:6]}@example.com",
            "currency": "TZS",
            "line_items": [{"description": "Item", "quantity": 1, "unit_price": 10000, "total": 10000}],
            "subtotal": 10000,
            "tax": 0,
            "discount": 0,
            "total": 10000
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/invoices", json=invoice_data)
        invoice_id = create_response.json()["id"]
        
        # Add full payment
        payment_data = {"amount": 10000, "method": "cash"}
        payment_response = requests.post(
            f"{BASE_URL}/api/admin/invoices/{invoice_id}/payments",
            json=payment_data
        )
        assert payment_response.status_code == 200
        
        data = payment_response.json()
        assert data["status"] == "paid"
        print(f"Invoice marked as paid after full payment")


class TestQuotes:
    """Test Quote Management CRUD Operations"""
    
    @pytest.fixture
    def test_quote_id(self):
        """Create a test quote"""
        quote_data = {
            "customer_name": f"TEST Quote Customer {uuid.uuid4().hex[:6]}",
            "customer_email": f"quote_{uuid.uuid4().hex[:6]}@example.com",
            "customer_company": "TEST Quote Corp",
            "currency": "TZS",
            "line_items": [
                {"product_name": "Product X", "description": "Premium product", "quantity": 3, "unit_price": 10000, "total": 30000}
            ],
            "subtotal": 30000,
            "tax": 5400,
            "discount": 0,
            "total": 35400
        }
        response = requests.post(f"{BASE_URL}/api/admin/quotes", json=quote_data)
        assert response.status_code == 200
        
        yield response.json()["id"]
    
    def test_create_quote(self):
        """Create a new quote"""
        quote_data = {
            "customer_name": f"TEST NewQuote {uuid.uuid4().hex[:6]}",
            "customer_email": f"newquote_{uuid.uuid4().hex[:6]}@example.com",
            "currency": "TZS",
            "line_items": [
                {"product_name": "Service A", "description": "Design service", "quantity": 1, "unit_price": 50000, "total": 50000}
            ],
            "subtotal": 50000,
            "tax": 0,
            "discount": 5000,
            "total": 45000,
            "notes": "Special quote for testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quotes", json=quote_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer_name"] == quote_data["customer_name"]
        assert "quote_number" in data
        assert data["quote_number"].startswith("QT-")
        print(f"Created quote: {data['quote_number']} - Total: TZS {data['total']}")
    
    def test_list_quotes(self):
        """List all quotes"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} quotes")
    
    def test_get_quote(self, test_quote_id):
        """Get a specific quote"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes/{test_quote_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_quote_id
        print(f"Retrieved quote: {data['quote_number']}")
    
    def test_update_quote_status(self, test_quote_id):
        """Update quote status"""
        new_status = "sent"
        response = requests.patch(
            f"{BASE_URL}/api/admin/quotes/{test_quote_id}/status",
            params={"status": new_status}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == new_status
        print(f"Updated quote status to: {data['status']}")


class TestServiceOrders:
    """Test Service Orders API"""
    
    def test_list_service_orders(self):
        """List service orders"""
        response = requests.get(f"{BASE_URL}/api/service-orders")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        print(f"Found {data['count']} service orders")
    
    def test_get_service_order_stats(self):
        """Get service order statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/service-orders/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_orders" in data
        assert "by_status" in data
        print(f"Service order stats: {data['total_orders']} total orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
