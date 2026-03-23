"""
Test PDF Generation and Dashboard Metrics APIs
Tests for:
- Dashboard metrics endpoints (customer, admin, sales, affiliate, partner)
- PDF generation endpoints (quotes, invoices - preview and download)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDashboardMetricsCustomer:
    """Customer dashboard metrics endpoint tests"""
    
    def test_customer_metrics_returns_200(self):
        """GET /api/dashboard-metrics/customer returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/customer")
        assert response.status_code == 200
        
    def test_customer_metrics_has_required_fields(self):
        """Customer metrics contains quotes_count, orders_count, invoices_count, recent_activity"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/customer")
        data = response.json()
        
        assert "quotes_count" in data
        assert "orders_count" in data
        assert "invoices_count" in data
        assert "recent_activity" in data
        assert "pending_amount" in data
        
    def test_customer_metrics_data_types(self):
        """Customer metrics fields have correct data types"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/customer")
        data = response.json()
        
        assert isinstance(data["quotes_count"], int)
        assert isinstance(data["orders_count"], int)
        assert isinstance(data["invoices_count"], int)
        assert isinstance(data["recent_activity"], list)
        assert isinstance(data["pending_amount"], (int, float))
        
    def test_customer_metrics_with_user_id(self):
        """Customer metrics accepts user_id parameter"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/customer?user_id=test123")
        assert response.status_code == 200


class TestDashboardMetricsAdmin:
    """Admin dashboard metrics endpoint tests"""
    
    def test_admin_metrics_returns_200(self):
        """GET /api/dashboard-metrics/admin returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/admin")
        assert response.status_code == 200
        
    def test_admin_metrics_has_required_fields(self):
        """Admin metrics contains revenue, orders pipeline, partners, affiliates"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/admin")
        data = response.json()
        
        # Revenue fields
        assert "revenue" in data
        assert "pending_revenue" in data
        
        # Orders pipeline
        assert "orders_pending" in data
        assert "orders_in_progress" in data
        assert "orders_completed" in data
        assert "orders_total" in data
        
        # Partners and affiliates
        assert "active_partners" in data
        assert "total_partners" in data
        assert "active_affiliates" in data
        assert "total_affiliates" in data
        
        # Quotes
        assert "quotes_total" in data
        assert "quotes_pending" in data
        
    def test_admin_metrics_data_types(self):
        """Admin metrics fields have correct data types"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/admin")
        data = response.json()
        
        assert isinstance(data["revenue"], (int, float))
        assert isinstance(data["orders_total"], int)
        assert isinstance(data["active_partners"], int)


class TestDashboardMetricsSales:
    """Sales dashboard metrics endpoint tests"""
    
    def test_sales_metrics_returns_200(self):
        """GET /api/dashboard-metrics/sales returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/sales")
        assert response.status_code == 200
        
    def test_sales_metrics_has_required_fields(self):
        """Sales metrics contains leads, quotes pending, deals ready"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/sales")
        data = response.json()
        
        assert "leads_needing_action" in data
        assert "leads_new" in data
        assert "leads_contacted" in data
        assert "quotes_pending" in data
        assert "deals_ready_to_close" in data
        assert "assist_requests_pending" in data
        assert "recent_quotes" in data
        
    def test_sales_metrics_recent_quotes_structure(self):
        """Sales metrics recent_quotes has correct structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/sales")
        data = response.json()
        
        assert isinstance(data["recent_quotes"], list)
        if len(data["recent_quotes"]) > 0:
            quote = data["recent_quotes"][0]
            assert "quote_number" in quote
            assert "customer_name" in quote
            assert "total" in quote
            assert "status" in quote


class TestDashboardMetricsAffiliate:
    """Affiliate dashboard metrics endpoint tests"""
    
    def test_affiliate_metrics_returns_200(self):
        """GET /api/dashboard-metrics/affiliate returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/affiliate")
        assert response.status_code == 200
        
    def test_affiliate_metrics_has_required_fields(self):
        """Affiliate metrics contains earnings, clicks, conversions"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/affiliate")
        data = response.json()
        
        assert "total_earnings" in data
        assert "pending_earnings" in data
        assert "paid_earnings" in data
        assert "clicks" in data
        assert "conversions" in data
        assert "referrals_count" in data


class TestDashboardMetricsPartner:
    """Partner dashboard metrics endpoint tests"""
    
    def test_partner_metrics_returns_200(self):
        """GET /api/dashboard-metrics/partner returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/partner")
        assert response.status_code == 200
        
    def test_partner_metrics_has_required_fields(self):
        """Partner metrics contains jobs counts, earnings"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/partner")
        data = response.json()
        
        assert "assigned_jobs" in data
        assert "in_progress_jobs" in data
        assert "completed_jobs" in data
        assert "delayed_jobs" in data
        assert "total_earnings" in data
        assert "pending_payouts" in data
        assert "upcoming_deadlines" in data


class TestPdfQuotePreview:
    """Quote PDF preview endpoint tests"""
    
    def test_quote_preview_returns_html(self):
        """GET /api/pdf/quotes/{id}/preview returns HTML"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/QT-20260323-D1B15F/preview")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        
    def test_quote_preview_contains_konekt_branding(self):
        """Quote preview HTML contains KONEKT branding"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/QT-20260323-D1B15F/preview")
        assert "KONEKT" in response.text
        assert "QUOTE" in response.text
        
    def test_quote_preview_contains_quote_number(self):
        """Quote preview HTML contains quote number"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/QT-20260323-D1B15F/preview")
        assert "QT-20260323-D1B15F" in response.text
        
    def test_quote_preview_not_found(self):
        """Quote preview returns 404 for non-existent quote"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/NONEXISTENT-QUOTE/preview")
        assert response.status_code == 404


class TestPdfQuoteDownload:
    """Quote PDF download endpoint tests"""
    
    def test_quote_pdf_returns_pdf(self):
        """GET /api/pdf/quotes/{id} returns PDF"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/QT-20260323-D1B15F")
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        
    def test_quote_pdf_has_content_disposition(self):
        """Quote PDF has Content-Disposition header for download"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/QT-20260323-D1B15F")
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition
        assert ".pdf" in content_disposition
        
    def test_quote_pdf_is_valid_pdf(self):
        """Quote PDF content starts with PDF magic bytes"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/QT-20260323-D1B15F")
        assert response.content[:4] == b'%PDF'
        
    def test_quote_pdf_not_found(self):
        """Quote PDF returns 404 for non-existent quote"""
        response = requests.get(f"{BASE_URL}/api/pdf/quotes/NONEXISTENT-QUOTE")
        assert response.status_code == 404


class TestPdfInvoicePreview:
    """Invoice PDF preview endpoint tests"""
    
    def test_invoice_preview_returns_html(self):
        """GET /api/pdf/invoices/{id}/preview returns HTML"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/INV-20260311-952447/preview")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        
    def test_invoice_preview_contains_konekt_branding(self):
        """Invoice preview HTML contains KONEKT branding"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/INV-20260311-952447/preview")
        assert "KONEKT" in response.text
        assert "INVOICE" in response.text
        
    def test_invoice_preview_contains_invoice_number(self):
        """Invoice preview HTML contains invoice number"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/INV-20260311-952447/preview")
        assert "INV-20260311-952447" in response.text
        
    def test_invoice_preview_not_found(self):
        """Invoice preview returns 404 for non-existent invoice"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/NONEXISTENT-INVOICE/preview")
        assert response.status_code == 404


class TestPdfInvoiceDownload:
    """Invoice PDF download endpoint tests"""
    
    def test_invoice_pdf_returns_pdf(self):
        """GET /api/pdf/invoices/{id} returns PDF"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/INV-20260311-952447")
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        
    def test_invoice_pdf_has_content_disposition(self):
        """Invoice PDF has Content-Disposition header for download"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/INV-20260311-952447")
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition
        assert ".pdf" in content_disposition
        
    def test_invoice_pdf_is_valid_pdf(self):
        """Invoice PDF content starts with PDF magic bytes"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/INV-20260311-952447")
        assert response.content[:4] == b'%PDF'
        
    def test_invoice_pdf_not_found(self):
        """Invoice PDF returns 404 for non-existent invoice"""
        response = requests.get(f"{BASE_URL}/api/pdf/invoices/NONEXISTENT-INVOICE")
        assert response.status_code == 404


class TestDashboardMetricsRealData:
    """Verify dashboard metrics return real data from database"""
    
    def test_admin_metrics_has_real_data(self):
        """Admin metrics shows real data (51 quotes, 42 orders, TZS 1,544,000 revenue)"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/admin")
        data = response.json()
        
        # Verify we have real data, not zeros
        assert data["quotes_total"] >= 50, f"Expected at least 50 quotes, got {data['quotes_total']}"
        assert data["orders_total"] >= 40, f"Expected at least 40 orders, got {data['orders_total']}"
        assert data["revenue"] >= 1500000, f"Expected at least TZS 1,500,000 revenue, got {data['revenue']}"
        
    def test_customer_metrics_has_real_data(self):
        """Customer metrics shows real data"""
        response = requests.get(f"{BASE_URL}/api/dashboard-metrics/customer")
        data = response.json()
        
        # Verify we have real data
        assert data["quotes_count"] >= 50, f"Expected at least 50 quotes, got {data['quotes_count']}"
        assert data["orders_count"] >= 40, f"Expected at least 40 orders, got {data['orders_count']}"
        assert data["invoices_count"] >= 20, f"Expected at least 20 invoices, got {data['invoices_count']}"
