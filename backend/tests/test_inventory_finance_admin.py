"""
Konekt Inventory, Finance & Admin System Tests
Tests for:
- Stock Movement tracking API
- Warehouse Transfer API
- Warehouses CRUD
- Raw Materials CRUD with stock adjustments
- Inventory Variants CRUD
- Central Payments with allocation
- Customer Statements
- Creative Services V2 with briefs
- Production Queue with task visibility
- CRM Settings
"""
import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Authorization headers for API requests"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ==================== WAREHOUSE TESTS ====================

class TestWarehousesCRUD:
    """Tests for /api/admin/warehouses endpoints"""
    
    created_warehouse_id = None
    
    def test_list_warehouses(self, auth_headers):
        """Test listing all warehouses"""
        response = requests.get(f"{BASE_URL}/api/admin/warehouses", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of warehouses"
        print(f"PASS: Listed {len(data)} warehouses")
    
    def test_create_warehouse(self, auth_headers):
        """Test creating a new warehouse"""
        unique_code = f"TEST-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": f"TEST_Warehouse_{unique_code}",
            "code": unique_code,
            "address": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "contact_name": "Test Manager",
            "contact_phone": "+255123456789",
            "contact_email": "test@warehouse.com",
            "capacity_units": 1000,
            "current_utilization": 100,
            "warehouse_type": "general",
            "notes": "Test warehouse for automated testing"
        }
        response = requests.post(f"{BASE_URL}/api/admin/warehouses", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create warehouse: {response.text}"
        
        data = response.json()
        assert data["name"] == payload["name"], "Name mismatch"
        assert data["code"] == payload["code"], "Code mismatch"
        assert "id" in data, "Missing warehouse ID"
        
        TestWarehousesCRUD.created_warehouse_id = data["id"]
        print(f"PASS: Created warehouse with ID: {data['id']}, code: {data['code']}")
    
    def test_get_warehouse_by_id(self, auth_headers):
        """Test getting a warehouse by ID"""
        if not TestWarehousesCRUD.created_warehouse_id:
            pytest.skip("No warehouse ID from previous test")
        
        warehouse_id = TestWarehousesCRUD.created_warehouse_id
        response = requests.get(f"{BASE_URL}/api/admin/warehouses/{warehouse_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["id"] == warehouse_id, "ID mismatch"
        print(f"PASS: Retrieved warehouse: {data['name']}")
    
    def test_update_warehouse(self, auth_headers):
        """Test updating a warehouse"""
        if not TestWarehousesCRUD.created_warehouse_id:
            pytest.skip("No warehouse ID from previous test")
        
        warehouse_id = TestWarehousesCRUD.created_warehouse_id
        update_payload = {
            "capacity_units": 2000,
            "current_utilization": 500,
            "notes": "Updated by automated test"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/warehouses/{warehouse_id}",
            json=update_payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["capacity_units"] == 2000, "Capacity not updated"
        assert data["current_utilization"] == 500, "Utilization not updated"
        print(f"PASS: Updated warehouse capacity to {data['capacity_units']}")
    
    def test_warehouse_stats(self, auth_headers):
        """Test warehouse statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/warehouses/stats/summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total_warehouses" in data, "Missing total_warehouses"
        assert "active_warehouses" in data, "Missing active_warehouses"
        print(f"PASS: Stats - Total: {data['total_warehouses']}, Active: {data['active_warehouses']}")
    
    def test_delete_warehouse(self, auth_headers):
        """Test soft-deleting a warehouse"""
        if not TestWarehousesCRUD.created_warehouse_id:
            pytest.skip("No warehouse ID from previous test")
        
        warehouse_id = TestWarehousesCRUD.created_warehouse_id
        response = requests.delete(f"{BASE_URL}/api/admin/warehouses/{warehouse_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify deactivated
        get_response = requests.get(f"{BASE_URL}/api/admin/warehouses/{warehouse_id}", headers=auth_headers)
        if get_response.status_code == 200:
            data = get_response.json()
            assert data.get("is_active") == False, "Warehouse not deactivated"
        print(f"PASS: Warehouse {warehouse_id} deactivated")


# ==================== RAW MATERIALS TESTS ====================

class TestRawMaterialsCRUD:
    """Tests for /api/admin/raw-materials endpoints"""
    
    created_material_id = None
    
    def test_list_raw_materials(self, auth_headers):
        """Test listing all raw materials"""
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of materials"
        print(f"PASS: Listed {len(data)} raw materials")
    
    def test_create_raw_material(self, auth_headers):
        """Test creating a new raw material"""
        unique_sku = f"TEST-MAT-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": f"TEST_Material_{unique_sku}",
            "sku": unique_sku,
            "description": "Test material for automated testing",
            "category": "Testing",
            "unit_of_measure": "kg",
            "quantity_on_hand": 100,
            "reserved_quantity": 10,
            "reorder_level": 20,
            "unit_cost": 5000,
            "supplier_name": "Test Supplier Co",
            "supplier_contact": "+255111222333",
            "lead_time_days": 5
        }
        response = requests.post(f"{BASE_URL}/api/admin/raw-materials", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create material: {response.text}"
        
        data = response.json()
        assert data["name"] == payload["name"], "Name mismatch"
        assert data["sku"] == payload["sku"], "SKU mismatch"
        assert data["quantity_on_hand"] == 100, "Quantity mismatch"
        assert "id" in data, "Missing material ID"
        
        TestRawMaterialsCRUD.created_material_id = data["id"]
        print(f"PASS: Created material with ID: {data['id']}, SKU: {data['sku']}")
    
    def test_get_material_by_id(self, auth_headers):
        """Test getting a material by ID"""
        if not TestRawMaterialsCRUD.created_material_id:
            pytest.skip("No material ID from previous test")
        
        material_id = TestRawMaterialsCRUD.created_material_id
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials/{material_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["id"] == material_id, "ID mismatch"
        print(f"PASS: Retrieved material: {data['name']}")
    
    def test_update_raw_material(self, auth_headers):
        """Test updating a raw material"""
        if not TestRawMaterialsCRUD.created_material_id:
            pytest.skip("No material ID from previous test")
        
        material_id = TestRawMaterialsCRUD.created_material_id
        update_payload = {
            "quantity_on_hand": 150,
            "unit_cost": 5500,
            "notes": "Updated by automated test"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/raw-materials/{material_id}",
            json=update_payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["quantity_on_hand"] == 150, "Quantity not updated"
        assert data["unit_cost"] == 5500, "Unit cost not updated"
        print(f"PASS: Updated material quantity to {data['quantity_on_hand']}")
    
    def test_adjust_material_stock_add(self, auth_headers):
        """Test adding stock to a raw material"""
        if not TestRawMaterialsCRUD.created_material_id:
            pytest.skip("No material ID from previous test")
        
        material_id = TestRawMaterialsCRUD.created_material_id
        adjust_payload = {
            "type": "add",
            "quantity": 50,
            "reason": "Automated test - stock received"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/raw-materials/{material_id}/adjust-stock",
            json=adjust_payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Should be 150 + 50 = 200
        assert data["quantity_on_hand"] == 200, f"Expected 200, got {data['quantity_on_hand']}"
        print(f"PASS: Adjusted stock to {data['quantity_on_hand']}")
    
    def test_adjust_material_stock_remove(self, auth_headers):
        """Test removing stock from a raw material"""
        if not TestRawMaterialsCRUD.created_material_id:
            pytest.skip("No material ID from previous test")
        
        material_id = TestRawMaterialsCRUD.created_material_id
        adjust_payload = {
            "type": "remove",
            "quantity": 30,
            "reason": "Automated test - stock consumed"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/raw-materials/{material_id}/adjust-stock",
            json=adjust_payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Should be 200 - 30 = 170
        assert data["quantity_on_hand"] == 170, f"Expected 170, got {data['quantity_on_hand']}"
        print(f"PASS: Adjusted stock to {data['quantity_on_hand']}")
    
    def test_get_material_categories(self, auth_headers):
        """Test getting distinct material categories"""
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials/categories", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of categories"
        print(f"PASS: Got {len(data)} categories: {data[:5]}")
    
    def test_get_low_stock_materials(self, auth_headers):
        """Test getting materials below reorder level"""
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials/low-stock", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of low stock materials"
        print(f"PASS: Found {len(data)} low stock materials")
    
    def test_material_stats(self, auth_headers):
        """Test raw materials statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials/stats/summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total_materials" in data, "Missing total_materials"
        assert "active_materials" in data, "Missing active_materials"
        assert "low_stock_count" in data, "Missing low_stock_count"
        print(f"PASS: Stats - Total: {data['total_materials']}, Low stock: {data['low_stock_count']}")
    
    def test_delete_raw_material(self, auth_headers):
        """Test soft-deleting a raw material"""
        if not TestRawMaterialsCRUD.created_material_id:
            pytest.skip("No material ID from previous test")
        
        material_id = TestRawMaterialsCRUD.created_material_id
        response = requests.delete(f"{BASE_URL}/api/admin/raw-materials/{material_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: Material {material_id} deactivated")


# ==================== INVENTORY VARIANTS TESTS ====================

class TestInventoryVariantsCRUD:
    """Tests for /api/admin/inventory-variants endpoints"""
    
    created_variant_id = None
    test_product_id = None
    
    def test_list_inventory_variants(self, auth_headers):
        """Test listing all inventory variants"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory-variants", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of variants"
        print(f"PASS: Listed {len(data)} inventory variants")
        
        # Store first product_id for creating variants
        if data:
            TestInventoryVariantsCRUD.test_product_id = data[0].get("product_id")
    
    def test_create_inventory_variant(self, auth_headers):
        """Test creating a new inventory variant"""
        # First, get a product ID
        products_response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        if products_response.status_code == 200:
            products = products_response.json().get("products", [])
            if products:
                TestInventoryVariantsCRUD.test_product_id = products[0].get("id")
        
        if not TestInventoryVariantsCRUD.test_product_id:
            pytest.skip("No product found to create variant for")
        
        unique_sku = f"TEST-VAR-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "product_id": TestInventoryVariantsCRUD.test_product_id,
            "sku": unique_sku,
            "variant_attributes": {"size": "XL", "color": "Blue"},
            "stock_on_hand": 50,
            "reserved_stock": 5,
            "warehouse_location": "Shelf A-1",
            "unit_cost": 10000,
            "selling_price": 15000,
            "reorder_level": 10
        }
        response = requests.post(f"{BASE_URL}/api/admin/inventory-variants", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create variant: {response.text}"
        
        data = response.json()
        assert data["sku"] == payload["sku"], "SKU mismatch"
        assert data["stock_on_hand"] == 50, "Stock mismatch"
        assert "id" in data, "Missing variant ID"
        
        TestInventoryVariantsCRUD.created_variant_id = data["id"]
        print(f"PASS: Created variant with ID: {data['id']}, SKU: {data['sku']}")
    
    def test_get_variant_by_id(self, auth_headers):
        """Test getting a variant by ID"""
        if not TestInventoryVariantsCRUD.created_variant_id:
            pytest.skip("No variant ID from previous test")
        
        variant_id = TestInventoryVariantsCRUD.created_variant_id
        response = requests.get(f"{BASE_URL}/api/admin/inventory-variants/{variant_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["id"] == variant_id, "ID mismatch"
        print(f"PASS: Retrieved variant: {data['sku']}")
    
    def test_update_inventory_variant(self, auth_headers):
        """Test updating an inventory variant"""
        if not TestInventoryVariantsCRUD.created_variant_id:
            pytest.skip("No variant ID from previous test")
        
        variant_id = TestInventoryVariantsCRUD.created_variant_id
        update_payload = {
            "stock_on_hand": 75,
            "selling_price": 16000,
            "warehouse_location": "Shelf B-2"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/inventory-variants/{variant_id}",
            json=update_payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["stock_on_hand"] == 75, "Stock not updated"
        assert data["selling_price"] == 16000, "Price not updated"
        print(f"PASS: Updated variant stock to {data['stock_on_hand']}")
    
    def test_get_variants_by_product(self, auth_headers):
        """Test getting variants for a specific product"""
        if not TestInventoryVariantsCRUD.test_product_id:
            pytest.skip("No product ID available")
        
        product_id = TestInventoryVariantsCRUD.test_product_id
        response = requests.get(f"{BASE_URL}/api/admin/inventory-variants/product/{product_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of variants"
        print(f"PASS: Got {len(data)} variants for product {product_id}")
    
    def test_get_low_stock_alerts(self, auth_headers):
        """Test getting low stock variant alerts"""
        response = requests.get(f"{BASE_URL}/api/admin/inventory-variants/low-stock/alerts", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of alerts"
        print(f"PASS: Found {len(data)} low stock alerts")
    
    def test_delete_inventory_variant(self, auth_headers):
        """Test soft-deleting an inventory variant"""
        if not TestInventoryVariantsCRUD.created_variant_id:
            pytest.skip("No variant ID from previous test")
        
        variant_id = TestInventoryVariantsCRUD.created_variant_id
        response = requests.delete(f"{BASE_URL}/api/admin/inventory-variants/{variant_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: Variant {variant_id} deleted")


# ==================== STOCK MOVEMENT TESTS ====================

class TestStockMovements:
    """Tests for /api/admin/stock-movements endpoints"""
    
    def test_list_stock_movements(self, auth_headers):
        """Test listing stock movements"""
        response = requests.get(f"{BASE_URL}/api/admin/stock-movements", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of movements"
        print(f"PASS: Listed {len(data)} stock movements")
    
    def test_list_movements_with_filters(self, auth_headers):
        """Test listing stock movements with filters"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stock-movements?movement_type=transfer_in&limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of movements"
        print(f"PASS: Listed {len(data)} transfer_in movements")
    
    def test_get_movement_stats(self, auth_headers):
        """Test getting stock movement statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/stock-movements/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "by_type" in data, "Missing by_type in stats"
        assert "total_movements" in data, "Missing total_movements"
        print(f"PASS: Movement stats - Total: {data['total_movements']}")


# ==================== WAREHOUSE TRANSFER TESTS ====================

class TestWarehouseTransfers:
    """Tests for /api/admin/warehouse-transfers endpoints"""
    
    created_transfer_id = None
    
    def test_list_transfers(self, auth_headers):
        """Test listing all warehouse transfers"""
        response = requests.get(f"{BASE_URL}/api/admin/warehouse-transfers", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of transfers"
        print(f"PASS: Listed {len(data)} warehouse transfers")
    
    def test_create_transfer(self, auth_headers):
        """Test creating a warehouse transfer"""
        # Get a variant with stock
        variants_response = requests.get(f"{BASE_URL}/api/admin/inventory-variants", headers=auth_headers)
        if variants_response.status_code != 200:
            pytest.skip("Cannot get variants")
        
        variants = variants_response.json()
        variant_with_stock = None
        for v in variants:
            if v.get("stock_on_hand", 0) > 10:
                variant_with_stock = v
                break
        
        if not variant_with_stock:
            pytest.skip("No variant with sufficient stock for transfer")
        
        payload = {
            "variant_id": variant_with_stock["id"],
            "from_warehouse": "Main Warehouse",
            "to_warehouse": "Secondary Warehouse",
            "quantity": 5,
            "notes": "Automated test transfer"
        }
        response = requests.post(f"{BASE_URL}/api/admin/warehouse-transfers", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create transfer: {response.text}"
        
        data = response.json()
        assert data["quantity"] == 5, "Quantity mismatch"
        assert data["status"] == "completed", "Transfer not completed"
        assert "id" in data, "Missing transfer ID"
        
        TestWarehouseTransfers.created_transfer_id = data["id"]
        print(f"PASS: Created transfer with ID: {data['id']}")
    
    def test_get_transfer_by_id(self, auth_headers):
        """Test getting a transfer by ID"""
        if not TestWarehouseTransfers.created_transfer_id:
            pytest.skip("No transfer ID from previous test")
        
        transfer_id = TestWarehouseTransfers.created_transfer_id
        response = requests.get(f"{BASE_URL}/api/admin/warehouse-transfers/{transfer_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["id"] == transfer_id, "ID mismatch"
        print(f"PASS: Retrieved transfer: {data['id']}")


# ==================== CENTRAL PAYMENTS TESTS ====================

class TestCentralPayments:
    """Tests for /api/admin/central-payments endpoints"""
    
    created_payment_id = None
    
    def test_list_central_payments(self, auth_headers):
        """Test listing all central payments"""
        response = requests.get(f"{BASE_URL}/api/admin/central-payments", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of payments"
        print(f"PASS: Listed {len(data)} central payments")
    
    def test_create_central_payment(self, auth_headers):
        """Test creating a central payment"""
        # Get an invoice to allocate to
        invoices_response = requests.get(f"{BASE_URL}/api/admin/invoices-v2", headers=auth_headers)
        invoice_id = None
        if invoices_response.status_code == 200:
            invoices = invoices_response.json()
            if invoices:
                invoice_id = invoices[0].get("id")
        
        payload = {
            "customer_email": "test@example.com",
            "customer_name": "TEST_Payment Customer",
            "customer_company": "TEST Corp",
            "payment_method": "bank_transfer",
            "payment_source": "admin",
            "payment_reference": f"TEST-PAY-{uuid.uuid4().hex[:6]}",
            "currency": "TZS",
            "amount_received": 50000,
            "notes": "Automated test payment",
            "allocations": []
        }
        
        # Add allocation if we have an invoice
        if invoice_id:
            payload["allocations"].append({
                "invoice_id": invoice_id,
                "allocated_amount": 10000
            })
        
        response = requests.post(f"{BASE_URL}/api/admin/central-payments", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create payment: {response.text}"
        
        data = response.json()
        assert data["amount_received"] == 50000, "Amount mismatch"
        assert "id" in data, "Missing payment ID"
        
        TestCentralPayments.created_payment_id = data["id"]
        print(f"PASS: Created payment with ID: {data['id']}")
    
    def test_get_payment_by_id(self, auth_headers):
        """Test getting a payment with allocations"""
        if not TestCentralPayments.created_payment_id:
            pytest.skip("No payment ID from previous test")
        
        payment_id = TestCentralPayments.created_payment_id
        response = requests.get(f"{BASE_URL}/api/admin/central-payments/{payment_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["id"] == payment_id, "ID mismatch"
        assert "allocations" in data, "Missing allocations field"
        print(f"PASS: Retrieved payment with {len(data.get('allocations', []))} allocations")
    
    def test_payment_stats(self, auth_headers):
        """Test payment statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/central-payments/stats/summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total_payments" in data, "Missing total_payments"
        assert "total_amount" in data, "Missing total_amount"
        print(f"PASS: Payment stats - Total: {data['total_payments']}, Amount: {data['total_amount']}")
    
    def test_get_customer_payments(self, auth_headers):
        """Test getting payments for a customer"""
        response = requests.get(
            f"{BASE_URL}/api/admin/central-payments/customer/test@example.com",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of payments"
        print(f"PASS: Got {len(data)} payments for customer")


# ==================== CUSTOMER STATEMENTS TESTS ====================

class TestCustomerStatements:
    """Tests for /api/admin/statements endpoints"""
    
    def test_get_customer_statement(self, auth_headers):
        """Test getting a customer statement"""
        # First get a customer with invoices
        invoices_response = requests.get(f"{BASE_URL}/api/admin/invoices-v2", headers=auth_headers)
        customer_email = None
        if invoices_response.status_code == 200:
            invoices = invoices_response.json()
            if invoices:
                customer_email = invoices[0].get("customer_email")
        
        if not customer_email:
            # Use test email
            customer_email = "test@example.com"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/statements/customer/{customer_email}",
            headers=auth_headers
        )
        
        # Can return 404 if no data, which is acceptable
        if response.status_code == 404:
            print(f"PASS: Statement endpoint works - no data for {customer_email}")
            return
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "entries" in data, "Missing entries"
        assert "summary" in data, "Missing summary"
        print(f"PASS: Got statement with {len(data['entries'])} entries")
    
    def test_get_customer_aging(self, auth_headers):
        """Test getting customer aging report"""
        # First get a customer with invoices
        invoices_response = requests.get(f"{BASE_URL}/api/admin/invoices-v2", headers=auth_headers)
        customer_email = None
        if invoices_response.status_code == 200:
            invoices = invoices_response.json()
            if invoices:
                customer_email = invoices[0].get("customer_email")
        
        if not customer_email:
            customer_email = "test@example.com"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/statements/customer/{customer_email}/aging",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "aging" in data, "Missing aging buckets"
        assert "total_outstanding" in data, "Missing total_outstanding"
        print(f"PASS: Got aging report - Outstanding: {data['total_outstanding']}")


# ==================== CREATIVE SERVICES V2 TESTS ====================

class TestCreativeServicesV2:
    """Tests for /api/creative-services-v2 endpoints"""
    
    created_service_id = None
    created_order_id = None
    
    def test_list_active_services(self, auth_headers):
        """Test listing active creative services"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of services"
        print(f"PASS: Listed {len(data)} active creative services")
    
    def test_list_all_services_admin(self, auth_headers):
        """Test listing all creative services (admin)"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2/all", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of services"
        print(f"PASS: Admin listed {len(data)} total services")
    
    def test_create_creative_service(self, auth_headers):
        """Test creating a creative service (admin)"""
        unique_slug = f"test-service-{uuid.uuid4().hex[:6]}"
        payload = {
            "slug": unique_slug,
            "title": f"TEST_Service_{unique_slug}",
            "category": "Testing",
            "description": "Automated test service",
            "base_price": 50000,
            "currency": "TZS",
            "brief_fields": [
                {"key": "project_name", "label": "Project Name", "field_type": "text", "required": True},
                {"key": "requirements", "label": "Requirements", "field_type": "textarea", "required": False}
            ],
            "addons": [
                {"code": "rush", "label": "Rush Delivery", "price": 10000, "is_active": True}
            ],
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/creative-services-v2/admin", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create service: {response.text}"
        
        data = response.json()
        assert data["slug"] == payload["slug"], "Slug mismatch"
        assert data["title"] == payload["title"], "Title mismatch"
        assert "id" in data, "Missing service ID"
        
        TestCreativeServicesV2.created_service_id = data["id"]
        print(f"PASS: Created creative service: {data['slug']}")
    
    def test_get_service_by_slug(self, auth_headers):
        """Test getting a service by slug"""
        # Get any active service
        services_response = requests.get(f"{BASE_URL}/api/creative-services-v2")
        if services_response.status_code != 200:
            pytest.skip("Cannot get services")
        
        services = services_response.json()
        if not services:
            pytest.skip("No services available")
        
        slug = services[0].get("slug")
        response = requests.get(f"{BASE_URL}/api/creative-services-v2/{slug}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["slug"] == slug, "Slug mismatch"
        print(f"PASS: Retrieved service: {data['title']}")
    
    def test_create_service_order(self, auth_headers):
        """Test creating a creative service order"""
        # Get an active service
        services_response = requests.get(f"{BASE_URL}/api/creative-services-v2")
        if services_response.status_code != 200:
            pytest.skip("Cannot get services")
        
        services = services_response.json()
        if not services:
            pytest.skip("No services available")
        
        service = services[0]
        payload = {
            "service_slug": service["slug"],
            "customer_name": "TEST_Order Customer",
            "customer_email": "testorder@example.com",
            "customer_phone": "+255999888777",
            "company_name": "TEST Order Corp",
            "brief_answers": {"project_name": "Test Project"},
            "selected_addons": [],
            "uploaded_files": [],
            "notes": "Automated test order"
        }
        response = requests.post(f"{BASE_URL}/api/creative-services-v2/orders", json=payload)
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        
        data = response.json()
        assert data["customer_email"] == payload["customer_email"], "Email mismatch"
        assert data["status"] == "brief_submitted", "Status should be brief_submitted"
        assert "id" in data, "Missing order ID"
        
        TestCreativeServicesV2.created_order_id = data["id"]
        print(f"PASS: Created service order: {data['id']}")
    
    def test_list_service_orders_admin(self, auth_headers):
        """Test listing service orders (admin)"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2/orders/admin", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of orders"
        print(f"PASS: Listed {len(data)} service orders")
    
    def test_delete_creative_service(self, auth_headers):
        """Test soft-deleting a creative service"""
        if not TestCreativeServicesV2.created_service_id:
            pytest.skip("No service ID from previous test")
        
        service_id = TestCreativeServicesV2.created_service_id
        response = requests.delete(f"{BASE_URL}/api/creative-services-v2/admin/{service_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: Service {service_id} deleted")


# ==================== PRODUCTION QUEUE TESTS ====================

class TestProductionQueue:
    """Tests for /api/admin/production endpoints"""
    
    def test_list_production_queue(self, auth_headers):
        """Test listing production queue"""
        response = requests.get(f"{BASE_URL}/api/admin/production/queue", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of queue items"
        print(f"PASS: Listed {len(data)} production queue items")
    
    def test_list_queue_with_filters(self, auth_headers):
        """Test listing production queue with status filter"""
        response = requests.get(f"{BASE_URL}/api/admin/production/queue?status=queued", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of queue items"
        print(f"PASS: Listed {len(data)} queued items")
    
    def test_get_production_stats(self, auth_headers):
        """Test getting production queue statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/production/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total" in data, "Missing total"
        assert "queued" in data, "Missing queued"
        assert "in_progress" in data, "Missing in_progress"
        print(f"PASS: Production stats - Total: {data['total']}, Queued: {data['queued']}")


# ==================== CRM SETTINGS TESTS ====================

class TestCRMSettings:
    """Tests for /api/admin/crm-settings endpoints"""
    
    def test_get_crm_settings(self, auth_headers):
        """Test getting CRM settings"""
        response = requests.get(f"{BASE_URL}/api/admin/crm-settings", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "industries" in data, "Missing industries"
        assert "sources" in data, "Missing sources"
        assert "lead_statuses" in data, "Missing lead_statuses"
        print(f"PASS: Got CRM settings with {len(data['industries'])} industries, {len(data['sources'])} sources")
    
    def test_update_crm_settings(self, auth_headers):
        """Test updating CRM settings"""
        payload = {
            "industries": ["Banking", "Insurance", "Education", "Healthcare", "Technology", "Testing"],
            "sources": ["Website", "Referral", "Cold Call", "Event", "Test Source"]
        }
        response = requests.put(f"{BASE_URL}/api/admin/crm-settings", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "Testing" in data["industries"], "Testing industry not added"
        assert "Test Source" in data["sources"], "Test Source not added"
        print(f"PASS: Updated CRM settings")
    
    def test_get_staff_list(self, auth_headers):
        """Test getting staff list for assignments"""
        response = requests.get(f"{BASE_URL}/api/admin/crm-settings/staff", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of staff"
        print(f"PASS: Got {len(data)} staff members")


# ==================== HEALTH CHECK ====================

class TestHealth:
    """Health check test"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("PASS: API health check")
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Missing token"
        assert "user" in data, "Missing user"
        print(f"PASS: Admin login successful - Role: {data['user'].get('role')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
