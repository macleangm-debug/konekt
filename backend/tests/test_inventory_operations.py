"""
Inventory Operations Pack - Backend API Tests
Tests: Delivery Notes, Goods Receiving, Suppliers, Purchase Orders, Inventory Ops Dashboard, Inventory Ledger
"""
import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestInventoryOpsDashboard:
    """Inventory Operations Dashboard API tests"""

    def test_get_inventory_ops_dashboard(self):
        """Test GET /api/admin/inventory-ops-dashboard - returns dashboard metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory-ops-dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected metrics are present
        assert "low_stock_items" in data
        assert "low_stock_products" in data
        assert "low_stock_raw_materials" in data
        assert "pending_delivery_notes" in data
        assert "pending_goods_receipts" in data
        assert "open_purchase_orders" in data
        assert "reserved_orders" in data
        assert "pending_fulfillment" in data
        assert "movements_today" in data
        assert "total_items" in data
        assert "total_raw_materials" in data
        assert "total_suppliers" in data
        
        # Verify data types
        assert isinstance(data["low_stock_items"], int)
        assert isinstance(data["total_items"], int)
        print(f"Dashboard metrics: low_stock={data['low_stock_items']}, total_items={data['total_items']}")


class TestSuppliers:
    """Supplier Master CRUD API tests"""
    created_supplier_id = None

    def test_list_suppliers_empty_or_with_data(self):
        """Test GET /api/admin/suppliers - returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Current suppliers count: {len(data)}")

    def test_create_supplier(self):
        """Test POST /api/admin/suppliers - create supplier"""
        payload = {
            "name": "TEST_Acme Supplies Ltd",
            "contact_person": "John Doe",
            "email": "contact@acme-test.co.tz",
            "phone": "+255 123 456 789",
            "address": "123 Industrial Area",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "tax_number": "TIN-12345678",
            "payment_terms": "Net 30",
            "lead_time_days": 7,
            "notes": "Test supplier for inventory operations"
        }
        response = requests.post(f"{BASE_URL}/api/admin/suppliers", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify returned data
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert data["city"] == payload["city"]
        assert data["payment_terms"] == payload["payment_terms"]
        assert data["is_active"] == True
        
        TestSuppliers.created_supplier_id = data["id"]
        print(f"Created supplier with ID: {data['id']}")

    def test_get_supplier_by_id(self):
        """Test GET /api/admin/suppliers/{supplier_id} - get specific supplier"""
        if not TestSuppliers.created_supplier_id:
            pytest.skip("No supplier created")
        
        response = requests.get(f"{BASE_URL}/api/admin/suppliers/{TestSuppliers.created_supplier_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == TestSuppliers.created_supplier_id
        assert data["name"] == "TEST_Acme Supplies Ltd"
        print(f"Retrieved supplier: {data['name']}")

    def test_update_supplier(self):
        """Test PUT /api/admin/suppliers/{supplier_id} - update supplier"""
        if not TestSuppliers.created_supplier_id:
            pytest.skip("No supplier created")
        
        update_payload = {
            "name": "TEST_Acme Supplies Ltd (Updated)",
            "payment_terms": "Net 45",
            "lead_time_days": 10
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/suppliers/{TestSuppliers.created_supplier_id}", 
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify update persisted
        assert data["name"] == "TEST_Acme Supplies Ltd (Updated)"
        assert data["payment_terms"] == "Net 45"
        print(f"Updated supplier: {data['name']}")

    def test_delete_supplier(self):
        """Test DELETE /api/admin/suppliers/{supplier_id} - delete supplier"""
        if not TestSuppliers.created_supplier_id:
            pytest.skip("No supplier created")
        
        response = requests.delete(f"{BASE_URL}/api/admin/suppliers/{TestSuppliers.created_supplier_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/admin/suppliers/{TestSuppliers.created_supplier_id}")
        assert get_response.status_code == 404
        print(f"Deleted supplier: {TestSuppliers.created_supplier_id}")


class TestPurchaseOrders:
    """Purchase Order CRUD API tests"""
    created_supplier_id = None
    created_po_id = None

    @pytest.fixture(autouse=True)
    def setup_supplier(self):
        """Create a supplier for PO testing"""
        # Create supplier first
        payload = {
            "name": "TEST_PO Supplier",
            "email": "po-supplier@test.co.tz",
            "payment_terms": "Net 30"
        }
        response = requests.post(f"{BASE_URL}/api/admin/suppliers", json=payload)
        if response.status_code == 200:
            TestPurchaseOrders.created_supplier_id = response.json()["id"]
        yield
        # Cleanup supplier after tests
        if TestPurchaseOrders.created_supplier_id:
            requests.delete(f"{BASE_URL}/api/admin/suppliers/{TestPurchaseOrders.created_supplier_id}")

    def test_list_purchase_orders(self):
        """Test GET /api/admin/procurement/purchase-orders - returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/procurement/purchase-orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Current POs count: {len(data)}")

    def test_create_purchase_order(self):
        """Test POST /api/admin/procurement/purchase-orders - create PO"""
        if not TestPurchaseOrders.created_supplier_id:
            pytest.skip("No supplier available")
        
        payload = {
            "supplier_id": TestPurchaseOrders.created_supplier_id,
            "expected_delivery_date": "2026-02-15",
            "warehouse_id": "main-wh",
            "warehouse_name": "Main Warehouse",
            "delivery_address": "123 Factory Road, Dar es Salaam",
            "payment_terms": "Net 30",
            "notes": "Test purchase order",
            "created_by": "admin@konekt.co.tz",
            "items": [
                {
                    "sku": "TEST-SKU-001",
                    "name": "Test Product",
                    "quantity": 100,
                    "unit_cost": 5000,
                    "total_cost": 500000
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/admin/procurement/purchase-orders", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response data
        assert "id" in data
        assert "po_number" in data
        assert data["status"] == "draft"
        assert data["total_qty"] == 100
        assert data["total_cost"] == 500000
        assert len(data["items"]) == 1
        
        TestPurchaseOrders.created_po_id = data["id"]
        print(f"Created PO: {data['po_number']} with ID: {data['id']}")

    def test_create_po_requires_supplier(self):
        """Test POST /api/admin/procurement/purchase-orders - requires valid supplier"""
        payload = {
            "supplier_id": "invalid-supplier-id-12345",
            "items": [{"sku": "TEST", "quantity": 10, "unit_cost": 100, "total_cost": 1000}]
        }
        response = requests.post(f"{BASE_URL}/api/admin/procurement/purchase-orders", json=payload)
        assert response.status_code == 404
        print("Verified: Invalid supplier returns 404")

    def test_get_purchase_order_by_id(self):
        """Test GET /api/admin/procurement/purchase-orders/{po_id} - get specific PO"""
        if not TestPurchaseOrders.created_po_id:
            pytest.skip("No PO created")
        
        response = requests.get(f"{BASE_URL}/api/admin/procurement/purchase-orders/{TestPurchaseOrders.created_po_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == TestPurchaseOrders.created_po_id
        assert data["status"] == "draft"
        print(f"Retrieved PO: {data['po_number']}")

    def test_approve_purchase_order(self):
        """Test POST /api/admin/procurement/purchase-orders/{po_id}/approve - approve and order"""
        if not TestPurchaseOrders.created_po_id:
            pytest.skip("No PO created")
        
        payload = {"approved_by": "admin@konekt.co.tz"}
        response = requests.post(
            f"{BASE_URL}/api/admin/procurement/purchase-orders/{TestPurchaseOrders.created_po_id}/approve",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "ordered"
        assert data["approved_by"] == "admin@konekt.co.tz"
        print(f"Approved PO: {data['po_number']} - status now 'ordered'")

    def test_update_po_status(self):
        """Test PATCH /api/admin/procurement/purchase-orders/{po_id}/status - update status"""
        if not TestPurchaseOrders.created_po_id:
            pytest.skip("No PO created")
        
        payload = {"status": "received"}
        response = requests.patch(
            f"{BASE_URL}/api/admin/procurement/purchase-orders/{TestPurchaseOrders.created_po_id}/status",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "received"
        print(f"Updated PO status to 'received'")


class TestGoodsReceiving:
    """Goods Receiving API tests"""
    created_receipt_id = None

    def test_list_goods_receipts(self):
        """Test GET /api/admin/goods-receiving - returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/goods-receiving")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Current goods receipts count: {len(data)}")

    def test_create_goods_receipt(self):
        """Test POST /api/admin/goods-receiving - create goods receipt"""
        # First get an existing inventory item SKU
        inv_response = requests.get(f"{BASE_URL}/api/admin/inventory")
        inv_items = inv_response.json() if inv_response.status_code == 200 else []
        
        test_sku = None
        if inv_items and isinstance(inv_items, list) and len(inv_items) > 0:
            test_sku = inv_items[0].get("sku")
        elif isinstance(inv_items, dict) and "items" in inv_items and len(inv_items["items"]) > 0:
            test_sku = inv_items["items"][0].get("sku")
        
        if not test_sku:
            test_sku = "TEST-RECEIPT-SKU"
        
        payload = {
            "supplier_name": "Test Supplier Direct",
            "warehouse_id": "main-wh",
            "warehouse_name": "Main Warehouse",
            "received_by": "admin@konekt.co.tz",
            "note": "Test goods receipt",
            "items": [
                {
                    "sku": test_sku,
                    "quantity": 50,
                    "item_type": "product"
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/admin/goods-receiving", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert "id" in data
        assert "receipt_number" in data
        assert data["receipt_number"].startswith("GRN-")
        assert data["status"] == "received"
        assert data["supplier_name"] == "Test Supplier Direct"
        assert data["received_by"] == "admin@konekt.co.tz"
        
        TestGoodsReceiving.created_receipt_id = data["id"]
        print(f"Created goods receipt: {data['receipt_number']}")

    def test_get_goods_receipt_by_id(self):
        """Test GET /api/admin/goods-receiving/{receipt_id} - get specific receipt"""
        if not TestGoodsReceiving.created_receipt_id:
            pytest.skip("No receipt created")
        
        response = requests.get(f"{BASE_URL}/api/admin/goods-receiving/{TestGoodsReceiving.created_receipt_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == TestGoodsReceiving.created_receipt_id
        assert data["status"] == "received"
        print(f"Retrieved receipt: {data['receipt_number']}")

    def test_update_goods_receipt_status(self):
        """Test PATCH /api/admin/goods-receiving/{receipt_id}/status - update status"""
        if not TestGoodsReceiving.created_receipt_id:
            pytest.skip("No receipt created")
        
        payload = {"status": "accepted"}
        response = requests.patch(
            f"{BASE_URL}/api/admin/goods-receiving/{TestGoodsReceiving.created_receipt_id}/status",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "accepted"
        print(f"Updated receipt status to 'accepted'")


class TestDeliveryNotes:
    """Delivery Notes API tests"""
    created_note_id = None

    def test_list_delivery_notes(self):
        """Test GET /api/admin/delivery-notes - returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery-notes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Current delivery notes count: {len(data)}")

    def test_create_delivery_note_direct(self):
        """Test POST /api/admin/delivery-notes - create direct delivery note"""
        # Get an inventory item with stock
        inv_response = requests.get(f"{BASE_URL}/api/admin/inventory")
        inv_items = inv_response.json() if inv_response.status_code == 200 else []
        
        test_sku = None
        if inv_items and isinstance(inv_items, list) and len(inv_items) > 0:
            test_sku = inv_items[0].get("sku")
        elif isinstance(inv_items, dict) and "items" in inv_items and len(inv_items["items"]) > 0:
            test_sku = inv_items["items"][0].get("sku")
        
        if not test_sku:
            test_sku = "TEST-DN-SKU"
        
        payload = {
            "source_type": "direct",
            "delivered_by": "admin@konekt.co.tz",
            "delivered_to": "Test Customer",
            "delivery_address": "123 Test Street, Dar es Salaam",
            "vehicle_info": "ABC-1234",
            "remarks": "Test delivery note",
            "customer_name": "Test Customer Ltd",
            "customer_email": "customer@test.co.tz",
            "line_items": [
                {
                    "sku": test_sku,
                    "quantity": 5,
                    "item_type": "product",
                    "name": "Test Product"
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/admin/delivery-notes", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert "id" in data
        assert "note_number" in data
        assert data["note_number"].startswith("DN-")
        assert data["status"] == "issued"
        assert data["source_type"] == "direct"
        assert data["delivered_by"] == "admin@konekt.co.tz"
        assert data["delivered_to"] == "Test Customer"
        
        TestDeliveryNotes.created_note_id = data["id"]
        print(f"Created delivery note: {data['note_number']}")

    def test_get_delivery_note_by_id(self):
        """Test GET /api/admin/delivery-notes/{note_id} - get specific note"""
        if not TestDeliveryNotes.created_note_id:
            pytest.skip("No delivery note created")
        
        response = requests.get(f"{BASE_URL}/api/admin/delivery-notes/{TestDeliveryNotes.created_note_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == TestDeliveryNotes.created_note_id
        assert data["status"] == "issued"
        print(f"Retrieved delivery note: {data['note_number']}")

    def test_update_delivery_note_status(self):
        """Test PATCH /api/admin/delivery-notes/{note_id}/status - update status"""
        if not TestDeliveryNotes.created_note_id:
            pytest.skip("No delivery note created")
        
        payload = {"status": "delivered"}
        response = requests.patch(
            f"{BASE_URL}/api/admin/delivery-notes/{TestDeliveryNotes.created_note_id}/status",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "delivered"
        print(f"Updated delivery note status to 'delivered'")


class TestInventoryLedger:
    """Inventory Ledger API tests"""

    def test_list_all_movements(self):
        """Test GET /api/admin/inventory-ledger - returns movement list"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory-ledger")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total stock movements: {len(data)}")
        
        # Verify movement structure if data exists
        if len(data) > 0:
            movement = data[0]
            assert "id" in movement
            assert "sku" in movement
            assert "movement_type" in movement
            print(f"Latest movement: SKU={movement['sku']}, type={movement['movement_type']}")

    def test_filter_movements_by_type(self):
        """Test GET /api/admin/inventory-ledger?movement_type=... - filter by type"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory-ledger?movement_type=adjustment")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Adjustment movements: {len(data)}")

    def test_get_movements_by_sku(self):
        """Test GET /api/admin/inventory-ledger/{sku} - get movements for specific SKU"""
        # First get an item from ledger to get a valid SKU
        all_movements = requests.get(f"{BASE_URL}/api/admin/inventory-ledger")
        if all_movements.status_code != 200 or len(all_movements.json()) == 0:
            pytest.skip("No movements available")
        
        test_sku = all_movements.json()[0].get("sku")
        if not test_sku:
            pytest.skip("No SKU available")
        
        response = requests.get(f"{BASE_URL}/api/admin/inventory-ledger/{test_sku}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify all movements are for the requested SKU
        for movement in data:
            assert movement["sku"] == test_sku
        print(f"Movements for SKU {test_sku}: {len(data)}")


class TestLowStockItems:
    """Low Stock Items endpoint tests"""

    def test_get_low_stock_items(self):
        """Test GET /api/admin/inventory-ops-dashboard/low-stock - returns low stock list"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory-ops-dashboard/low-stock")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify structure if items exist
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "sku" in item
            assert "name" in item
            assert "type" in item
            assert "on_hand" in item
            assert "available" in item
            assert "threshold" in item
        
        print(f"Low stock items count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
