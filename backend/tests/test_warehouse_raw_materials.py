"""
Test Warehouse Management and Raw Materials APIs
Tests CRUD operations, stock adjustments, and stats endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealth:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: Health endpoint working")


class TestAdminAuth:
    """Admin authentication for testing"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        token = data.get("access_token") or data.get("token")
        assert token, "No token in response"
        print(f"PASS: Admin login successful, role: {data.get('user', {}).get('role', 'unknown')}")
        return token
    
    def test_admin_login(self, admin_token):
        assert admin_token is not None
        print("PASS: Admin token obtained")


# ============== WAREHOUSE API TESTS ==============

class TestWarehouseAPI:
    """Warehouse CRUD API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_warehouses_requires_auth(self):
        """Verify auth is required"""
        response = requests.get(f"{BASE_URL}/api/admin/warehouses")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Warehouses list requires authentication")
    
    def test_list_warehouses(self, auth_headers):
        """List all warehouses"""
        response = requests.get(f"{BASE_URL}/api/admin/warehouses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Warehouses list returned {len(data)} items")
        return data
    
    def test_create_warehouse(self, auth_headers):
        """Create a new warehouse"""
        payload = {
            "name": "TEST Warehouse Alpha",
            "code": "TEST-WH-ALPHA",
            "address": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "contact_name": "Test Manager",
            "contact_phone": "+255789123456",
            "contact_email": "test@warehouse.com",
            "capacity_units": 5000,
            "current_utilization": 1500,
            "warehouse_type": "general",
            "notes": "Test warehouse for API testing"
        }
        response = requests.post(f"{BASE_URL}/api/admin/warehouses", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["code"] == "TEST-WH-ALPHA"
        assert data["capacity_units"] == 5000
        print(f"PASS: Warehouse created with ID: {data['id']}")
        return data
    
    def test_duplicate_warehouse_code_rejected(self, auth_headers):
        """Verify duplicate code is rejected"""
        payload = {
            "name": "Duplicate Test",
            "code": "TEST-WH-ALPHA",  # Same code as previous test
        }
        response = requests.post(f"{BASE_URL}/api/admin/warehouses", json=payload, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Duplicate warehouse code rejected")
    
    def test_get_warehouse_by_id(self, auth_headers):
        """Get warehouse by ID"""
        # First list to get an ID
        list_response = requests.get(f"{BASE_URL}/api/admin/warehouses", headers=auth_headers)
        warehouses = list_response.json()
        if not warehouses:
            pytest.skip("No warehouses to test GET by ID")
        
        warehouse_id = warehouses[0]["id"]
        response = requests.get(f"{BASE_URL}/api/admin/warehouses/{warehouse_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == warehouse_id
        print(f"PASS: Retrieved warehouse {data['name']} by ID")
    
    def test_update_warehouse(self, auth_headers):
        """Update a warehouse"""
        # First create a warehouse to update
        create_payload = {
            "name": "TEST Update Warehouse",
            "code": "TEST-WH-UPD",
            "capacity_units": 3000,
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/warehouses", json=create_payload, headers=auth_headers)
        if create_response.status_code == 400:  # Already exists
            # Find existing
            list_response = requests.get(f"{BASE_URL}/api/admin/warehouses", headers=auth_headers)
            warehouses = [w for w in list_response.json() if w.get("code") == "TEST-WH-UPD"]
            if warehouses:
                warehouse_id = warehouses[0]["id"]
            else:
                pytest.skip("Could not find or create warehouse to update")
        else:
            warehouse_id = create_response.json()["id"]
        
        update_payload = {
            "name": "TEST Updated Name",
            "capacity_units": 4000,
            "current_utilization": 2000
        }
        response = requests.put(f"{BASE_URL}/api/admin/warehouses/{warehouse_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST Updated Name"
        assert data["capacity_units"] == 4000
        print(f"PASS: Warehouse updated successfully")
    
    def test_delete_warehouse(self, auth_headers):
        """Soft delete a warehouse"""
        # First create one to delete
        create_payload = {
            "name": "TEST Delete Warehouse",
            "code": "TEST-WH-DEL",
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/warehouses", json=create_payload, headers=auth_headers)
        if create_response.status_code == 400:  # Already exists
            list_response = requests.get(f"{BASE_URL}/api/admin/warehouses", headers=auth_headers)
            warehouses = [w for w in list_response.json() if w.get("code") == "TEST-WH-DEL"]
            if warehouses:
                warehouse_id = warehouses[0]["id"]
            else:
                pytest.skip("Could not find warehouse to delete")
        else:
            warehouse_id = create_response.json()["id"]
        
        response = requests.delete(f"{BASE_URL}/api/admin/warehouses/{warehouse_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("PASS: Warehouse soft-deleted successfully")
    
    def test_warehouse_stats(self, auth_headers):
        """Get warehouse statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/warehouses/stats/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_warehouses" in data
        assert "active_warehouses" in data
        assert "total_capacity" in data
        assert "total_utilization" in data
        print(f"PASS: Stats - Total: {data['total_warehouses']}, Active: {data['active_warehouses']}, Capacity: {data['total_capacity']}")


# ============== RAW MATERIALS API TESTS ==============

class TestRawMaterialsAPI:
    """Raw Materials CRUD API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_raw_materials_requires_auth(self):
        """Verify auth is required"""
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Raw materials list requires authentication")
    
    def test_list_raw_materials(self, auth_headers):
        """List all raw materials"""
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Raw materials list returned {len(data)} items")
    
    def test_create_raw_material(self, auth_headers):
        """Create a new raw material"""
        payload = {
            "name": "TEST Cotton Fabric Premium",
            "sku": "TEST-RAW-COT-001",
            "description": "High quality cotton fabric for testing",
            "category": "Fabrics",
            "unit_of_measure": "meters",
            "quantity_on_hand": 250,
            "reserved_quantity": 50,
            "reorder_level": 100,
            "unit_cost": 5000,
            "supplier_name": "Test Supplier Co",
            "supplier_contact": "+255712345678",
            "lead_time_days": 14
        }
        response = requests.post(f"{BASE_URL}/api/admin/raw-materials", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["sku"] == "TEST-RAW-COT-001"
        assert data["quantity_on_hand"] == 250
        print(f"PASS: Raw material created with ID: {data['id']}")
        return data
    
    def test_duplicate_sku_rejected(self, auth_headers):
        """Verify duplicate SKU is rejected"""
        payload = {
            "name": "Duplicate Material",
            "sku": "TEST-RAW-COT-001",  # Same SKU as previous test
            "unit_of_measure": "meters"
        }
        response = requests.post(f"{BASE_URL}/api/admin/raw-materials", json=payload, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Duplicate material SKU rejected")
    
    def test_get_material_by_id(self, auth_headers):
        """Get material by ID"""
        list_response = requests.get(f"{BASE_URL}/api/admin/raw-materials", headers=auth_headers)
        materials = list_response.json()
        if not materials:
            pytest.skip("No materials to test GET by ID")
        
        material_id = materials[0]["id"]
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials/{material_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == material_id
        print(f"PASS: Retrieved material {data['name']} by ID")
    
    def test_get_material_categories(self, auth_headers):
        """Get distinct categories"""
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials/categories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Categories retrieved: {data}")
    
    def test_filter_by_category(self, auth_headers):
        """Filter materials by category"""
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials?category=Fabrics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Category filter returned {len(data)} items")
    
    def test_update_raw_material(self, auth_headers):
        """Update a raw material"""
        # Create one to update
        create_payload = {
            "name": "TEST Material to Update",
            "sku": "TEST-RAW-UPD-001",
            "unit_of_measure": "kg",
            "quantity_on_hand": 100,
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/raw-materials", json=create_payload, headers=auth_headers)
        if create_response.status_code == 400:  # Already exists
            list_response = requests.get(f"{BASE_URL}/api/admin/raw-materials", headers=auth_headers)
            materials = [m for m in list_response.json() if m.get("sku") == "TEST-RAW-UPD-001"]
            if materials:
                material_id = materials[0]["id"]
            else:
                pytest.skip("Could not find material to update")
        else:
            material_id = create_response.json()["id"]
        
        update_payload = {
            "name": "TEST Updated Material Name",
            "quantity_on_hand": 200,
            "unit_cost": 7500
        }
        response = requests.put(f"{BASE_URL}/api/admin/raw-materials/{material_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST Updated Material Name"
        print("PASS: Material updated successfully")
    
    def test_delete_raw_material(self, auth_headers):
        """Soft delete a material"""
        create_payload = {
            "name": "TEST Material to Delete",
            "sku": "TEST-RAW-DEL-001",
            "unit_of_measure": "units",
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/raw-materials", json=create_payload, headers=auth_headers)
        if create_response.status_code == 400:
            list_response = requests.get(f"{BASE_URL}/api/admin/raw-materials", headers=auth_headers)
            materials = [m for m in list_response.json() if m.get("sku") == "TEST-RAW-DEL-001"]
            if materials:
                material_id = materials[0]["id"]
            else:
                pytest.skip("Could not find material to delete")
        else:
            material_id = create_response.json()["id"]
        
        response = requests.delete(f"{BASE_URL}/api/admin/raw-materials/{material_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("PASS: Material soft-deleted successfully")


# ============== STOCK ADJUSTMENT TESTS ==============

class TestStockAdjustment:
    """Stock adjustment API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_material(self, auth_headers):
        """Create a material for stock adjustment tests"""
        payload = {
            "name": "TEST Stock Adjustment Material",
            "sku": "TEST-RAW-ADJ-001",
            "unit_of_measure": "units",
            "quantity_on_hand": 100,
        }
        response = requests.post(f"{BASE_URL}/api/admin/raw-materials", json=payload, headers=auth_headers)
        if response.status_code == 400:  # Already exists
            list_response = requests.get(f"{BASE_URL}/api/admin/raw-materials", headers=auth_headers)
            materials = [m for m in list_response.json() if m.get("sku") == "TEST-RAW-ADJ-001"]
            if materials:
                return materials[0]
        return response.json()
    
    def test_adjust_stock_add(self, auth_headers, test_material):
        """Test adding stock"""
        material_id = test_material["id"]
        initial_qty = test_material.get("quantity_on_hand", 100)
        
        payload = {
            "type": "add",
            "quantity": 50,
            "reason": "Test stock addition"
        }
        response = requests.post(f"{BASE_URL}/api/admin/raw-materials/{material_id}/adjust-stock", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Note: actual qty depends on current state
        print(f"PASS: Stock add adjustment successful, new qty: {data.get('quantity_on_hand')}")
    
    def test_adjust_stock_remove(self, auth_headers, test_material):
        """Test removing stock"""
        material_id = test_material["id"]
        
        payload = {
            "type": "remove",
            "quantity": 25,
            "reason": "Test stock removal"
        }
        response = requests.post(f"{BASE_URL}/api/admin/raw-materials/{material_id}/adjust-stock", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: Stock remove adjustment successful, new qty: {data.get('quantity_on_hand')}")
    
    def test_adjust_stock_set(self, auth_headers, test_material):
        """Test setting stock to specific value"""
        material_id = test_material["id"]
        
        payload = {
            "type": "set",
            "quantity": 200,
            "reason": "Test stock correction"
        }
        response = requests.post(f"{BASE_URL}/api/admin/raw-materials/{material_id}/adjust-stock", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("quantity_on_hand") == 200
        print("PASS: Stock set adjustment successful, qty set to 200")


# ============== STATS TESTS ==============

class TestMaterialStats:
    """Raw material statistics tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_material_stats_summary(self, auth_headers):
        """Get material statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials/stats/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_materials" in data
        assert "active_materials" in data
        assert "low_stock_count" in data
        assert "total_inventory_value" in data
        print(f"PASS: Stats - Total: {data['total_materials']}, Active: {data['active_materials']}, Low Stock: {data['low_stock_count']}")
    
    def test_low_stock_materials(self, auth_headers):
        """Get low stock materials"""
        response = requests.get(f"{BASE_URL}/api/admin/raw-materials/low-stock", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Low stock materials returned {len(data)} items")


# ============== PRODUCTION QUEUE FILTER TEST ==============

class TestProductionQueueFilter:
    """Test production queue with assigned_to filter"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_production_queue_list(self, auth_headers):
        """List production queue"""
        response = requests.get(f"{BASE_URL}/api/admin/production/queue", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Production queue returned {len(data)} items")
    
    def test_production_queue_filter_by_assigned_to(self, auth_headers):
        """Filter production queue by assigned_to"""
        response = requests.get(f"{BASE_URL}/api/admin/production/queue?assigned_to=TestUser", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Even if empty, the filter should work
        print(f"PASS: Production queue filter by assigned_to returned {len(data)} items")
    
    def test_production_stats(self, auth_headers):
        """Get production stats"""
        response = requests.get(f"{BASE_URL}/api/admin/production/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "queued" in data
        assert "in_progress" in data
        print(f"PASS: Production stats - Total: {data['total']}, Queued: {data['queued']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
