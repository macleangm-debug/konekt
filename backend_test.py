#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class KonektAPITester:
    def __init__(self, base_url: str = "https://konekt-qa-sweep.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.test_user_email = f"test_user_{int(time.time())}@example.com"
        self.test_password = "TestPass123!"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()
        
    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        # Default headers
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)
            
        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        self.log(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                try:
                    return False, response.json()
                except:
                    return False, {'error': response.text}
                    
        except Exception as e:
            self.log(f"❌ FAILED - Exception: {str(e)}", "ERROR")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}
    
    def test_health_endpoints(self):
        """Test basic health and connectivity"""
        self.log("🏥 Testing Health Endpoints", "INFO")
        
        # Test root endpoint
        self.run_test("Root Endpoint", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "health", 200)
        
    def test_product_seeding(self):
        """Seed products for testing"""
        self.log("🌱 Seeding Products", "INFO")
        success, response = self.run_test("Seed Products", "POST", "seed", 200)
        if success:
            self.log(f"   Seeded products: {response.get('message', 'Unknown')}")
        return success
        
    def test_product_endpoints(self):
        """Test product-related endpoints"""
        self.log("📦 Testing Product Endpoints", "INFO")
        
        # Get all products
        success, products_response = self.run_test("Get All Products", "GET", "products", 200)
        if success and products_response.get('products'):
            self.log(f"   Found {len(products_response['products'])} products")
            
            # Test getting a specific product
            product_id = products_response['products'][0]['id']
            self.run_test("Get Specific Product", "GET", f"products/{product_id}", 200)
        
        # Get categories
        self.run_test("Get Categories", "GET", "products/categories/list", 200)
        
        # Test product filtering
        self.run_test("Filter by Category", "GET", "products?category=Apparel", 200)
        self.run_test("Search Products", "GET", "products?search=shirt", 200)
        
    def test_authentication(self):
        """Test user registration and login"""
        self.log("🔐 Testing Authentication", "INFO")
        
        # Test registration
        register_data = {
            "email": self.test_user_email,
            "password": self.test_password,
            "full_name": "Test User",
            "phone": "+255712345678",
            "company": "Test Company Ltd"
        }
        
        success, register_response = self.run_test("User Registration", "POST", "auth/register", 200, register_data)
        
        if success:
            self.token = register_response.get('token')
            self.user_id = register_response.get('user', {}).get('id')
            user_points = register_response.get('user', {}).get('points', 0)
            
            self.log(f"   User registered with {user_points} points")
            if user_points != 100:
                self.log(f"   ⚠️  Expected 100 welcome points, got {user_points}", "WARN")
                
            # Test getting user profile
            self.run_test("Get User Profile", "GET", "auth/me", 200)
            
        # Test login with same credentials
        login_data = {
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        success, login_response = self.run_test("User Login", "POST", "auth/login", 200, login_data)
        if success:
            self.token = login_response.get('token')  # Update token
            
        return success
        
    def test_referral_system(self):
        """Test referral functionality"""
        self.log("🎁 Testing Referral System", "INFO")
        
        if not self.token:
            self.log("   Skipping - No authentication token", "WARN")
            return False
            
        # Get referral stats
        success, stats = self.run_test("Get Referral Stats", "GET", "referrals/stats", 200)
        if success:
            referral_code = stats.get('referral_code')
            self.log(f"   User referral code: {referral_code}")
            
        # Test using invalid referral code (should fail)
        self.run_test("Use Invalid Referral", "POST", "referrals/use", 404, {"referral_code": "INVALID-CODE"})
        
        return success
        
    def test_quote_calculator(self):
        """Test quote calculation"""
        self.log("💰 Testing Quote Calculator", "INFO")
        
        quote_requests = [
            {"product_type": "t-shirt", "print_method": "screen_print", "quantity": 25},
            {"product_type": "polo", "print_method": "embroidery", "quantity": 50},
            {"product_type": "mug", "print_method": "dtg", "quantity": 100},
        ]
        
        for quote_data in quote_requests:
            success, response = self.run_test(
                f"Quote for {quote_data['quantity']} {quote_data['product_type']}s", 
                "POST", "quote/calculate", 200, quote_data
            )
            if success:
                total = response.get('total', 0)
                discount = response.get('discount_rate', 0)
                self.log(f"   Total: TZS {total:,} (Discount: {discount*100:.0f}%)")
                
    def test_order_workflow(self):
        """Test complete order workflow"""
        self.log("🛒 Testing Order Workflow", "INFO")
        
        if not self.token:
            self.log("   Skipping - No authentication token", "WARN")
            return False
            
        # Create test order
        order_data = {
            "items": [{
                "product_id": "test-product-id",
                "product_name": "Test T-Shirt",
                "quantity": 25,
                "size": "M",
                "color": "Black",
                "print_method": "Screen Print",
                "logo_url": None,
                "logo_position": "front",
                "unit_price": 10000,
                "subtotal": 250000,
                "customization_data": {}
            }],
            "delivery_address": "123 Test Street, Dar es Salaam, Tanzania",
            "delivery_phone": "+255712345678",
            "notes": "Test order for API testing",
            "deposit_percentage": 30
        }
        
        success, order_response = self.run_test("Create Order", "POST", "orders", 200, order_data)
        
        if success:
            order_id = order_response.get('order', {}).get('id')
            self.log(f"   Created order: {order_id}")
            
            # Get user orders
            self.run_test("Get User Orders", "GET", "orders", 200)
            
            # Get specific order
            if order_id:
                self.run_test("Get Specific Order", "GET", f"orders/{order_id}", 200)
                
                # Test deposit payment (mock)
                self.run_test("Pay Deposit", "POST", f"orders/{order_id}/pay-deposit", 200)
                
        return success
        
    def test_draft_management(self):
        """Test draft saving and management"""
        self.log("📝 Testing Draft Management", "INFO")
        
        if not self.token:
            self.log("   Skipping - No authentication token", "WARN")
            return False
            
        # Create draft
        draft_data = {
            "name": "Test Draft Design",
            "product_id": "test-product-id",
            "customization_data": {
                "selectedColor": {"name": "Red", "hex": "#FF0000"},
                "selectedSize": "L",
                "logoPosition": "front"
            }
        }
        
        success, draft_response = self.run_test("Save Draft", "POST", "drafts", 200, draft_data)
        
        if success:
            draft_id = draft_response.get('draft', {}).get('id')
            
            # Get user drafts
            success, drafts_response = self.run_test("Get User Drafts", "GET", "drafts", 200)
            
            # Delete draft
            if draft_id:
                self.run_test("Delete Draft", "DELETE", f"drafts/{draft_id}", 200)
                
        return success
        
    def test_ai_features(self):
        """Test AI chat and logo generation"""
        self.log("🤖 Testing AI Features", "INFO")
        
        # Test AI Chat
        chat_data = {
            "message": "Hello, I need help choosing a t-shirt for my company",
            "session_id": f"test-session-{int(time.time())}"
        }
        
        success, chat_response = self.run_test("AI Chat", "POST", "chat", 200, chat_data)
        if success:
            response_text = chat_response.get('response', '')
            session_id = chat_response.get('session_id')
            self.log(f"   AI Response: {response_text[:100]}...")
            
            # Test chat history
            if session_id:
                self.run_test("Get Chat History", "GET", f"chat/history/{session_id}", 200)
        
        # Test AI Logo Generation
        logo_data = {
            "prompt": "Modern, minimalist design with blue colors",
            "business_name": "Test Company",
            "industry": "Technology"
        }
        
        self.log("   🎨 Testing AI Logo Generation (may take up to 1 minute)...")
        success, logo_response = self.run_test("AI Logo Generation", "POST", "logo/generate", 200, logo_data)
        if success:
            has_image = 'image_base64' in logo_response
            self.log(f"   Logo generated: {has_image}")
            
    def run_all_tests(self):
        """Run comprehensive test suite"""
        self.log("🚀 Starting Konekt API Test Suite", "INFO")
        self.log(f"   Base URL: {self.base_url}")
        
        start_time = time.time()
        
        try:
            # Test in logical order
            self.test_health_endpoints()
            
            # Seed products first
            if self.test_product_seeding():
                self.test_product_endpoints()
            
            # Test authentication
            if self.test_authentication():
                self.test_referral_system()
                self.test_order_workflow()
                self.test_draft_management()
                
            # Test features that don't require auth
            self.test_quote_calculator()
            self.test_ai_features()
            
        except KeyboardInterrupt:
            self.log("Tests interrupted by user", "WARN")
        except Exception as e:
            self.log(f"Unexpected error: {e}", "ERROR")
            
        # Print summary
        end_time = time.time()
        duration = end_time - start_time
        
        self.log("=" * 60, "INFO")
        self.log("📊 TEST SUMMARY", "INFO")
        self.log(f"   Tests Run: {self.tests_run}")
        self.log(f"   Tests Passed: {self.tests_passed}")
        self.log(f"   Tests Failed: {len(self.failed_tests)}")
        self.log(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        self.log(f"   Duration: {duration:.1f}s")
        
        if self.failed_tests:
            self.log("❌ FAILED TESTS:", "ERROR")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
                self.log(f"   - {test['name']}: {error_msg}", "ERROR")
                
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = KonektAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"Fatal error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())