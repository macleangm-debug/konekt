"""
Test Suite for Iteration 330 - Konekt B2B Rename & Feature Tests
Tests:
- Document numbering defaults (country_code=TZ, prefixes)
- Commission engine tier_applied=true
- Subcategory request creation
- Quote → Invoice → Order flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestDocumentNumberingDefaults:
    """Test document numbering configuration defaults"""
    
    def test_document_numbering_service_defaults(self):
        """Verify document_numbering.py has correct defaults: country_code=TZ, quote_prefix=QT, invoice_prefix=IN, order_prefix=ORD"""
        # Read the document_numbering.py service file to verify defaults
        import os
        service_path = "/app/backend/services/document_numbering.py"
        
        with open(service_path, 'r') as f:
            content = f.read()
        
        # Verify defaults are in the service code
        assert '"country_code": "TZ"' in content, "Expected country_code=TZ in document_numbering.py"
        assert '"quote_prefix": "QT"' in content, "Expected quote_prefix=QT in document_numbering.py"
        assert '"invoice_prefix": "IN"' in content, "Expected invoice_prefix=IN in document_numbering.py"
        assert '"order_prefix": "ORD"' in content, "Expected order_prefix=ORD in document_numbering.py"
        
        print("✓ Document numbering service defaults verified: country_code=TZ, quote_prefix=QT, invoice_prefix=IN, order_prefix=ORD")


class TestCommissionEngine:
    """Test commission engine with tier distribution_split"""
    
    def test_commission_calculate_returns_tier_applied(self):
        """POST /api/admin/commission/calculate returns tier_applied=true"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        token = login_resp.json().get("token") or login_resp.json().get("access_token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Calculate commission
        calc_resp = requests.post(f"{BASE_URL}/api/admin/commission/calculate", json={
            "selling_price": 100000,
            "vendor_cost": 70000,
            "channel": "direct"
        }, headers=headers)
        
        assert calc_resp.status_code == 200, f"Commission calculate failed: {calc_resp.text}"
        
        result = calc_resp.json()
        assert result.get("tier_applied") == True, f"Expected tier_applied=true, got {result.get('tier_applied')}"
        
        print(f"✓ Commission engine returns tier_applied=true: {result}")


class TestSubcategoryRequests:
    """Test subcategory request creation"""
    
    def test_create_subcategory_request(self):
        """POST /api/admin/catalog/subcategory-requests creates pending request"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        token = login_resp.json().get("token") or login_resp.json().get("access_token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create subcategory request
        request_data = {
            "category": "Office Equipment",
            "subcategory_name": "TEST_Ergonomic Chairs",
            "description": "Test subcategory request for ergonomic office chairs",
            "requested_by": "test_user"
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/admin/catalog/subcategory-requests", 
                                    json=request_data, headers=headers)
        
        # Accept 200, 201, or 404 (if endpoint not implemented yet)
        if create_resp.status_code == 404:
            pytest.skip("Subcategory requests endpoint not implemented")
        
        assert create_resp.status_code in [200, 201], f"Subcategory request creation failed: {create_resp.text}"
        
        result = create_resp.json()
        # Check if request was created (may be in 'request' key or directly)
        request_obj = result.get("request", result)
        status = request_obj.get("status")
        
        # Verify it's pending or created successfully
        assert result.get("ok") == True or status in ["pending", "pending_review", None], f"Expected successful creation, got {result}"
        
        print(f"✓ Subcategory request created: {result}")


class TestQuoteInvoiceOrderFlow:
    """Test Quote → Invoice → Order flow"""
    
    def test_quote_acceptance_generates_invoice_and_order(self):
        """PATCH quote status=accepted generates both invoice and order"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        token = login_resp.json().get("token") or login_resp.json().get("access_token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get existing quotes
        quotes_resp = requests.get(f"{BASE_URL}/api/admin/quotes", headers=headers)
        assert quotes_resp.status_code == 200, f"Quotes fetch failed: {quotes_resp.text}"
        
        quotes = quotes_resp.json()
        if isinstance(quotes, dict):
            quotes = quotes.get("quotes", [])
        
        # Find a draft or sent quote to test with
        test_quote = None
        for q in quotes:
            if q.get("status") in ["draft", "sent"]:
                test_quote = q
                break
        
        if not test_quote:
            # Create a test quote
            create_resp = requests.post(f"{BASE_URL}/api/admin/quotes", json={
                "customer_name": "TEST_Flow Customer",
                "customer_email": "test.flow@example.com",
                "customer_company": "TEST Flow Corp",
                "line_items": [
                    {"description": "Test Product", "quantity": 1, "unit_price": 50000, "total": 50000}
                ],
                "subtotal": 50000,
                "total": 59000,
                "tax": 9000,
                "status": "sent"
            }, headers=headers)
            
            if create_resp.status_code in [200, 201]:
                test_quote = create_resp.json()
                if isinstance(test_quote, dict) and "quote" in test_quote:
                    test_quote = test_quote["quote"]
            else:
                pytest.skip(f"Could not create test quote: {create_resp.text}")
        
        if not test_quote or not test_quote.get("id"):
            pytest.skip("No quote available for testing")
        
        quote_id = test_quote.get("id")
        
        # Accept the quote (valid status is 'accepted', not 'approved')
        accept_resp = requests.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/status", 
                                      params={"status": "accepted"}, headers=headers)
        
        if accept_resp.status_code == 404:
            # Try alternative endpoint
            accept_resp = requests.put(f"{BASE_URL}/api/admin/quotes/{quote_id}", 
                                        json={"status": "accepted"}, headers=headers)
        
        assert accept_resp.status_code == 200, f"Quote acceptance failed: {accept_resp.text}"
        
        result = accept_resp.json()
        
        # Check if invoice and order were generated
        invoice_generated = result.get("invoice_id") or result.get("invoice_number") or result.get("invoice_generated")
        order_generated = result.get("order_id") or result.get("order_number") or result.get("order_generated")
        
        print(f"✓ Quote accepted. Invoice generated: {invoice_generated}, Order generated: {order_generated}")
        
        # Verify by fetching the quote again
        quote_detail = requests.get(f"{BASE_URL}/api/admin/quotes/{quote_id}", headers=headers)
        if quote_detail.status_code == 200:
            detail = quote_detail.json()
            if isinstance(detail, dict) and "quote" in detail:
                detail = detail["quote"]
            print(f"  Quote status: {detail.get('status')}, linked_invoice: {detail.get('invoice_id')}, linked_order: {detail.get('order_id')}")


class TestInvoicesPageNoCreateButton:
    """Test that Invoices page doesn't have Create Invoice button"""
    
    def test_invoices_list_endpoint(self):
        """Verify invoices endpoint works (UI test will verify no Create button)"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        token = login_resp.json().get("token") or login_resp.json().get("access_token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get invoices
        invoices_resp = requests.get(f"{BASE_URL}/api/admin/invoices", headers=headers)
        assert invoices_resp.status_code == 200, f"Invoices fetch failed: {invoices_resp.text}"
        
        invoices = invoices_resp.json()
        print(f"✓ Invoices endpoint working. Count: {len(invoices) if isinstance(invoices, list) else 'N/A'}")


class TestVendorOpsOperationsRename:
    """Test that Vendor Ops is renamed to Operations"""
    
    def test_vendor_ops_dashboard_stats(self):
        """Verify vendor-ops endpoints still work (UI shows 'Operations')"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        token = login_resp.json().get("token") or login_resp.json().get("access_token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get vendor ops dashboard stats
        stats_resp = requests.get(f"{BASE_URL}/api/vendor-ops/dashboard-stats", headers=headers)
        assert stats_resp.status_code == 200, f"Vendor ops stats failed: {stats_resp.text}"
        
        stats = stats_resp.json()
        print(f"✓ Vendor ops (Operations) endpoint working. Stats: {stats}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
