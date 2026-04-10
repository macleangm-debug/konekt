"""
Test Suite: Vendor Image Upload Flow (Phase 1)
Tests file upload, vendor product submission with images, admin approval with gallery.
"""
import pytest
import requests
import os
import io
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"


class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    admin_token = None
    partner_token = None
    
    def test_admin_login(self):
        """Admin login via POST /api/auth/login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data or "token" in data, "No token in response"
        TestAuthAndSetup.admin_token = data.get("access_token") or data.get("token")
        print(f"Admin login successful, token: {TestAuthAndSetup.admin_token[:20]}...")
    
    def test_partner_login(self):
        """Partner login via POST /api/partner-auth/login"""
        response = requests.post(f"{BASE_URL}/api/partner-auth/login", json={
            "email": PARTNER_EMAIL,
            "password": PARTNER_PASSWORD
        })
        assert response.status_code == 200, f"Partner login failed: {response.text}"
        data = response.json()
        assert "access_token" in data or "token" in data, "No token in response"
        TestAuthAndSetup.partner_token = data.get("access_token") or data.get("token")
        print(f"Partner login successful, token: {TestAuthAndSetup.partner_token[:20]}...")


class TestFileUpload:
    """File upload endpoint tests"""
    
    uploaded_paths = []
    
    def test_upload_single_image(self):
        """POST /api/files/upload - single image upload"""
        token = TestAuthAndSetup.partner_token
        assert token, "Partner token required"
        
        # Create a test image in memory
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test_image.png', img_bytes, 'image/png')}
        data = {'folder': 'products'}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        assert result.get("ok") == True, "Upload not ok"
        assert "storage_path" in result, "No storage_path in response"
        assert "file_id" in result, "No file_id in response"
        assert result["storage_path"].startswith("konekt/products/"), f"Invalid path: {result['storage_path']}"
        
        TestFileUpload.uploaded_paths.append(result["storage_path"])
        print(f"Uploaded image: {result['storage_path']}")
    
    def test_upload_multiple_images(self):
        """Upload 3 images for gallery test"""
        token = TestAuthAndSetup.partner_token
        assert token, "Partner token required"
        
        colors = ['green', 'blue', 'yellow']
        for i, color in enumerate(colors):
            img = Image.new('RGB', (100, 100), color=color)
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            
            files = {'file': (f'test_image_{color}.png', img_bytes, 'image/png')}
            data = {'folder': 'products'}
            
            response = requests.post(
                f"{BASE_URL}/api/files/upload",
                files=files,
                data=data,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200, f"Upload {i+1} failed: {response.text}"
            result = response.json()
            assert result.get("ok") == True
            TestFileUpload.uploaded_paths.append(result["storage_path"])
            print(f"Uploaded image {i+2}: {result['storage_path']}")
        
        assert len(TestFileUpload.uploaded_paths) >= 4, "Should have at least 4 uploaded images"
    
    def test_upload_invalid_file_type(self):
        """POST /api/files/upload - reject non-image file"""
        token = TestAuthAndSetup.partner_token
        assert token, "Partner token required"
        
        files = {'file': ('test.txt', b'This is not an image', 'text/plain')}
        data = {'folder': 'products'}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400, f"Should reject non-image: {response.status_code}"
        print("Invalid file type correctly rejected")
    
    def test_serve_uploaded_file(self):
        """GET /api/files/serve/{path} - serve uploaded file"""
        if not TestFileUpload.uploaded_paths:
            pytest.skip("No uploaded files to serve")
        
        path = TestFileUpload.uploaded_paths[0]
        response = requests.get(f"{BASE_URL}/api/files/serve/{path}")
        
        assert response.status_code == 200, f"Serve failed: {response.status_code}"
        assert response.headers.get("Content-Type", "").startswith("image/"), "Not an image content type"
        print(f"File served successfully: {path}")


class TestVendorTaxonomy:
    """Vendor taxonomy endpoint tests"""
    
    category_id = None
    group_id = None
    
    def test_get_taxonomy(self):
        """GET /api/vendor/products/taxonomy - get filtered taxonomy"""
        token = TestAuthAndSetup.partner_token
        assert token, "Partner token required"
        
        response = requests.get(
            f"{BASE_URL}/api/vendor/products/taxonomy",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Taxonomy failed: {response.text}"
        data = response.json()
        
        # Check if blocked
        if data.get("blocked"):
            pytest.skip(f"Vendor blocked: {data.get('reason')}")
        
        assert "categories" in data, "No categories in taxonomy"
        assert len(data["categories"]) > 0, "No categories available"
        
        # Find Office Supplies group and a category
        groups = data.get("groups", [])
        categories = data.get("categories", [])
        
        # Try to find Office Supplies group
        office_group = next((g for g in groups if "office" in g.get("name", "").lower()), None)
        if office_group:
            TestVendorTaxonomy.group_id = office_group["id"]
            print(f"Found group: {office_group['name']} ({office_group['id']})")
        
        # Get first available category
        TestVendorTaxonomy.category_id = categories[0]["id"]
        print(f"Using category: {categories[0]['name']} ({categories[0]['id']})")


class TestVendorProductUpload:
    """Vendor product upload tests"""
    
    submission_id = None
    submission_with_images_id = None
    
    def test_upload_product_without_images(self):
        """POST /api/vendor/products/upload - product without images"""
        token = TestAuthAndSetup.partner_token
        category_id = TestVendorTaxonomy.category_id
        assert token, "Partner token required"
        assert category_id, "Category ID required"
        
        payload = {
            "product": {
                "product_name": "TEST_NoImage_Product",
                "brand": "TestBrand",
                "category_id": category_id,
                "short_description": "A test product without images",
                "images": []
            },
            "supply": {
                "base_price_vat_inclusive": 50000,
                "lead_time_days": 3,
                "supply_mode": "in_stock",
                "default_quantity": 1,
                "allocated_quantity": 100
            },
            "variants": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/products/upload",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "submission" in data
        
        sub = data["submission"]
        assert sub.get("id"), "No submission ID"
        assert sub.get("review_status") == "pending_review"
        assert sub.get("allocated_quantity") == 100, f"allocated_quantity mismatch: {sub.get('allocated_quantity')}"
        
        TestVendorProductUpload.submission_id = sub["id"]
        print(f"Created submission without images: {sub['id']}")
    
    def test_upload_product_with_single_image(self):
        """POST /api/vendor/products/upload - product with single image"""
        token = TestAuthAndSetup.partner_token
        category_id = TestVendorTaxonomy.category_id
        assert token, "Partner token required"
        assert category_id, "Category ID required"
        
        # Use first uploaded image
        images = TestFileUpload.uploaded_paths[:1] if TestFileUpload.uploaded_paths else []
        
        payload = {
            "product": {
                "product_name": "TEST_SingleImage_Product",
                "brand": "TestBrand",
                "category_id": category_id,
                "short_description": "A test product with single image",
                "images": images
            },
            "supply": {
                "base_price_vat_inclusive": 75000,
                "lead_time_days": 5,
                "supply_mode": "in_stock",
                "default_quantity": 1,
                "allocated_quantity": 50
            },
            "variants": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/products/upload",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        
        sub = data["submission"]
        assert sub.get("image_url") == images[0] if images else True, "Primary image not set"
        print(f"Created submission with single image: {sub['id']}")
    
    def test_upload_product_with_multiple_images(self):
        """POST /api/vendor/products/upload - product with 3+ images (gallery)"""
        token = TestAuthAndSetup.partner_token
        category_id = TestVendorTaxonomy.category_id
        assert token, "Partner token required"
        assert category_id, "Category ID required"
        
        # Use all uploaded images
        images = TestFileUpload.uploaded_paths if TestFileUpload.uploaded_paths else []
        if len(images) < 3:
            pytest.skip("Need at least 3 uploaded images for gallery test")
        
        payload = {
            "product": {
                "product_name": "TEST_Gallery_Product",
                "brand": "TestBrand",
                "category_id": category_id,
                "short_description": "A test product with image gallery",
                "full_description": "This product has multiple images for gallery testing",
                "images": images
            },
            "supply": {
                "base_price_vat_inclusive": 120000,
                "lead_time_days": 7,
                "supply_mode": "in_stock",
                "default_quantity": 1,
                "allocated_quantity": 200
            },
            "variants": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/products/upload",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        
        sub = data["submission"]
        assert sub.get("image_url") == images[0], "Primary image should be first image"
        assert len(sub.get("gallery_images", [])) >= 2, f"Gallery should have 2+ images: {sub.get('gallery_images')}"
        assert sub.get("allocated_quantity") == 200
        
        TestVendorProductUpload.submission_with_images_id = sub["id"]
        print(f"Created submission with gallery: {sub['id']}, gallery_images: {len(sub.get('gallery_images', []))}")
    
    def test_upload_negative_allocated_quantity(self):
        """POST /api/vendor/products/upload - reject negative allocated_quantity"""
        token = TestAuthAndSetup.partner_token
        category_id = TestVendorTaxonomy.category_id
        assert token, "Partner token required"
        assert category_id, "Category ID required"
        
        payload = {
            "product": {
                "product_name": "TEST_NegativeQty_Product",
                "brand": "TestBrand",
                "category_id": category_id,
                "images": []
            },
            "supply": {
                "base_price_vat_inclusive": 50000,
                "allocated_quantity": -10  # Negative - should be rejected
            },
            "variants": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vendor/products/upload",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Backend may accept 0 or reject negative - check behavior
        if response.status_code == 200:
            data = response.json()
            sub = data.get("submission", {})
            # If accepted, allocated_quantity should be 0 or positive
            assert sub.get("allocated_quantity", 0) >= 0, "Negative quantity should not be stored"
            print("Backend accepted but normalized negative quantity")
        else:
            assert response.status_code == 400, f"Should reject negative qty: {response.status_code}"
            print("Backend correctly rejected negative allocated_quantity")


class TestAdminSubmissionReview:
    """Admin vendor submission review tests"""
    
    def test_get_submission_stats(self):
        """GET /api/admin/vendor-submissions/stats"""
        token = TestAuthAndSetup.admin_token
        assert token, "Admin token required"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-submissions/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "pending" in data
        assert "approved" in data
        assert "rejected" in data
        print(f"Stats: total={data['total']}, pending={data['pending']}, approved={data['approved']}, rejected={data['rejected']}")
    
    def test_list_submissions(self):
        """GET /api/admin/vendor-submissions"""
        token = TestAuthAndSetup.admin_token
        assert token, "Admin token required"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-submissions",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"List failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return list"
        
        # Check normalization - should have flat fields
        if data:
            sub = data[0]
            assert "product_name" in sub or "product" in sub, "Should have product info"
            print(f"Found {len(data)} submissions")
            
            # Check for gallery_images normalization
            for s in data[:5]:
                if s.get("gallery_images"):
                    print(f"Submission {s['id']} has gallery_images: {len(s['gallery_images'])}")
    
    def test_list_pending_submissions(self):
        """GET /api/admin/vendor-submissions?status=pending"""
        token = TestAuthAndSetup.admin_token
        assert token, "Admin token required"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-submissions?status=pending",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"List pending failed: {response.text}"
        data = response.json()
        
        # All should be pending or pending_review
        for sub in data:
            assert sub.get("review_status") in ("pending", "pending_review"), f"Non-pending in list: {sub.get('review_status')}"
        
        print(f"Found {len(data)} pending submissions")
    
    def test_get_single_submission(self):
        """GET /api/admin/vendor-submissions/{id}"""
        token = TestAuthAndSetup.admin_token
        submission_id = TestVendorProductUpload.submission_with_images_id or TestVendorProductUpload.submission_id
        
        if not submission_id:
            pytest.skip("No submission ID available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-submissions/{submission_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Get submission failed: {response.text}"
        data = response.json()
        assert data.get("id") == submission_id
        print(f"Got submission: {data.get('id')}, status: {data.get('review_status')}")
    
    def test_approve_submission_with_images(self):
        """POST /api/admin/vendor-submissions/{id}/approve - creates catalog product with gallery"""
        token = TestAuthAndSetup.admin_token
        submission_id = TestVendorProductUpload.submission_with_images_id
        
        if not submission_id:
            pytest.skip("No submission with images to approve")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-submissions/{submission_id}/approve",
            json={"publish": True, "notes": "Approved via test"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Approve failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert "product_id" in data, "Should return product_id"
        
        product_id = data["product_id"]
        print(f"Approved submission {submission_id}, created product {product_id}")
        
        # Verify the created product has gallery_images and allocated_quantity
        # Note: We'd need a products endpoint to verify this fully
    
    def test_reject_submission(self):
        """POST /api/admin/vendor-submissions/{id}/reject"""
        token = TestAuthAndSetup.admin_token
        submission_id = TestVendorProductUpload.submission_id
        
        if not submission_id:
            pytest.skip("No submission to reject")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-submissions/{submission_id}/reject",
            json={"notes": "Rejected via test - missing details"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Reject failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print(f"Rejected submission {submission_id}")


class TestBulkActions:
    """Bulk approve/reject tests"""
    
    bulk_submission_ids = []
    
    def test_create_submissions_for_bulk(self):
        """Create 2 submissions for bulk testing"""
        token = TestAuthAndSetup.partner_token
        category_id = TestVendorTaxonomy.category_id
        
        if not token or not category_id:
            pytest.skip("Token or category not available")
        
        for i in range(2):
            payload = {
                "product": {
                    "product_name": f"TEST_Bulk_Product_{i+1}",
                    "brand": "BulkBrand",
                    "category_id": category_id,
                    "images": []
                },
                "supply": {
                    "base_price_vat_inclusive": 30000 + (i * 10000),
                    "allocated_quantity": 25 + (i * 25)
                },
                "variants": []
            }
            
            response = requests.post(
                f"{BASE_URL}/api/vendor/products/upload",
                json=payload,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("submission", {}).get("id"):
                    TestBulkActions.bulk_submission_ids.append(data["submission"]["id"])
        
        print(f"Created {len(TestBulkActions.bulk_submission_ids)} submissions for bulk test")
    
    def test_bulk_approve(self):
        """POST /api/admin/vendor-submissions/bulk-approve"""
        token = TestAuthAndSetup.admin_token
        ids = TestBulkActions.bulk_submission_ids[:1]  # Approve first one
        
        if not ids:
            pytest.skip("No submissions for bulk approve")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-submissions/bulk-approve",
            json={"ids": ids, "publish": True, "notes": "Bulk approved via test"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Bulk approve failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        assert data.get("approved", 0) >= 1, "Should approve at least 1"
        print(f"Bulk approved: {data.get('approved')}, errors: {data.get('errors', [])}")
    
    def test_bulk_reject(self):
        """POST /api/admin/vendor-submissions/bulk-reject"""
        token = TestAuthAndSetup.admin_token
        ids = TestBulkActions.bulk_submission_ids[1:2]  # Reject second one
        
        if not ids:
            pytest.skip("No submissions for bulk reject")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vendor-submissions/bulk-reject",
            json={"ids": ids, "notes": "Bulk rejected via test"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Bulk reject failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True
        print(f"Bulk rejected: {data.get('rejected')}, errors: {data.get('errors', [])}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_verify_final_stats(self):
        """Verify final submission stats"""
        token = TestAuthAndSetup.admin_token
        if not token:
            pytest.skip("No admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/vendor-submissions/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"Final stats: total={data['total']}, pending={data['pending']}, approved={data['approved']}, rejected={data['rejected']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
