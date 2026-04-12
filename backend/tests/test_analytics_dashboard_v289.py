"""
Test Analytics Dashboard API - Iteration 289
Tests the Advanced Analytics Dashboard API at /api/admin/analytics/dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAnalyticsDashboardAPI:
    """Analytics Dashboard API tests"""
    
    def test_analytics_dashboard_default_30_days(self):
        """Test analytics dashboard with default 30 days period"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify period_days
        assert data.get("period_days") == 30, "Default period should be 30 days"
        
        # Verify KPIs structure
        kpis = data.get("kpis", {})
        assert "total_revenue" in kpis, "Missing total_revenue in kpis"
        assert "revenue_change_pct" in kpis, "Missing revenue_change_pct in kpis"
        assert "total_orders" in kpis, "Missing total_orders in kpis"
        assert "completion_rate" in kpis, "Missing completion_rate in kpis"
        assert "avg_order_value" in kpis, "Missing avg_order_value in kpis"
        assert "pending_confirmations" in kpis, "Missing pending_confirmations in kpis"
        assert "walkin_revenue_pct" in kpis, "Missing walkin_revenue_pct in kpis"
        assert "affiliate_revenue_pct" in kpis, "Missing affiliate_revenue_pct in kpis"
        
        # Verify channels structure
        channels = data.get("channels", [])
        assert len(channels) == 3, "Should have 3 channels"
        channel_names = [c["name"] for c in channels]
        assert "Structured" in channel_names, "Missing Structured channel"
        assert "Walk-in" in channel_names, "Missing Walk-in channel"
        assert "Affiliate" in channel_names, "Missing Affiliate channel"
        
        for channel in channels:
            assert "revenue" in channel, f"Missing revenue in channel {channel.get('name')}"
            assert "orders" in channel, f"Missing orders in channel {channel.get('name')}"
            assert "pct" in channel, f"Missing pct in channel {channel.get('name')}"
        
        # Verify funnel structure
        funnel = data.get("funnel", {})
        assert "quotes" in funnel, "Missing quotes in funnel"
        assert "invoices" in funnel, "Missing invoices in funnel"
        assert "orders" in funnel, "Missing orders in funnel"
        assert "completed" in funnel, "Missing completed in funnel"
        
        # Verify operations structure
        operations = data.get("operations", {})
        assert "stale_orders" in operations, "Missing stale_orders in operations"
        assert "overdue_invoices" in operations, "Missing overdue_invoices in operations"
        assert "pending_confirmations" in operations, "Missing pending_confirmations in operations"
        
        # Verify top performers
        assert "top_customers" in data, "Missing top_customers"
        assert "top_sales" in data, "Missing top_sales"
        
        # Verify revenue_trend
        assert "revenue_trend" in data, "Missing revenue_trend"
        
        print(f"✓ Analytics dashboard 30d: Revenue={kpis.get('total_revenue')}, Orders={kpis.get('total_orders')}")
    
    def test_analytics_dashboard_7_days(self):
        """Test analytics dashboard with 7 days period"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/dashboard?days=7")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("period_days") == 7, "Period should be 7 days"
        
        kpis = data.get("kpis", {})
        assert isinstance(kpis.get("total_revenue"), (int, float)), "total_revenue should be numeric"
        assert isinstance(kpis.get("total_orders"), int), "total_orders should be int"
        
        print(f"✓ Analytics dashboard 7d: Revenue={kpis.get('total_revenue')}, Orders={kpis.get('total_orders')}")
    
    def test_analytics_dashboard_90_days(self):
        """Test analytics dashboard with 90 days period"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/dashboard?days=90")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("period_days") == 90, "Period should be 90 days"
        
        kpis = data.get("kpis", {})
        channels = data.get("channels", [])
        
        # 90 days should have more or equal data than 30 days
        assert isinstance(kpis.get("total_revenue"), (int, float)), "total_revenue should be numeric"
        
        # Verify channel percentages sum to ~100%
        total_pct = sum(c.get("pct", 0) for c in channels)
        assert 95 <= total_pct <= 105, f"Channel percentages should sum to ~100%, got {total_pct}"
        
        print(f"✓ Analytics dashboard 90d: Revenue={kpis.get('total_revenue')}, Orders={kpis.get('total_orders')}")
    
    def test_analytics_channels_breakdown(self):
        """Test channel breakdown includes Structured, Walk-in, Affiliate"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/dashboard?days=30")
        assert response.status_code == 200
        
        data = response.json()
        channels = data.get("channels", [])
        
        # Find each channel
        structured = next((c for c in channels if c["name"] == "Structured"), None)
        walkin = next((c for c in channels if c["name"] == "Walk-in"), None)
        affiliate = next((c for c in channels if c["name"] == "Affiliate"), None)
        
        assert structured is not None, "Structured channel missing"
        assert walkin is not None, "Walk-in channel missing"
        assert affiliate is not None, "Affiliate channel missing"
        
        # Verify each channel has required fields
        for channel in [structured, walkin, affiliate]:
            assert "revenue" in channel
            assert "orders" in channel
            assert "pct" in channel
            assert isinstance(channel["revenue"], (int, float))
            assert isinstance(channel["orders"], int)
            assert isinstance(channel["pct"], int)
        
        print(f"✓ Channels: Structured={structured['pct']}%, Walk-in={walkin['pct']}%, Affiliate={affiliate['pct']}%")
    
    def test_analytics_funnel_conversion(self):
        """Test conversion funnel data"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/dashboard?days=30")
        assert response.status_code == 200
        
        data = response.json()
        funnel = data.get("funnel", {})
        
        # Verify funnel stages
        assert "quotes" in funnel
        assert "invoices" in funnel
        assert "orders" in funnel
        assert "completed" in funnel
        
        # Completed should be <= orders
        assert funnel["completed"] <= funnel["orders"], "Completed should be <= orders"
        
        print(f"✓ Funnel: Quotes={funnel['quotes']} → Invoices={funnel['invoices']} → Orders={funnel['orders']} → Completed={funnel['completed']}")
    
    def test_analytics_operations_health(self):
        """Test operations health metrics"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/dashboard?days=30")
        assert response.status_code == 200
        
        data = response.json()
        operations = data.get("operations", {})
        
        assert "stale_orders" in operations
        assert "overdue_invoices" in operations
        assert "pending_confirmations" in operations
        
        # All should be non-negative integers
        assert operations["stale_orders"] >= 0
        assert operations["overdue_invoices"] >= 0
        assert operations["pending_confirmations"] >= 0
        
        print(f"✓ Operations: Stale={operations['stale_orders']}, Overdue={operations['overdue_invoices']}, Pending={operations['pending_confirmations']}")
    
    def test_analytics_top_performers(self):
        """Test top customers and top sales data"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/dashboard?days=30")
        assert response.status_code == 200
        
        data = response.json()
        
        top_customers = data.get("top_customers", [])
        top_sales = data.get("top_sales", [])
        
        # Verify structure of top customers
        for customer in top_customers:
            assert "name" in customer, "Customer missing name"
            assert "revenue" in customer, "Customer missing revenue"
            assert "orders" in customer, "Customer missing orders"
        
        # Verify structure of top sales (may be empty if no created_by data)
        for sales in top_sales:
            assert "name" in sales, "Sales missing name"
            assert "revenue" in sales, "Sales missing revenue"
            assert "orders" in sales, "Sales missing orders"
        
        print(f"✓ Top performers: {len(top_customers)} customers, {len(top_sales)} sales staff")
    
    def test_analytics_revenue_trend(self):
        """Test revenue trend data"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/dashboard?days=30")
        assert response.status_code == 200
        
        data = response.json()
        revenue_trend = data.get("revenue_trend", [])
        
        # Verify structure
        for point in revenue_trend:
            assert "date" in point, "Revenue trend point missing date"
            assert "revenue" in point, "Revenue trend point missing revenue"
            assert isinstance(point["revenue"], (int, float))
        
        print(f"✓ Revenue trend: {len(revenue_trend)} data points")


class TestWalkInSaleRegression:
    """Walk-in Sale API regression tests"""
    
    def test_walkin_sale_endpoint_exists(self):
        """Verify walk-in sale endpoint exists"""
        # Test with empty items to verify endpoint exists
        response = requests.post(f"{BASE_URL}/api/admin/walk-in-sale", json={
            "items": [],
            "customer_name": "Test"
        })
        # Should return 400 for empty items, not 404
        assert response.status_code == 400, f"Expected 400 for empty items, got {response.status_code}"
        print("✓ Walk-in sale endpoint exists")
    
    def test_catalog_products_for_walkin(self):
        """Verify catalog products endpoint for walk-in sale product search"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        products = response.json()
        assert isinstance(products, list), "Products should be a list"
        print(f"✓ Catalog products: {len(products)} products available")


class TestDataIntegrityRegression:
    """Data Integrity Dashboard regression tests"""
    
    def test_data_integrity_endpoint(self):
        """Verify data integrity endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/admin/data-integrity/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "health_score" in data, "Data integrity should return health_score"
        assert "total_issues" in data, "Data integrity should return total_issues"
        assert "categories" in data, "Data integrity should return categories"
        print(f"✓ Data integrity: health_score={data.get('health_score')}, issues={data.get('total_issues')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
