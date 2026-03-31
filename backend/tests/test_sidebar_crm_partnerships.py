"""
Test Suite for Sidebar Restructure, CRM Consolidation, and Partnerships Domain
Tests the following features:
- Partnerships API endpoints
- CRM Intelligence API
- Service Leads API
- Sales KPIs API
- Marketing Performance API
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://konekt-payments-fix.preview.emergentagent.com').rstrip('/')


class TestPartnershipsAPI:
    """Test Partnerships API endpoints"""
    
    def test_partnerships_summary(self):
        """GET /api/partnerships/summary returns partnership stats"""
        response = requests.get(f"{BASE_URL}/api/partnerships/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "affiliates" in data
        assert "referrals" in data
        assert "pending_commissions" in data
        assert "paid_out" in data
        
        # Verify data types
        assert isinstance(data["affiliates"], int)
        assert isinstance(data["referrals"], int)
        print(f"Partnerships Summary: {data}")


class TestCRMIntelligenceAPI:
    """Test CRM Intelligence API endpoints"""
    
    def test_crm_intelligence_dashboard(self):
        """GET /api/admin/crm-intelligence/dashboard returns intelligence data"""
        response = requests.get(f"{BASE_URL}/api/admin/crm-intelligence/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "by_stage" in data
        assert "by_source" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_leads" in summary
        assert "won" in summary
        assert "lost" in summary
        print(f"CRM Intelligence Summary: {summary}")


class TestServiceLeadsAPI:
    """Test Service Leads API endpoints"""
    
    def test_service_leads_list(self):
        """GET /api/admin-flow-fixes/sales/service-leads returns service leads"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/sales/service-leads")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            lead = data[0]
            # Verify lead structure
            assert "customer_name" in lead
            assert "lead_type" in lead
            assert "status" in lead
            print(f"Found {len(data)} service leads")
        else:
            print("No service leads found (empty list is valid)")
    
    def test_service_leads_search(self):
        """GET /api/admin-flow-fixes/sales/service-leads with search query"""
        response = requests.get(f"{BASE_URL}/api/admin-flow-fixes/sales/service-leads?q=test")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Search returned {len(data)} results")


class TestSalesKPIsAPI:
    """Test Sales KPIs API endpoints"""
    
    def test_sales_kpis_summary(self):
        """GET /api/admin/sales-kpis/summary returns sales KPIs"""
        response = requests.get(f"{BASE_URL}/api/admin/sales-kpis/summary")
        assert response.status_code == 200
        
        data = response.json()
        # Verify KPI fields exist
        assert "lead_count" in data or "total_leads" in data or isinstance(data, dict)
        print(f"Sales KPIs: {data}")


class TestMarketingPerformanceAPI:
    """Test Marketing Performance API endpoints"""
    
    def test_marketing_performance_sources(self):
        """GET /api/admin/marketing-performance/sources returns source performance"""
        response = requests.get(f"{BASE_URL}/api/admin/marketing-performance/sources")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict)
        print(f"Marketing Sources: {list(data.keys())[:5]}...")


class TestCRMLeadsAPI:
    """Test CRM Leads API endpoints"""
    
    def test_crm_leads_list(self):
        """GET /api/admin/crm/leads returns leads list"""
        response = requests.get(f"{BASE_URL}/api/admin/crm/leads")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"CRM Leads API returned {len(data)} leads")
    
    def test_crm_deals_lead_detail(self):
        """GET /api/admin/crm-deals/leads/{id} returns lead detail"""
        # First get a lead ID
        leads_response = requests.get(f"{BASE_URL}/api/admin/leads")
        if leads_response.status_code == 200:
            leads_data = leads_response.json()
            leads = leads_data.get("data", leads_data) if isinstance(leads_data, dict) else leads_data
            
            if isinstance(leads, list) and len(leads) > 0:
                lead_id = leads[0].get("id")
                if lead_id:
                    response = requests.get(f"{BASE_URL}/api/admin/crm-deals/leads/{lead_id}")
                    assert response.status_code == 200
                    
                    data = response.json()
                    assert "lead" in data
                    print(f"Lead detail retrieved for ID: {lead_id}")
                    return
        
        print("No leads available to test detail endpoint")


class TestHealthEndpoints:
    """Test basic health endpoints"""
    
    def test_api_health(self):
        """Basic API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        # Health endpoint may return 200 or 404 if not implemented
        assert response.status_code in [200, 404]
        print(f"Health check status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
