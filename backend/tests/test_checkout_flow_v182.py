"""
Test Suite for Checkout Flow - Iteration 182
Tests: Guest checkout, payment proof submission, file upload, payment info endpoint
"""
import pytest
import requests
import os
import io
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPaymentInfoEndpoint:
    """Test GET /api/public/payment-info - Bank details endpoint"""
    
    def test_get_payment_info_returns_200(self):
        """Payment info endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/public/payment-info")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ GET /api/public/payment-info returns 200")
    
    def test_payment_info_has_required_fields(self):
        """Payment info should contain bank details"""
        response = requests.get(f"{BASE_URL}/api/public/payment-info")
        assert response.status_code == 200
        data = response.json()
        
        # Check for required bank detail fields
        required_fields = ['bank_name', 'account_name', 'account_number']
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
            assert data[field], f"Field {field} is empty"
        
        print(f"✓ Payment info contains: bank_name={data.get('bank_name')}, account_name={data.get('account_name')}")


class TestGuestCheckout:
    """Test POST /api/public/checkout - Guest checkout flow"""
    
    def test_checkout_empty_cart_returns_400(self):
        """Checkout with empty cart should return 400"""
        payload = {
            "customer_name": "Test User",
            "email": "test@example.com",
            "phone": "+255712345678",
            "items": []
        }
        response = requests.post(f"{BASE_URL}/api/public/checkout", json=payload)
        assert response.status_code == 400, f"Expected 400 for empty cart, got {response.status_code}"
        print("✓ Empty cart checkout returns 400")
    
    def test_checkout_missing_required_fields_returns_400(self):
        """Checkout without required fields should return 400"""
        payload = {
            "items": [{"product_id": "test", "product_name": "Test", "quantity": 1, "unit_price": 1000}]
        }
        response = requests.post(f"{BASE_URL}/api/public/checkout", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing fields, got {response.status_code}"
        print("✓ Missing required fields returns 400")
    
    def test_checkout_success_creates_order(self):
        """Valid checkout should create order and return order details"""
        timestamp = datetime.now().strftime("%H%M%S")
        payload = {
            "customer_name": f"TEST_Checkout_{timestamp}",
            "email": f"test_checkout_{timestamp}@example.com",
            "phone": "+255712345678",
            "company_name": "Test Company",
            "delivery_address": "123 Test Street",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "notes": "Test order from automated testing",
            "items": [
                {
                    "product_id": "test-product-001",
                    "product_name": "Test Product",
                    "quantity": 2,
                    "unit_price": 50000,
                    "listing_type": "product"
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/public/checkout", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "order_number" in data, "Response should contain order_number"
        assert "order_id" in data, "Response should contain order_id"
        assert data.get("total") == 100000, f"Total should be 100000, got {data.get('total')}"
        assert "bank_details" in data, "Response should contain bank_details"
        
        # Store for payment proof test
        TestGuestCheckout.test_order_number = data["order_number"]
        TestGuestCheckout.test_email = payload["email"]
        TestGuestCheckout.test_total = data["total"]
        
        print(f"✓ Checkout success: order_number={data['order_number']}, total={data['total']}")
        return data
    
    def test_checkout_returns_bank_details(self):
        """Checkout response should include bank details for payment"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        payload = {
            "customer_name": f"TEST_Bank_{timestamp}",
            "email": f"test_bank_{timestamp}@example.com",
            "phone": "+255712345678",
            "items": [
                {"product_id": "test-001", "product_name": "Test", "quantity": 1, "unit_price": 10000}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/public/checkout", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        bank = data.get("bank_details", {})
        assert bank.get("bank_name"), "Bank details should include bank_name"
        assert bank.get("account_number"), "Bank details should include account_number"
        
        print(f"✓ Checkout returns bank details: {bank.get('bank_name')}")


class TestPaymentProof:
    """Test POST /api/public/payment-proof - Payment proof submission"""
    
    def test_payment_proof_missing_order_returns_400(self):
        """Payment proof without order number should return 400"""
        payload = {
            "email": "test@example.com",
            "payer_name": "Test Payer",
            "amount_paid": 10000
        }
        response = requests.post(f"{BASE_URL}/api/public/payment-proof", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing order number returns 400")
    
    def test_payment_proof_invalid_order_returns_404(self):
        """Payment proof for non-existent order should return 404"""
        payload = {
            "order_number": "ORD-INVALID-999999",
            "email": "test@example.com",
            "payer_name": "Test Payer",
            "amount_paid": 10000
        }
        response = requests.post(f"{BASE_URL}/api/public/payment-proof", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid order number returns 404")
    
    def test_payment_proof_wrong_email_returns_403(self):
        """Payment proof with wrong email should return 403"""
        # First create an order
        timestamp = datetime.now().strftime("%H%M%S%f")
        checkout_payload = {
            "customer_name": f"TEST_WrongEmail_{timestamp}",
            "email": f"correct_{timestamp}@example.com",
            "phone": "+255712345678",
            "items": [{"product_id": "test", "product_name": "Test", "quantity": 1, "unit_price": 10000}]
        }
        checkout_response = requests.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert checkout_response.status_code == 200
        order_number = checkout_response.json()["order_number"]
        
        # Try payment proof with wrong email
        proof_payload = {
            "order_number": order_number,
            "email": "wrong@example.com",
            "payer_name": "Test Payer",
            "amount_paid": 10000
        }
        response = requests.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Wrong email returns 403")
    
    def test_payment_proof_success(self):
        """Valid payment proof should be accepted"""
        # First create an order
        timestamp = datetime.now().strftime("%H%M%S%f")
        checkout_payload = {
            "customer_name": f"TEST_ProofSuccess_{timestamp}",
            "email": f"proof_success_{timestamp}@example.com",
            "phone": "+255712345678",
            "items": [{"product_id": "test", "product_name": "Test", "quantity": 1, "unit_price": 50000}]
        }
        checkout_response = requests.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert checkout_response.status_code == 200
        order_data = checkout_response.json()
        
        # Submit payment proof
        proof_payload = {
            "order_number": order_data["order_number"],
            "email": checkout_payload["email"],
            "payer_name": checkout_payload["customer_name"],
            "amount_paid": 50000,
            "bank_reference": f"TXN-{timestamp}",
            "payment_method": "bank_transfer",
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Test payment proof"
        }
        response = requests.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert data.get("payment_status") == "pending_review", "Payment status should be pending_review"
        assert "account_info" in data, "Response should contain account_info for CTA"
        
        print(f"✓ Payment proof submitted successfully for order {order_data['order_number']}")


class TestFileUpload:
    """Test POST /api/public/upload-proof-file - File upload endpoint"""
    
    def test_upload_no_file_returns_422(self):
        """Upload without file should return 422"""
        response = requests.post(f"{BASE_URL}/api/public/upload-proof-file")
        # FastAPI returns 422 for missing required file
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ No file upload returns 422")
    
    def test_upload_unsupported_type_returns_400(self):
        """Upload unsupported file type should return 400"""
        # Create a fake .exe file
        files = {'file': ('test.exe', io.BytesIO(b'fake executable content'), 'application/octet-stream')}
        response = requests.post(f"{BASE_URL}/api/public/upload-proof-file", files=files)
        assert response.status_code == 400, f"Expected 400 for unsupported type, got {response.status_code}"
        print("✓ Unsupported file type returns 400")
    
    def test_upload_jpg_success(self):
        """Upload JPG image should succeed"""
        # Create a minimal valid JPEG (smallest valid JPEG)
        jpeg_bytes = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xBA, 0xAE, 0xAF,
            0xDA, 0xAD, 0xEB, 0xFF, 0xD9
        ])
        
        files = {'file': ('test_proof.jpg', io.BytesIO(jpeg_bytes), 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/public/upload-proof-file", files=files)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "url" in data, "Response should contain url"
        assert data.get("url").endswith(".jpg"), "URL should end with .jpg"
        
        print(f"✓ JPG upload success: {data.get('url')}")
    
    def test_upload_png_success(self):
        """Upload PNG image should succeed"""
        # Minimal valid PNG (1x1 transparent pixel)
        png_bytes = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
            0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('test_proof.png', io.BytesIO(png_bytes), 'image/png')}
        response = requests.post(f"{BASE_URL}/api/public/upload-proof-file", files=files)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert data.get("url").endswith(".png")
        
        print(f"✓ PNG upload success: {data.get('url')}")
    
    def test_upload_pdf_success(self):
        """Upload PDF should succeed"""
        # Minimal valid PDF
        pdf_bytes = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
trailer<</Size 4/Root 1 0 R>>
startxref
170
%%EOF"""
        
        files = {'file': ('test_proof.pdf', io.BytesIO(pdf_bytes), 'application/pdf')}
        response = requests.post(f"{BASE_URL}/api/public/upload-proof-file", files=files)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert data.get("url").endswith(".pdf")
        
        print(f"✓ PDF upload success: {data.get('url')}")
    
    def test_upload_webp_success(self):
        """Upload WebP image should succeed"""
        # Minimal WebP (1x1 pixel)
        webp_bytes = bytes([
            0x52, 0x49, 0x46, 0x46, 0x1A, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
            0x56, 0x50, 0x38, 0x4C, 0x0D, 0x00, 0x00, 0x00, 0x2F, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ])
        
        files = {'file': ('test_proof.webp', io.BytesIO(webp_bytes), 'image/webp')}
        response = requests.post(f"{BASE_URL}/api/public/upload-proof-file", files=files)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert data.get("url").endswith(".webp")
        
        print(f"✓ WebP upload success: {data.get('url')}")


class TestOrderStatus:
    """Test GET /api/public/order-status - Order tracking"""
    
    def test_order_status_invalid_order_returns_404(self):
        """Invalid order number should return 404"""
        response = requests.get(f"{BASE_URL}/api/public/order-status/ORD-INVALID-999999")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid order status returns 404")
    
    def test_order_status_success(self):
        """Valid order should return status"""
        # First create an order
        timestamp = datetime.now().strftime("%H%M%S%f")
        checkout_payload = {
            "customer_name": f"TEST_Status_{timestamp}",
            "email": f"status_{timestamp}@example.com",
            "phone": "+255712345678",
            "items": [{"product_id": "test", "product_name": "Test", "quantity": 1, "unit_price": 10000}]
        }
        checkout_response = requests.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert checkout_response.status_code == 200
        order_number = checkout_response.json()["order_number"]
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/public/order-status/{order_number}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("order_number") == order_number
        assert "status" in data or "current_status" in data
        
        print(f"✓ Order status retrieved for {order_number}")


class TestEndToEndCheckoutFlow:
    """End-to-end test of the complete checkout flow"""
    
    def test_complete_checkout_flow(self):
        """Test complete flow: checkout -> payment proof"""
        timestamp = datetime.now().strftime("%H%M%S%f")
        
        # Step 1: Create order via checkout
        checkout_payload = {
            "customer_name": f"TEST_E2E_{timestamp}",
            "email": f"e2e_{timestamp}@example.com",
            "phone": "+255712345678",
            "company_name": "E2E Test Company",
            "delivery_address": "456 E2E Street",
            "city": "Dar es Salaam",
            "country": "Tanzania",
            "notes": "E2E test order",
            "items": [
                {"product_id": "prod-001", "product_name": "Product A", "quantity": 2, "unit_price": 25000},
                {"product_id": "prod-002", "product_name": "Product B", "quantity": 1, "unit_price": 50000}
            ]
        }
        
        checkout_response = requests.post(f"{BASE_URL}/api/public/checkout", json=checkout_payload)
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        
        order_data = checkout_response.json()
        assert order_data.get("ok") == True
        assert order_data.get("total") == 100000  # 2*25000 + 1*50000
        
        order_number = order_data["order_number"]
        print(f"✓ Step 1: Order created - {order_number}, total: {order_data['total']}")
        
        # Step 2: Verify bank details in response
        bank = order_data.get("bank_details", {})
        assert bank.get("bank_name"), "Bank name missing"
        assert bank.get("account_number"), "Account number missing"
        print(f"✓ Step 2: Bank details received - {bank.get('bank_name')}")
        
        # Step 3: Submit payment proof
        proof_payload = {
            "order_number": order_number,
            "email": checkout_payload["email"],
            "payer_name": checkout_payload["customer_name"],
            "amount_paid": 100000,
            "bank_reference": f"E2E-TXN-{timestamp}",
            "payment_method": "bank_transfer",
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "E2E test payment"
        }
        
        proof_response = requests.post(f"{BASE_URL}/api/public/payment-proof", json=proof_payload)
        assert proof_response.status_code == 200, f"Payment proof failed: {proof_response.text}"
        
        proof_data = proof_response.json()
        assert proof_data.get("ok") == True
        assert proof_data.get("payment_status") == "pending_review"
        
        # Step 4: Verify account CTA is present
        account_info = proof_data.get("account_info", {})
        assert account_info.get("type") in ["login", "create_account"], "Account CTA type missing"
        
        print(f"✓ Step 3: Payment proof submitted - status: {proof_data['payment_status']}")
        print(f"✓ Step 4: Account CTA present - type: {account_info.get('type')}")
        print(f"✓ E2E checkout flow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
