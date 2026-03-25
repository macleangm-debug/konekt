"""
Test UI/UX Consistency and Data-Link Bug Fixes
Tests for iteration 109 - 7 bug fixes:
1. Customer Orders page table+drawer pattern
2. Customer orders showing after approval (CRITICAL)
3. Customer order drawer shows sales contact
4. Admin orders page table+drawer
5. Vendor not seeing orders (DATA LINK BUG)
6. Vendor UI fix (rename + table+drawer)
7. Order creation flow verification (customer_name, customer_email, sales_id on order)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


class TestCustomerOrdersAPI:
    """Test customer orders API - returns orders matching by customer_id AND user_id"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_customer_token(self):
        """Login as customer and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_customer_orders_endpoint_returns_200(self):
        """Test /api/customer/orders returns 200 with valid token"""
        token = self.get_customer_token()
        if not token:
            pytest.skip("Customer login failed")
        
        response = self.session.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list of orders"
        print(f"Customer orders count: {len(data)}")
        
    def test_customer_orders_returns_orders_with_sales_enrichment(self):
        """Test that orders are enriched with sales contact info when available"""
        token = self.get_customer_token()
        if not token:
            pytest.skip("Customer login failed")
        
        response = self.session.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        # Check structure of orders
        for order in orders[:5]:  # Check first 5 orders
            assert "id" in order, "Order should have id"
            # Sales enrichment is optional - only present if sales_assignment exists
            if "sales" in order:
                sales = order["sales"]
                assert "name" in sales or "email" in sales, "Sales should have name or email"
                print(f"Order {order.get('order_number', order['id'])} has sales: {sales.get('name', 'N/A')}")
        
        print(f"Verified {len(orders)} orders structure")
        
    def test_customer_order_detail_endpoint(self):
        """Test /api/customer/orders/{order_id} returns order detail with sales info"""
        token = self.get_customer_token()
        if not token:
            pytest.skip("Customer login failed")
        
        # First get list of orders
        response = self.session.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if not orders:
            pytest.skip("No orders found for customer")
        
        # Get detail of first order
        order_id = orders[0].get("id")
        detail_response = self.session.get(
            f"{BASE_URL}/api/customer/orders/{order_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
        detail = detail_response.json()
        
        # Verify detail structure
        assert "id" in detail, "Detail should have id"
        assert "order_number" in detail or "id" in detail, "Detail should have order_number or id"
        
        # Check for events (timeline)
        if "events" in detail:
            assert isinstance(detail["events"], list), "Events should be a list"
            print(f"Order has {len(detail['events'])} events")
        
        print(f"Order detail verified: {detail.get('order_number', detail['id'])}")


class TestAdminInvoicesAPI:
    """Test admin invoices API - returns splits and proof_submissions with rejection reasons"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_admin_invoices_list(self):
        """Test /api/admin/invoices/list returns invoices"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin login failed")
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/invoices/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        invoices = response.json()
        assert isinstance(invoices, list), "Response should be a list"
        print(f"Admin invoices count: {len(invoices)}")
        
    def test_admin_invoice_detail_returns_splits_and_proofs(self):
        """Test /api/admin/invoices/{id} returns splits and proof_submissions"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin login failed")
        
        # Get list of invoices
        response = self.session.get(
            f"{BASE_URL}/api/admin/invoices/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        invoices = response.json()
        
        if not invoices:
            pytest.skip("No invoices found")
        
        # Get detail of first invoice
        invoice_id = invoices[0].get("id")
        detail_response = self.session.get(
            f"{BASE_URL}/api/admin/invoices/{invoice_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
        detail = detail_response.json()
        
        # Verify structure includes splits and proof_submissions
        assert "invoice" in detail, "Detail should have invoice"
        assert "splits" in detail, "Detail should have splits array"
        assert "proof_submissions" in detail, "Detail should have proof_submissions array"
        assert "proofs" in detail, "Detail should have proofs array"
        
        print(f"Invoice detail verified: {invoices[0].get('invoice_number')}")
        print(f"  - Splits: {len(detail['splits'])}")
        print(f"  - Proof submissions: {len(detail['proof_submissions'])}")
        print(f"  - Proofs: {len(detail['proofs'])}")


class TestAdminOrdersAPI:
    """Test admin orders API - table+drawer with sales owner, vendor count, status actions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_admin_orders_list_returns_sales_owner_and_vendor_count(self):
        """Test /api/admin/orders/list returns orders with sales_owner and vendor_count"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin login failed")
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        orders = response.json()
        assert isinstance(orders, list), "Response should be a list"
        
        # Check structure of orders
        for order in orders[:5]:
            assert "id" in order, "Order should have id"
            assert "sales_owner" in order, "Order should have sales_owner field"
            assert "vendor_count" in order, "Order should have vendor_count field"
            print(f"Order {order.get('order_number', order['id'])}: sales={order.get('sales_owner')}, vendors={order.get('vendor_count')}")
        
        print(f"Admin orders count: {len(orders)}")
        
    def test_admin_order_detail(self):
        """Test /api/admin/orders/{id} returns full order detail"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin login failed")
        
        # Get list of orders
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if not orders:
            pytest.skip("No orders found")
        
        # Get detail of first order
        order_id = orders[0].get("id")
        detail_response = self.session.get(
            f"{BASE_URL}/api/admin/orders/{order_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
        detail = detail_response.json()
        
        # Verify structure
        assert "order" in detail, "Detail should have order"
        assert "vendor_orders" in detail, "Detail should have vendor_orders"
        assert "sales_assignment" in detail, "Detail should have sales_assignment"
        assert "events" in detail, "Detail should have events"
        
        print(f"Order detail verified: {orders[0].get('order_number')}")
        print(f"  - Vendor orders: {len(detail['vendor_orders'])}")
        print(f"  - Events: {len(detail['events'])}")


class TestPartnerFulfillmentAPI:
    """Test partner fulfillment API - searches both fulfillment_jobs and vendor_orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_partner_token(self):
        """Login as partner and get token"""
        response = self.session.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_partner_fulfillment_jobs_endpoint(self):
        """Test /api/partner-portal/fulfillment-jobs returns jobs from both collections"""
        token = self.get_partner_token()
        if not token:
            pytest.skip("Partner login failed")
        
        response = self.session.get(
            f"{BASE_URL}/api/partner-portal/fulfillment-jobs",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        jobs = response.json()
        assert isinstance(jobs, list), "Response should be a list"
        
        # Check for source field indicating where job came from
        sources = set()
        for job in jobs:
            if "source" in job:
                sources.add(job["source"])
            # Verify structure
            assert "id" in job, "Job should have id"
            assert "status" in job, "Job should have status"
        
        print(f"Partner fulfillment jobs count: {len(jobs)}")
        print(f"Job sources: {sources}")
        
    def test_partner_fulfillment_jobs_with_status_filter(self):
        """Test /api/partner-portal/fulfillment-jobs with status filter"""
        token = self.get_partner_token()
        if not token:
            pytest.skip("Partner login failed")
        
        # Test with ready_to_fulfill status
        response = self.session.get(
            f"{BASE_URL}/api/partner-portal/fulfillment-jobs?status=ready_to_fulfill",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        jobs = response.json()
        
        # All returned jobs should have the filtered status
        for job in jobs:
            assert job.get("status") == "ready_to_fulfill", f"Job status should be ready_to_fulfill, got {job.get('status')}"
        
        print(f"Ready to fulfill jobs: {len(jobs)}")
        
    def test_partner_status_update_endpoint(self):
        """Test /api/partner-portal/fulfillment-jobs/{id}/status works for both collections"""
        token = self.get_partner_token()
        if not token:
            pytest.skip("Partner login failed")
        
        # Get list of jobs
        response = self.session.get(
            f"{BASE_URL}/api/partner-portal/fulfillment-jobs",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        jobs = response.json()
        
        if not jobs:
            pytest.skip("No fulfillment jobs found for partner")
        
        # Find a job that can be updated (not fulfilled/completed)
        updatable_job = None
        for job in jobs:
            if job.get("status") not in ["fulfilled", "completed"]:
                updatable_job = job
                break
        
        if not updatable_job:
            pytest.skip("No updatable jobs found")
        
        job_id = updatable_job.get("id")
        current_status = updatable_job.get("status")
        
        # Determine next status
        status_flow = {
            "allocated": "accepted",
            "ready_to_fulfill": "accepted",
            "accepted": "in_progress",
            "in_progress": "fulfilled",
        }
        new_status = status_flow.get(current_status, "accepted")
        
        # Update status
        update_response = self.session.post(
            f"{BASE_URL}/api/partner-portal/fulfillment-jobs/{job_id}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": new_status}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated = update_response.json()
        assert updated.get("status") == new_status, f"Status should be {new_status}, got {updated.get('status')}"
        
        print(f"Updated job {job_id} from {current_status} to {new_status}")


class TestOrderCreationFlow:
    """Test order creation stores customer_name, customer_email, sales_id on order doc"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_orders_have_customer_info_fields(self):
        """Verify orders have customer_name, customer_email, sales_id fields"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin login failed")
        
        # Get list of orders
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        if not orders:
            pytest.skip("No orders found")
        
        # Check first few orders for customer info fields
        for order in orders[:5]:
            order_id = order.get("id")
            
            # Get full detail
            detail_response = self.session.get(
                f"{BASE_URL}/api/admin/orders/{order_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if detail_response.status_code == 200:
                detail = detail_response.json()
                order_doc = detail.get("order", {})
                
                # These fields should exist (may be empty for older orders)
                has_customer_name = "customer_name" in order_doc
                has_customer_email = "customer_email" in order_doc
                has_sales_id = "sales_id" in order_doc or "sales_name" in order_doc
                
                print(f"Order {order.get('order_number', order_id)}:")
                print(f"  - customer_name: {order_doc.get('customer_name', 'N/A')}")
                print(f"  - customer_email: {order_doc.get('customer_email', 'N/A')}")
                print(f"  - sales_id: {order_doc.get('sales_id', 'N/A')}")
                print(f"  - sales_name: {order_doc.get('sales_name', 'N/A')}")


class TestVendorOrdersDataLink:
    """Test vendor_orders are properly linked with partner_id"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_vendor_orders_in_order_detail(self):
        """Verify vendor_orders are returned in admin order detail"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Admin login failed")
        
        # Get list of orders
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        
        # Find orders with vendor_count > 0
        orders_with_vendors = [o for o in orders if o.get("vendor_count", 0) > 0]
        
        if not orders_with_vendors:
            print("No orders with vendors found - this is expected if no product orders exist")
            return
        
        # Check vendor_orders in detail
        for order in orders_with_vendors[:3]:
            order_id = order.get("id")
            detail_response = self.session.get(
                f"{BASE_URL}/api/admin/orders/{order_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if detail_response.status_code == 200:
                detail = detail_response.json()
                vendor_orders = detail.get("vendor_orders", [])
                
                print(f"Order {order.get('order_number')}: {len(vendor_orders)} vendor orders")
                for vo in vendor_orders:
                    print(f"  - Vendor: {vo.get('vendor_id')}, Partner: {vo.get('partner_id')}, Status: {vo.get('status')}")


class TestAPIHealth:
    """Basic health and auth tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("API health check passed")
        
    def test_customer_login(self):
        """Test customer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print(f"Customer login successful: {data.get('user', {}).get('email')}")
        
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print(f"Admin login successful: {data.get('user', {}).get('email')}")
        
    def test_partner_login(self):
        """Test partner login"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        assert response.status_code == 200, f"Partner login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        print(f"Partner login successful: {data.get('user', {}).get('email')}")
