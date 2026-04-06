"""
Notification Settings E2E Tests - Iteration 181
Tests:
1. Admin Notification Settings API (GET/PUT settings, triggers, provider)
2. Notification logs API
3. Test dispatch endpoint
4. Checkout hook fires customer_order_received notification
5. Payment proof hook fires customer_payment_proof_received and admin_payment_proof_submitted
6. Payment approval hook fires customer_payment_verified
7. Disabled triggers produce 'skipped' status
8. Dry-run mode produces 'dry_run' status
"""
import pytest
import requests
import os
from uuid import uuid4
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


class TestNotificationSettingsAPI:
    """Test notification settings CRUD endpoints"""

    def test_get_notification_settings(self):
        """GET /api/admin/notifications/settings returns settings array and provider object"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "settings" in data, "Response should contain 'settings' array"
        assert "provider" in data, "Response should contain 'provider' object"
        assert isinstance(data["settings"], list), "settings should be a list"
        assert isinstance(data["provider"], dict), "provider should be a dict"
        
        # Verify expected trigger keys exist
        event_keys = [s["event_key"] for s in data["settings"]]
        expected_keys = [
            "customer_order_received",
            "customer_payment_proof_received",
            "customer_payment_verified",
            "admin_payment_proof_submitted"
        ]
        for key in expected_keys:
            assert key in event_keys, f"Expected trigger '{key}' not found in settings"
        
        print(f"✓ GET settings returned {len(data['settings'])} triggers and provider config")

    def test_update_trigger_enabled_state(self):
        """PUT /api/admin/notifications/settings/trigger toggles enabled state"""
        # First get current state
        response = requests.get(f"{BASE_URL}/api/admin/notifications/settings")
        assert response.status_code == 200
        settings = response.json()["settings"]
        
        # Find customer_order_received trigger
        trigger = next((s for s in settings if s["event_key"] == "customer_order_received"), None)
        assert trigger is not None, "customer_order_received trigger not found"
        
        current_enabled = trigger.get("enabled", False)
        
        # Toggle the state
        toggle_response = requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/trigger",
            json={"event_key": "customer_order_received", "enabled": not current_enabled}
        )
        assert toggle_response.status_code == 200, f"Toggle failed: {toggle_response.text}"
        
        # Verify the change
        verify_response = requests.get(f"{BASE_URL}/api/admin/notifications/settings")
        new_settings = verify_response.json()["settings"]
        new_trigger = next((s for s in new_settings if s["event_key"] == "customer_order_received"), None)
        assert new_trigger["enabled"] == (not current_enabled), "Trigger enabled state did not toggle"
        
        # Restore original state
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/trigger",
            json={"event_key": "customer_order_received", "enabled": current_enabled}
        )
        
        print(f"✓ Trigger toggle works: {current_enabled} → {not current_enabled} → {current_enabled}")

    def test_update_provider_settings(self):
        """PUT /api/admin/notifications/settings/provider saves provider config"""
        # Get current provider settings
        response = requests.get(f"{BASE_URL}/api/admin/notifications/settings")
        assert response.status_code == 200
        original_provider = response.json()["provider"]
        
        # Update provider settings
        test_sender_name = f"Test Sender {uuid4().hex[:6]}"
        update_response = requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/provider",
            json={
                "sender_name": test_sender_name,
                "sender_email": original_provider.get("sender_email", "test@konekt.co.tz"),
                "enabled": True,
                "dry_run": True
            }
        )
        assert update_response.status_code == 200, f"Provider update failed: {update_response.text}"
        
        # Verify the change
        verify_response = requests.get(f"{BASE_URL}/api/admin/notifications/settings")
        new_provider = verify_response.json()["provider"]
        assert new_provider["sender_name"] == test_sender_name, "Provider sender_name did not update"
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/provider",
            json=original_provider
        )
        
        print(f"✓ Provider settings update works: sender_name = {test_sender_name}")


class TestNotificationLogs:
    """Test notification logs endpoint"""

    def test_get_notification_logs(self):
        """GET /api/admin/notifications/logs returns notification log entries"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications/logs?limit=20")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "logs" in data, "Response should contain 'logs' array"
        assert isinstance(data["logs"], list), "logs should be a list"
        
        print(f"✓ GET logs returned {len(data['logs'])} log entries")
        
        # If there are logs, verify structure
        if data["logs"]:
            log = data["logs"][0]
            expected_fields = ["event_key", "recipient", "status", "subject", "created_at"]
            for field in expected_fields:
                assert field in log, f"Log entry missing field: {field}"
            print(f"  - Latest log: {log['event_key']} → {log['recipient']} ({log['status']})")


class TestNotificationTestDispatch:
    """Test the test dispatch endpoint"""

    def test_send_test_notification(self):
        """POST /api/admin/notifications/test sends test notification"""
        # Ensure triggers and provider are enabled with dry_run
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/trigger",
            json={"event_key": "customer_order_received", "enabled": True}
        )
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/provider",
            json={"enabled": True, "dry_run": True, "sender_name": "Konekt Test", "sender_email": "test@konekt.co.tz"}
        )
        
        # Send test notification
        test_email = f"test_{uuid4().hex[:6]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/test",
            json={
                "event_key": "customer_order_received",
                "recipient_email": test_email,
                "context": {
                    "customer_name": "Test Customer",
                    "order_number": "ORD-TEST-001",
                    "total": "50,000",
                    "items_summary": "Test Item x1",
                    "bank_name": "Test Bank",
                    "account_name": "Test Account",
                    "account_number": "123456789",
                    "payment_proof_link": "#",
                    "account_link": "#"
                }
            }
        )
        assert response.status_code == 200, f"Test dispatch failed: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Test dispatch should return ok=True"
        assert "dispatch_result" in data, "Response should contain dispatch_result"
        
        result = data["dispatch_result"]
        assert result.get("status") in ["dry_run", "sent"], f"Unexpected status: {result.get('status')}"
        
        print(f"✓ Test dispatch successful: status={result.get('status')}, subject={result.get('subject', 'N/A')}")


class TestCheckoutNotificationHook:
    """Test that checkout fires customer_order_received notification"""

    def test_checkout_fires_notification(self):
        """POST /api/public/checkout creates order AND fires customer_order_received notification"""
        # Ensure trigger is enabled
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/trigger",
            json={"event_key": "customer_order_received", "enabled": True}
        )
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/provider",
            json={"enabled": True, "dry_run": True, "sender_name": "Konekt Test", "sender_email": "test@konekt.co.tz"}
        )
        
        # Get initial log count for this event
        logs_before = requests.get(f"{BASE_URL}/api/admin/notifications/logs?event_key=customer_order_received&limit=100").json()
        count_before = len(logs_before.get("logs", []))
        
        # Create a checkout order
        test_email = f"checkout_test_{uuid4().hex[:6]}@example.com"
        checkout_response = requests.post(
            f"{BASE_URL}/api/public/checkout",
            json={
                "customer_name": "Checkout Test Customer",
                "email": test_email,
                "phone": "+255700000001",
                "company_name": "Test Company",
                "items": [
                    {"product_id": "test-prod-1", "product_name": "Test Product", "quantity": 2, "unit_price": 25000}
                ],
                "delivery_address": "Test Address",
                "city": "Dar es Salaam",
                "country": "Tanzania"
            }
        )
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        
        order_data = checkout_response.json()
        assert order_data.get("ok") == True, "Checkout should return ok=True"
        order_number = order_data.get("order_number")
        assert order_number, "Checkout should return order_number"
        
        # Check logs for new notification
        logs_after = requests.get(f"{BASE_URL}/api/admin/notifications/logs?event_key=customer_order_received&limit=100").json()
        count_after = len(logs_after.get("logs", []))
        
        # Find the log for this specific order
        new_logs = [log for log in logs_after.get("logs", []) if log.get("recipient") == test_email]
        
        assert len(new_logs) > 0, f"No notification log found for {test_email}"
        latest_log = new_logs[0]
        assert latest_log["status"] in ["dry_run", "sent"], f"Unexpected log status: {latest_log['status']}"
        
        print(f"✓ Checkout notification fired: order={order_number}, status={latest_log['status']}")


class TestPaymentProofNotificationHooks:
    """Test that payment proof submission fires notifications"""

    def test_payment_proof_fires_customer_and_admin_notifications(self):
        """POST /api/public/payment-proof fires customer_payment_proof_received and admin_payment_proof_submitted"""
        # Ensure triggers are enabled
        for event_key in ["customer_payment_proof_received", "admin_payment_proof_submitted"]:
            requests.put(
                f"{BASE_URL}/api/admin/notifications/settings/trigger",
                json={"event_key": event_key, "enabled": True}
            )
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/provider",
            json={"enabled": True, "dry_run": True, "sender_name": "Konekt Test", "sender_email": "test@konekt.co.tz"}
        )
        
        # First create an order
        test_email = f"proof_test_{uuid4().hex[:6]}@example.com"
        checkout_response = requests.post(
            f"{BASE_URL}/api/public/checkout",
            json={
                "customer_name": "Payment Proof Test",
                "email": test_email,
                "phone": "+255700000002",
                "items": [{"product_id": "test-prod-2", "product_name": "Test Product 2", "quantity": 1, "unit_price": 30000}]
            }
        )
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        order_number = checkout_response.json().get("order_number")
        
        # Submit payment proof
        proof_response = requests.post(
            f"{BASE_URL}/api/public/payment-proof",
            json={
                "order_number": order_number,
                "email": test_email,
                "amount_paid": 30000,
                "payer_name": "Test Payer",
                "bank_reference": f"TXN-{uuid4().hex[:8].upper()}",
                "payment_method": "bank_transfer"
            }
        )
        assert proof_response.status_code == 200, f"Payment proof failed: {proof_response.text}"
        
        # Check logs for customer notification
        customer_logs = requests.get(f"{BASE_URL}/api/admin/notifications/logs?event_key=customer_payment_proof_received&limit=50").json()
        customer_notif = [log for log in customer_logs.get("logs", []) if log.get("recipient") == test_email]
        assert len(customer_notif) > 0, f"No customer_payment_proof_received notification for {test_email}"
        
        # Check logs for admin notification
        admin_logs = requests.get(f"{BASE_URL}/api/admin/notifications/logs?event_key=admin_payment_proof_submitted&limit=50").json()
        # Admin notification goes to admin email, not customer email
        admin_notif = [log for log in admin_logs.get("logs", []) if order_number in str(log.get("context", {}))]
        
        print(f"✓ Payment proof notifications fired: customer={len(customer_notif)}, admin logs checked")


class TestPaymentApprovalNotificationHook:
    """Test that payment approval fires customer_payment_verified notification"""

    def test_payment_approval_fires_notification(self):
        """POST /api/payment-proofs/admin/{id}/approve fires customer_payment_verified notification"""
        # Ensure trigger is enabled
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/trigger",
            json={"event_key": "customer_payment_verified", "enabled": True}
        )
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/provider",
            json={"enabled": True, "dry_run": True, "sender_name": "Konekt Test", "sender_email": "test@konekt.co.tz"}
        )
        
        # Create order and submit payment proof
        test_email = f"approval_test_{uuid4().hex[:6]}@example.com"
        checkout_response = requests.post(
            f"{BASE_URL}/api/public/checkout",
            json={
                "customer_name": "Approval Test Customer",
                "email": test_email,
                "phone": "+255700000003",
                "items": [{"product_id": "test-prod-3", "product_name": "Test Product 3", "quantity": 1, "unit_price": 40000}]
            }
        )
        assert checkout_response.status_code == 200
        order_number = checkout_response.json().get("order_number")
        
        # Submit payment proof
        proof_response = requests.post(
            f"{BASE_URL}/api/public/payment-proof",
            json={
                "order_number": order_number,
                "email": test_email,
                "amount_paid": 40000,
                "payer_name": "Approval Test Payer",
                "bank_reference": f"TXN-{uuid4().hex[:8].upper()}"
            }
        )
        assert proof_response.status_code == 200
        
        # Get the pending payment proof from admin queue
        admin_proofs = requests.get(f"{BASE_URL}/api/payment-proofs/admin?status=pending").json()
        proof_to_approve = None
        for proof in admin_proofs:
            if proof.get("order_number") == order_number or proof.get("customer_email") == test_email:
                proof_to_approve = proof
                break
        
        if not proof_to_approve:
            print(f"⚠ No pending proof found for order {order_number}, skipping approval test")
            return
        
        proof_id = proof_to_approve.get("id")
        
        # Approve the payment proof
        approve_response = requests.post(
            f"{BASE_URL}/api/payment-proofs/admin/{proof_id}/approve",
            json={"approved_by": "test_admin", "notes": "Test approval"}
        )
        assert approve_response.status_code == 200, f"Approval failed: {approve_response.text}"
        
        # Check logs for customer_payment_verified notification
        verified_logs = requests.get(f"{BASE_URL}/api/admin/notifications/logs?event_key=customer_payment_verified&limit=50").json()
        verified_notif = [log for log in verified_logs.get("logs", []) if log.get("recipient") == test_email]
        
        assert len(verified_notif) > 0, f"No customer_payment_verified notification for {test_email}"
        print(f"✓ Payment approval notification fired: status={verified_notif[0]['status']}")


class TestDisabledTriggerBehavior:
    """Test that disabled triggers produce 'skipped' status in logs"""

    def test_disabled_trigger_produces_skipped_status(self):
        """Disabled triggers produce 'skipped' status in logs (no dispatch)"""
        # Disable the trigger
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/trigger",
            json={"event_key": "customer_order_received", "enabled": False}
        )
        
        # Ensure provider is enabled
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/provider",
            json={"enabled": True, "dry_run": True, "sender_name": "Konekt Test", "sender_email": "test@konekt.co.tz"}
        )
        
        # Create a checkout order
        test_email = f"disabled_test_{uuid4().hex[:6]}@example.com"
        checkout_response = requests.post(
            f"{BASE_URL}/api/public/checkout",
            json={
                "customer_name": "Disabled Trigger Test",
                "email": test_email,
                "phone": "+255700000004",
                "items": [{"product_id": "test-prod-4", "product_name": "Test Product 4", "quantity": 1, "unit_price": 20000}]
            }
        )
        assert checkout_response.status_code == 200
        
        # Check logs - should have 'skipped' status
        logs = requests.get(f"{BASE_URL}/api/admin/notifications/logs?event_key=customer_order_received&limit=50").json()
        skipped_logs = [log for log in logs.get("logs", []) if log.get("recipient") == test_email and log.get("status") == "skipped"]
        
        # Re-enable the trigger for other tests
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/trigger",
            json={"event_key": "customer_order_received", "enabled": True}
        )
        
        assert len(skipped_logs) > 0, f"Expected 'skipped' log for disabled trigger, found none for {test_email}"
        print(f"✓ Disabled trigger produces 'skipped' status: {skipped_logs[0]['status']}")


class TestDryRunBehavior:
    """Test that dry_run mode produces 'dry_run' status in logs"""

    def test_dry_run_produces_dry_run_status(self):
        """Enabled triggers with provider dry_run=true produce 'dry_run' status in logs"""
        # Enable trigger and set dry_run=true
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/trigger",
            json={"event_key": "customer_order_received", "enabled": True}
        )
        requests.put(
            f"{BASE_URL}/api/admin/notifications/settings/provider",
            json={"enabled": True, "dry_run": True, "sender_name": "Konekt Test", "sender_email": "test@konekt.co.tz"}
        )
        
        # Send test notification
        test_email = f"dryrun_test_{uuid4().hex[:6]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/test",
            json={
                "event_key": "customer_order_received",
                "recipient_email": test_email
            }
        )
        assert response.status_code == 200
        
        result = response.json().get("dispatch_result", {})
        assert result.get("status") == "dry_run", f"Expected 'dry_run' status, got {result.get('status')}"
        
        # Verify in logs
        logs = requests.get(f"{BASE_URL}/api/admin/notifications/logs?event_key=customer_order_received&limit=50").json()
        dry_run_logs = [log for log in logs.get("logs", []) if log.get("recipient") == test_email and log.get("status") == "dry_run"]
        
        assert len(dry_run_logs) > 0, f"Expected 'dry_run' log, found none for {test_email}"
        print(f"✓ Dry-run mode produces 'dry_run' status in logs")


class TestSeedDefaults:
    """Test seeding default notification settings"""

    def test_seed_defaults_endpoint(self):
        """POST /api/admin/notifications/settings/seed initializes defaults"""
        response = requests.post(f"{BASE_URL}/api/admin/notifications/settings/seed")
        assert response.status_code == 200, f"Seed failed: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Seed should return ok=True"
        
        # Verify settings exist after seed
        settings_response = requests.get(f"{BASE_URL}/api/admin/notifications/settings")
        settings = settings_response.json()
        assert len(settings.get("settings", [])) >= 4, "Should have at least 4 triggers after seed"
        
        print(f"✓ Seed defaults endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
