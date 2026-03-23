"""
Test Admin Settings Hub API
Tests GET and PUT endpoints for the central admin settings hub
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminSettingsHubAPI:
    """Tests for Admin Settings Hub API endpoints"""
    
    def test_get_settings_hub_returns_200(self):
        """GET /api/admin/settings-hub should return 200 with default settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify all 12 sections exist
        expected_sections = [
            "commercial", "margin_rules", "promotions", "affiliate", 
            "sales", "payments", "payment_accounts", "progress_workflows",
            "ai_assistant", "notifications", "vendors", "numbering_rules", 
            "launch_controls"
        ]
        for section in expected_sections:
            assert section in data, f"Missing section: {section}"
        print(f"PASS: GET returns all 12+ settings sections")
    
    def test_get_commercial_rules_fields(self):
        """Verify Commercial Rules section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code == 200
        data = response.json()
        
        commercial = data.get("commercial", {})
        assert "minimum_company_margin_percent" in commercial
        assert "distribution_layer_percent" in commercial
        assert "commission_mode" in commercial
        assert "affiliate_attribution_reduces_sales_commission" in commercial
        
        # Verify types
        assert isinstance(commercial["minimum_company_margin_percent"], (int, float))
        assert isinstance(commercial["distribution_layer_percent"], (int, float))
        assert isinstance(commercial["commission_mode"], str)
        assert isinstance(commercial["affiliate_attribution_reduces_sales_commission"], bool)
        print(f"PASS: Commercial Rules section has all required fields with correct types")
    
    def test_get_payment_account_settings_fields(self):
        """Verify Payment Account Settings section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code == 200
        data = response.json()
        
        payment_accounts = data.get("payment_accounts", {})
        required_fields = ["account_name", "account_number", "bank_name", "swift_code", "currency"]
        for field in required_fields:
            assert field in payment_accounts, f"Missing field: {field}"
        
        # Verify default values
        assert payment_accounts["account_name"] == "KONEKT LIMITED"
        assert payment_accounts["bank_name"] == "CRDB BANK"
        assert payment_accounts["currency"] == "TZS"
        print(f"PASS: Payment Account Settings has all required fields")
    
    def test_get_launch_controls_fields(self):
        """Verify Launch Controls section has correct fields"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code == 200
        data = response.json()
        
        launch_controls = data.get("launch_controls", {})
        assert "system_mode" in launch_controls
        assert "manual_payment_verification" in launch_controls
        assert "manual_payout_approval" in launch_controls
        
        # Verify system_mode is a valid value
        assert launch_controls["system_mode"] in ["controlled_launch", "full_live"]
        assert isinstance(launch_controls["manual_payment_verification"], bool)
        print(f"PASS: Launch Controls section has all required fields")
    
    def test_put_settings_hub_updates_and_persists(self):
        """PUT /api/admin/settings-hub should update settings and persist to MongoDB"""
        # Update commercial margin
        test_margin = 30.0
        payload = {
            "commercial": {
                "minimum_company_margin_percent": test_margin,
                "distribution_layer_percent": 10.0,
                "commission_mode": "fair_balanced",
                "affiliate_attribution_reduces_sales_commission": True
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify updated value in response
        assert data["commercial"]["minimum_company_margin_percent"] == test_margin
        
        # Verify updated_at timestamp is added
        assert "updated_at" in data
        assert data["updated_at"] is not None
        print(f"PASS: PUT updates settings and adds updated_at timestamp")
        
        # Verify persistence by doing GET
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["commercial"]["minimum_company_margin_percent"] == test_margin
        print(f"PASS: Settings persisted to MongoDB correctly")
    
    def test_put_settings_hub_merges_with_defaults(self):
        """PUT should merge partial updates with default values"""
        # Send only one section
        payload = {
            "notifications": {
                "customer_notifications_enabled": False,
                "sales_notifications_enabled": True,
                "affiliate_notifications_enabled": True,
                "admin_notifications_enabled": True,
                "vendor_notifications_enabled": True
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify the updated section
        assert data["notifications"]["customer_notifications_enabled"] == False
        
        # Verify other sections still have default values
        assert "commercial" in data
        assert "margin_rules" in data
        assert "launch_controls" in data
        print(f"PASS: PUT merges partial updates with defaults")
    
    def test_put_payment_accounts_update(self):
        """Test updating Payment Account Settings"""
        payload = {
            "payment_accounts": {
                "default_country": "TZ",
                "account_name": "TEST ACCOUNT",
                "account_number": "123456789",
                "bank_name": "TEST BANK",
                "swift_code": "TESTSWIFT",
                "branch_name": "Test Branch",
                "currency": "USD",
                "show_on_invoice": True,
                "show_on_checkout": False
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["payment_accounts"]["account_name"] == "TEST ACCOUNT"
        assert data["payment_accounts"]["bank_name"] == "TEST BANK"
        assert data["payment_accounts"]["currency"] == "USD"
        assert data["payment_accounts"]["show_on_checkout"] == False
        print(f"PASS: Payment Account Settings updated correctly")
        
        # Restore defaults
        restore_payload = {
            "payment_accounts": {
                "default_country": "TZ",
                "account_name": "KONEKT LIMITED",
                "account_number": "015C8841347002",
                "bank_name": "CRDB BANK",
                "swift_code": "CORUTZTZ",
                "branch_name": "",
                "currency": "TZS",
                "show_on_invoice": True,
                "show_on_checkout": True
            }
        }
        requests.put(f"{BASE_URL}/api/admin/settings-hub", json=restore_payload)
    
    def test_put_launch_controls_system_mode(self):
        """Test updating Launch Controls system mode"""
        payload = {
            "launch_controls": {
                "system_mode": "full_live",
                "manual_payment_verification": False,
                "manual_payout_approval": True,
                "affiliate_approval_required": True,
                "ai_enabled": True,
                "bank_only_payments": True,
                "audit_notifications_enabled": True
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["launch_controls"]["system_mode"] == "full_live"
        assert data["launch_controls"]["manual_payment_verification"] == False
        print(f"PASS: Launch Controls updated correctly")
        
        # Restore to controlled_launch
        restore_payload = {
            "launch_controls": {
                "system_mode": "controlled_launch",
                "manual_payment_verification": True,
                "manual_payout_approval": True,
                "affiliate_approval_required": True,
                "ai_enabled": True,
                "bank_only_payments": True,
                "audit_notifications_enabled": True
            }
        }
        requests.put(f"{BASE_URL}/api/admin/settings-hub", json=restore_payload)
    
    def test_all_12_sections_present(self):
        """Verify all 12 settings sections are present in response"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub")
        assert response.status_code == 200
        data = response.json()
        
        sections = [
            ("commercial", "Commercial Rules"),
            ("margin_rules", "Margin Rules"),
            ("promotions", "Promotions"),
            ("affiliate", "Affiliate Settings"),
            ("sales", "Sales Settings"),
            ("payments", "Payment Settings"),
            ("payment_accounts", "Payment Account Settings"),
            ("progress_workflows", "Progress Workflows"),
            ("ai_assistant", "AI Assistant"),
            ("notifications", "Notifications"),
            ("vendors", "Vendors/Partners"),
            ("numbering_rules", "Numbering Rules"),
            ("launch_controls", "Launch Controls")
        ]
        
        for key, name in sections:
            assert key in data, f"Missing section: {name} ({key})"
            assert isinstance(data[key], dict), f"Section {name} should be a dict"
        
        print(f"PASS: All 12+ settings sections present")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
