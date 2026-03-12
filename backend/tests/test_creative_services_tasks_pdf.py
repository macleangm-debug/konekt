"""
Tests for:
1. PDF Service v2 - Quote and Invoice PDF generation
2. Creative Services v2 - Service detail page, dynamic brief form, add-ons, order submission
3. Tasks API - My Tasks vs Team Overview toggle functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def auth_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestPDFServiceV2:
    """PDF generation tests - Quote and Invoice PDFs"""
    
    def test_get_quote_for_pdf(self, auth_headers):
        """Get a quote to use for PDF testing"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes", headers=auth_headers)
        assert response.status_code == 200
        quotes = response.json()
        assert len(quotes) > 0, "No quotes found for PDF testing"
        return quotes[0]["id"]
    
    def test_export_quote_pdf(self, auth_headers):
        """Test quote PDF generation with v2 service"""
        # Get a quote ID first
        quotes_response = requests.get(f"{BASE_URL}/api/admin/quotes", headers=auth_headers)
        assert quotes_response.status_code == 200
        quotes = quotes_response.json()
        assert len(quotes) > 0
        quote_id = quotes[0]["id"]
        
        # Export PDF
        response = requests.get(f"{BASE_URL}/api/admin/pdf/quote/{quote_id}")
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF content
        content = response.content
        assert len(content) > 1000, "PDF seems too small"
        assert content.startswith(b"%PDF"), "Invalid PDF header"
        print(f"Quote PDF generated: {len(content)} bytes")
    
    def test_export_invoice_pdf(self, auth_headers):
        """Test invoice PDF generation with v2 service"""
        # Get an invoice ID first
        invoices_response = requests.get(f"{BASE_URL}/api/admin/invoices", headers=auth_headers)
        assert invoices_response.status_code == 200
        invoices = invoices_response.json()
        assert len(invoices) > 0
        invoice_id = invoices[0]["id"]
        
        # Export PDF
        response = requests.get(f"{BASE_URL}/api/admin/pdf/invoice/{invoice_id}")
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF content
        content = response.content
        assert len(content) > 1000, "PDF seems too small"
        assert content.startswith(b"%PDF"), "Invalid PDF header"
        print(f"Invoice PDF generated: {len(content)} bytes")
    
    def test_pdf_not_found(self):
        """Test PDF 404 response for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/admin/pdf/quote/000000000000000000000000")
        assert response.status_code == 404
    
    def test_pdf_invalid_id(self):
        """Test PDF 404 response for malformed ID"""
        response = requests.get(f"{BASE_URL}/api/admin/pdf/quote/invalid-id")
        assert response.status_code == 404


class TestCreativeServicesV2:
    """Creative Services API - service details, brief fields, add-ons"""
    
    def test_list_active_services(self):
        """List all active creative services"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2")
        assert response.status_code == 200
        services = response.json()
        assert isinstance(services, list)
        print(f"Found {len(services)} active creative services")
    
    def test_get_flyer_design_service(self):
        """Get flyer-design service details"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2/flyer-design")
        assert response.status_code == 200
        
        service = response.json()
        assert service["slug"] == "flyer-design"
        assert service["title"] == "Flyer Design"
        assert service["base_price"] == 120000.0
        assert service["currency"] == "TZS"
        assert service["is_active"] == True
        print(f"Flyer Design service: {service['title']} - TZS {service['base_price']}")
    
    def test_flyer_design_brief_fields(self):
        """Verify flyer-design has required brief fields with different types"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2/flyer-design")
        assert response.status_code == 200
        
        service = response.json()
        brief_fields = service.get("brief_fields", [])
        
        # Should have 5 brief fields
        assert len(brief_fields) >= 5, f"Expected 5 brief fields, got {len(brief_fields)}"
        
        # Verify field types
        field_types = {f["key"]: f["field_type"] for f in brief_fields}
        
        assert field_types.get("campaign_name") == "text", "campaign_name should be text type"
        assert field_types.get("audience") == "textarea", "audience should be textarea type"
        assert field_types.get("format_size") == "select", "format_size should be select type"
        assert field_types.get("content_ready") == "boolean", "content_ready should be boolean type"
        
        # Verify select options exist
        format_field = next((f for f in brief_fields if f["key"] == "format_size"), None)
        assert format_field is not None
        assert len(format_field.get("options", [])) > 0, "format_size should have options"
        
        print(f"Brief fields verified: {list(field_types.keys())}")
    
    def test_flyer_design_addons(self):
        """Verify flyer-design has add-ons with prices"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2/flyer-design")
        assert response.status_code == 200
        
        service = response.json()
        addons = service.get("addons", [])
        
        # Should have 3 add-ons
        assert len(addons) >= 3, f"Expected 3 addons, got {len(addons)}"
        
        addon_prices = {a["code"]: a["price"] for a in addons}
        
        assert addon_prices.get("copywriting") == 60000.0, "Copywriting should be 60000"
        assert addon_prices.get("stock_images") == 40000.0, "Stock images should be 40000"
        assert addon_prices.get("rush") == 50000.0, "Rush should be 50000"
        
        print(f"Add-ons verified: {list(addon_prices.keys())}")
    
    def test_get_logo_design_service(self):
        """Get logo-design service details"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2/logo-design")
        assert response.status_code == 200
        
        service = response.json()
        assert service["slug"] == "logo-design"
        assert service["is_active"] == True
        print(f"Logo Design service found: {service['title']}")
    
    def test_service_not_found(self):
        """Test 404 for non-existent service"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2/nonexistent-service")
        assert response.status_code == 404
    
    def test_submit_creative_brief_order(self):
        """Test submitting a creative brief order"""
        payload = {
            "service_slug": "flyer-design",
            "customer_name": "TEST Creative Brief User",
            "customer_email": "test-creative@example.com",
            "customer_phone": "+255700000000",
            "company_name": "Test Company",
            "brief_answers": {
                "campaign_name": "Test Campaign 2026",
                "audience": "Young professionals aged 25-35",
                "format_size": "A4",
                "content_ready": False,
                "call_to_action": "Visit our website"
            },
            "selected_addons": ["copywriting", "rush"],
            "uploaded_files": [],
            "notes": "This is a test order"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/creative-services-v2/orders",
            json=payload
        )
        assert response.status_code == 200
        
        order = response.json()
        assert order["customer_name"] == "TEST Creative Brief User"
        assert order["customer_email"] == "test-creative@example.com"
        assert order["service_slug"] == "flyer-design"
        assert order["status"] == "brief_submitted"
        
        # Verify pricing calculation
        assert order["base_price"] == 120000.0
        assert order["addon_total"] == 110000.0  # copywriting (60k) + rush (50k)
        assert order["total_price"] == 230000.0  # 120k + 110k
        
        print(f"Order created: {order['id']} - Total: TZS {order['total_price']}")
        return order["id"]


class TestTasksAPI:
    """Tasks API - CRUD and filtering for My Tasks vs Team Overview"""
    
    def test_get_all_tasks(self, auth_headers):
        """Get all tasks (admin view)"""
        response = requests.get(f"{BASE_URL}/api/admin/tasks", headers=auth_headers)
        assert response.status_code == 200
        tasks = response.json()
        assert isinstance(tasks, list)
        print(f"Total tasks: {len(tasks)}")
    
    def test_tasks_have_required_fields(self, auth_headers):
        """Verify tasks have fields needed for My Tasks filtering"""
        response = requests.get(f"{BASE_URL}/api/admin/tasks", headers=auth_headers)
        assert response.status_code == 200
        tasks = response.json()
        
        if len(tasks) > 0:
            task = tasks[0]
            assert "id" in task
            assert "title" in task
            assert "status" in task
            assert "assigned_to" in task  # Required for My Tasks filtering
            assert "priority" in task
            
            print(f"Task fields verified: {list(task.keys())}")
    
    def test_filter_tasks_by_status(self, auth_headers):
        """Test filtering tasks by status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tasks",
            params={"status": "todo"},
            headers=auth_headers
        )
        assert response.status_code == 200
        tasks = response.json()
        
        # All returned tasks should have status 'todo'
        for task in tasks:
            assert task["status"] == "todo"
        
        print(f"Todo tasks: {len(tasks)}")
    
    def test_filter_tasks_by_priority(self, auth_headers):
        """Test filtering tasks by priority"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tasks",
            params={"priority": "high"},
            headers=auth_headers
        )
        assert response.status_code == 200
        tasks = response.json()
        
        # All returned tasks should have priority 'high'
        for task in tasks:
            assert task["priority"] == "high"
        
        print(f"High priority tasks: {len(tasks)}")
    
    def test_create_and_verify_task(self, auth_headers):
        """Create a task and verify it persists"""
        # Create task
        payload = {
            "title": "TEST Task for iteration 21",
            "description": "Test task for My Tasks/Team Overview feature",
            "assigned_to": "Admin User",  # Assign to current user
            "department": "Testing",
            "priority": "medium",
            "status": "todo"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/tasks",
            json=payload,
            headers=auth_headers
        )
        assert create_response.status_code in [200, 201]
        
        created_task = create_response.json()
        task_id = created_task["id"]
        assert created_task["title"] == payload["title"]
        assert created_task["assigned_to"] == "Admin User"
        
        print(f"Task created: {task_id}")
        
        # Verify task appears in list
        list_response = requests.get(f"{BASE_URL}/api/admin/tasks", headers=auth_headers)
        assert list_response.status_code == 200
        tasks = list_response.json()
        
        task_ids = [t["id"] for t in tasks]
        assert task_id in task_ids, "Created task not found in list"
        
        print(f"Task {task_id} verified in task list")
        return task_id
    
    def test_update_task_status(self, auth_headers):
        """Test updating task status"""
        # Get existing task
        list_response = requests.get(f"{BASE_URL}/api/admin/tasks", headers=auth_headers)
        tasks = list_response.json()
        
        if len(tasks) == 0:
            pytest.skip("No tasks available for status update test")
        
        task = tasks[0]
        task_id = task["id"]
        original_status = task["status"]
        new_status = "in_progress" if original_status == "todo" else "todo"
        
        # Update status - status is a query parameter, not JSON body
        update_response = requests.patch(
            f"{BASE_URL}/api/admin/tasks/{task_id}/status",
            params={"status": new_status},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/admin/tasks", headers=auth_headers)
        updated_tasks = verify_response.json()
        updated_task = next((t for t in updated_tasks if t["id"] == task_id), None)
        
        assert updated_task is not None
        assert updated_task["status"] == new_status
        
        # Revert status
        requests.patch(
            f"{BASE_URL}/api/admin/tasks/{task_id}/status",
            params={"status": original_status},
            headers=auth_headers
        )
        
        print(f"Task status updated: {original_status} -> {new_status}")


class TestPricingCalculation:
    """Test pricing calculations for creative services"""
    
    def test_total_calculation_with_addons(self):
        """Verify pricing: base + addons = total"""
        response = requests.get(f"{BASE_URL}/api/creative-services-v2/flyer-design")
        assert response.status_code == 200
        
        service = response.json()
        base_price = service["base_price"]
        addons = service["addons"]
        
        # Calculate expected total with all addons
        addon_total = sum(a["price"] for a in addons if a.get("is_active", True))
        expected_total = base_price + addon_total
        
        # Test order submission with all addons
        payload = {
            "service_slug": "flyer-design",
            "customer_name": "TEST Pricing User",
            "customer_email": "test-pricing@example.com",
            "brief_answers": {
                "campaign_name": "Pricing Test",
                "audience": "Test audience",
                "format_size": "A5"
            },
            "selected_addons": [a["code"] for a in addons if a.get("is_active", True)]
        }
        
        order_response = requests.post(
            f"{BASE_URL}/api/creative-services-v2/orders",
            json=payload
        )
        assert order_response.status_code == 200
        
        order = order_response.json()
        assert order["base_price"] == base_price
        assert order["addon_total"] == addon_total
        assert order["total_price"] == expected_total
        
        print(f"Pricing verified: Base {base_price} + Addons {addon_total} = Total {expected_total}")
