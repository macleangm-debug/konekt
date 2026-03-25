"""
Test Admin/CRM Refactor Pass 3, 4, 5 - Backend API Tests
Tests for:
- Pass 3: Sales CRM, Customers, Vendors pages
- Pass 4: Affiliates & Referrals, Products & Services, Business Settings pages
- Pass 5: Users & Roles, Audit Log pages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSalesCrmAPIs:
    """Pass 3: Sales CRM page APIs"""
    
    def test_sales_crm_leads(self):
        """GET /api/admin/sales-crm/leads returns leads and service requests"""
        response = requests.get(f"{BASE_URL}/api/admin/sales-crm/leads")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of leads"
        print(f"Sales CRM Leads: {len(data)} records returned")
        if data:
            # Check enrichment fields
            first = data[0]
            assert "record_type" in first, "Missing record_type field"
            print(f"First lead record_type: {first.get('record_type')}")
    
    def test_sales_crm_leads_with_status_filter(self):
        """GET /api/admin/sales-crm/leads with status filter"""
        response = requests.get(f"{BASE_URL}/api/admin/sales-crm/leads", params={"status": "new"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Sales CRM Leads (status=new): {len(data)} records")
    
    def test_sales_crm_accounts(self):
        """GET /api/admin/sales-crm/accounts returns customer accounts with order counts"""
        response = requests.get(f"{BASE_URL}/api/admin/sales-crm/accounts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of accounts"
        print(f"Sales CRM Accounts: {len(data)} records returned")
        if data:
            first = data[0]
            assert "total_orders" in first, "Missing total_orders enrichment"
            assert "assigned_sales" in first, "Missing assigned_sales enrichment"
            print(f"First account: {first.get('full_name')} - {first.get('total_orders')} orders")
    
    def test_sales_crm_performance(self):
        """GET /api/admin/sales-crm/performance returns sales performance cards"""
        response = requests.get(f"{BASE_URL}/api/admin/sales-crm/performance")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of performance data"
        print(f"Sales CRM Performance: {len(data)} sales reps")
        if data:
            first = data[0]
            assert "name" in first
            assert "leads" in first
            assert "orders" in first
            print(f"First rep: {first.get('name')} - {first.get('leads')} leads, {first.get('orders')} orders")


class TestCustomersAPIs:
    """Pass 3: Customers page APIs"""
    
    def test_customers_list(self):
        """GET /api/admin/customers/list returns enriched customer list"""
        response = requests.get(f"{BASE_URL}/api/admin/customers/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of customers"
        print(f"Customers List: {len(data)} customers returned")
        if data:
            first = data[0]
            assert "total_orders" in first, "Missing total_orders enrichment"
            assert "referral_code" in first, "Missing referral_code enrichment"
            assert "assigned_sales" in first, "Missing assigned_sales enrichment"
            print(f"First customer: {first.get('full_name')} - {first.get('total_orders')} orders")
    
    def test_customers_list_with_search(self):
        """GET /api/admin/customers/list with search filter"""
        response = requests.get(f"{BASE_URL}/api/admin/customers/list", params={"search": "test"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Customers List (search=test): {len(data)} customers")
    
    def test_customer_detail(self):
        """GET /api/admin/customers/detail/{id} returns customer with orders and invoices"""
        # First get a customer ID
        list_response = requests.get(f"{BASE_URL}/api/admin/customers/list")
        customers = list_response.json()
        if not customers:
            pytest.skip("No customers to test detail endpoint")
        
        customer_id = customers[0].get("id") or customers[0].get("email")
        response = requests.get(f"{BASE_URL}/api/admin/customers/detail/{customer_id}")
        assert response.status_code == 200
        data = response.json()
        assert "customer" in data, "Missing customer field"
        assert "orders" in data, "Missing orders field"
        assert "invoices" in data, "Missing invoices field"
        print(f"Customer Detail: {data['customer'].get('full_name')} - {len(data['orders'])} orders, {len(data['invoices'])} invoices")


class TestVendorsAPIs:
    """Pass 3: Vendors page APIs"""
    
    def test_vendors_list(self):
        """GET /api/admin/vendors/list returns vendors with active_orders and released_jobs counts"""
        response = requests.get(f"{BASE_URL}/api/admin/vendors/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of vendors"
        print(f"Vendors List: {len(data)} vendors returned")
        if data:
            first = data[0]
            assert "active_orders" in first, "Missing active_orders enrichment"
            assert "released_jobs" in first, "Missing released_jobs enrichment"
            print(f"First vendor: {first.get('company_name') or first.get('name')} - {first.get('active_orders')} active orders")
    
    def test_vendors_list_with_search(self):
        """GET /api/admin/vendors/list with search filter"""
        response = requests.get(f"{BASE_URL}/api/admin/vendors/list", params={"search": "print"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Vendors List (search=print): {len(data)} vendors")
    
    def test_vendor_detail(self):
        """GET /api/admin/vendors/{id} returns vendor with orders"""
        # First get a vendor ID
        list_response = requests.get(f"{BASE_URL}/api/admin/vendors/list")
        vendors = list_response.json()
        if not vendors:
            pytest.skip("No vendors to test detail endpoint")
        
        vendor_id = vendors[0].get("id")
        response = requests.get(f"{BASE_URL}/api/admin/vendors/{vendor_id}")
        assert response.status_code == 200
        data = response.json()
        assert "vendor" in data, "Missing vendor field"
        assert "orders" in data, "Missing orders field"
        print(f"Vendor Detail: {data['vendor'].get('company_name') or data['vendor'].get('name')} - {len(data['orders'])} orders")


class TestAffiliatesReferralsAPIs:
    """Pass 4: Affiliates & Referrals page APIs"""
    
    def test_affiliates_list(self):
        """GET /api/admin/affiliates/list returns affiliates"""
        response = requests.get(f"{BASE_URL}/api/admin/affiliates/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of affiliates"
        print(f"Affiliates List: {len(data)} affiliates returned")
        if data:
            first = data[0]
            print(f"First affiliate: {first.get('name')} - {first.get('email')} - status: {first.get('status')}")
    
    def test_referrals_list(self):
        """GET /api/admin/referrals/list returns referral events and codes"""
        response = requests.get(f"{BASE_URL}/api/admin/referrals/list")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data, "Missing events field"
        assert "codes" in data, "Missing codes field"
        print(f"Referrals: {len(data['events'])} events, {len(data['codes'])} codes")
    
    def test_commissions_list(self):
        """GET /api/admin/commissions/list returns commissions"""
        response = requests.get(f"{BASE_URL}/api/admin/commissions/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of commissions"
        print(f"Commissions List: {len(data)} commissions returned")
    
    def test_payouts_list(self):
        """GET /api/admin/payouts/list returns payouts"""
        response = requests.get(f"{BASE_URL}/api/admin/payouts/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of payouts"
        print(f"Payouts List: {len(data)} payouts returned")


class TestProductsServicesAPIs:
    """Pass 4: Products & Services page APIs"""
    
    def test_catalog_products(self):
        """GET /api/admin/catalog/products returns products"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of products"
        print(f"Catalog Products: {len(data)} products returned")
        if data:
            first = data[0]
            print(f"First product: {first.get('name') or first.get('title')} - {first.get('sku')}")
    
    def test_catalog_products_with_search(self):
        """GET /api/admin/catalog/products with search filter"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/products", params={"search": "shirt"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Catalog Products (search=shirt): {len(data)} products")
    
    def test_catalog_promo_items(self):
        """GET /api/admin/catalog/promo-items returns promotional items"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/promo-items")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of promo items"
        print(f"Catalog Promo Items: {len(data)} items returned")
    
    def test_catalog_services(self):
        """GET /api/admin/catalog/services returns services"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of services"
        print(f"Catalog Services: {len(data)} services returned")
    
    def test_catalog_groups(self):
        """GET /api/admin/catalog/groups returns service groups"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/groups")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of groups"
        print(f"Catalog Groups: {len(data)} groups returned")


class TestBusinessSettingsAPIs:
    """Pass 4: Business Settings page APIs"""
    
    def test_get_business_profile(self):
        """GET /api/admin/settings/business-profile returns company profile with TZ defaults"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/business-profile")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict), "Expected dict"
        # Should have default values at minimum
        print(f"Business Profile: {data.get('company_name')} - {data.get('country')} - {data.get('currency')}")
    
    def test_get_commercial_rules(self):
        """GET /api/admin/settings/commercial-rules returns commercial rules"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/commercial-rules")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict), "Expected dict"
        print(f"Commercial Rules: quote_validity_days={data.get('quote_validity_days')}, auto_release={data.get('auto_release_on_payment')}")
    
    def test_get_affiliate_defaults(self):
        """GET /api/admin/settings/affiliate-defaults returns affiliate defaults"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/affiliate-defaults")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict), "Expected dict"
        print(f"Affiliate Defaults: enabled={data.get('enabled')}, commission_rate={data.get('default_commission_rate')}")
    
    def test_get_notification_settings(self):
        """GET /api/admin/settings/notifications returns notification settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict), "Expected dict"
        print(f"Notification Settings: email_on_payment={data.get('email_on_payment')}, whatsapp={data.get('whatsapp_enabled')}")
    
    def test_save_business_profile(self):
        """POST /api/admin/settings/business-profile saves settings"""
        payload = {
            "company_name": "Konekt Limited",
            "country": "TZ",
            "currency": "TZS"
        }
        response = requests.post(f"{BASE_URL}/api/admin/settings/business-profile", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True, "Expected ok: true"
        print("Business Profile saved successfully")


class TestUsersRolesAPIs:
    """Pass 5: Users & Roles page APIs"""
    
    def test_users_list(self):
        """GET /api/admin/users/list returns all users"""
        response = requests.get(f"{BASE_URL}/api/admin/users/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of users"
        print(f"Users List: {len(data)} users returned")
        if data:
            first = data[0]
            print(f"First user: {first.get('full_name')} - {first.get('email')} - role: {first.get('role')}")
    
    def test_users_list_with_role_filter(self):
        """GET /api/admin/users/list with role filter"""
        response = requests.get(f"{BASE_URL}/api/admin/users/list", params={"role": "admin"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Users List (role=admin): {len(data)} users")
    
    def test_users_list_with_search(self):
        """GET /api/admin/users/list with search filter"""
        response = requests.get(f"{BASE_URL}/api/admin/users/list", params={"search": "admin"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Users List (search=admin): {len(data)} users")


class TestAuditLogAPIs:
    """Pass 5: Audit Log page APIs"""
    
    def test_audit_list(self):
        """GET /api/admin/audit/list returns audit log entries"""
        response = requests.get(f"{BASE_URL}/api/admin/audit/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of audit entries"
        print(f"Audit Log: {len(data)} entries returned")
        if data:
            first = data[0]
            print(f"First entry: {first.get('action')} - target: {first.get('target_id')}")
    
    def test_audit_list_with_action_filter(self):
        """GET /api/admin/audit/list with action filter"""
        response = requests.get(f"{BASE_URL}/api/admin/audit/list", params={"action": "payment_approved"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Audit Log (action=payment_approved): {len(data)} entries")
    
    def test_audit_actions(self):
        """GET /api/admin/audit/actions returns distinct action types"""
        response = requests.get(f"{BASE_URL}/api/admin/audit/actions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of action types"
        print(f"Audit Actions: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
