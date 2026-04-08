"""
Test Stamp & Document Branding - Block 1
Tests for Connected Triad SVG stamp generator and document header branding
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStampGeneration:
    """Tests for POST /api/admin/settings/invoice-branding/generate-stamp"""
    
    def test_generate_circle_stamp_returns_svg_with_connected_triad(self):
        """Circle stamp should contain Connected Triad elements (stroke-linecap, topArc textPath, KONEKT wordmark)"""
        payload = {
            "stamp_shape": "circle",
            "stamp_color": "blue",
            "stamp_text_primary": "Test Company Ltd",
            "stamp_text_secondary": "Test City, Country",
            "stamp_registration_number": "REG-12345",
            "stamp_tax_number": "TIN-67890"
        }
        response = requests.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "svg" in data, "Response should contain 'svg' field"
        assert "stamp_preview_url" in data, "Response should contain 'stamp_preview_url' field"
        
        svg = data["svg"]
        
        # Verify Connected Triad elements
        assert 'stroke-linecap="round"' in svg, "SVG should contain stroke-linecap='round' for Connected Triad lines"
        assert 'topArc' in svg, "SVG should contain topArc path for arc text"
        assert 'KONEKT' in svg, "SVG should contain KONEKT wordmark"
        
        # Verify circle stamp structure
        assert '<circle' in svg, "Circle stamp should contain circle elements"
        assert 'viewBox="0 0 240 240"' in svg, "Circle stamp should have 240x240 viewBox"
        
        # Verify company text is uppercase
        assert "TEST COMPANY LTD" in svg, "Primary text should be uppercase"
        assert "TEST CITY, COUNTRY" in svg, "Secondary text should be uppercase"
        
        print(f"✓ Circle stamp generated with Connected Triad elements")
        print(f"  - stamp_preview_url: {data['stamp_preview_url']}")
    
    def test_generate_square_stamp_returns_valid_svg(self):
        """Square stamp should return valid SVG with Connected Triad elements"""
        payload = {
            "stamp_shape": "square",
            "stamp_color": "navy",
            "stamp_text_primary": "Konekt Limited",
            "stamp_text_secondary": "Dar es Salaam, Tanzania",
            "stamp_registration_number": "",
            "stamp_tax_number": ""
        }
        response = requests.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "svg" in data, "Response should contain 'svg' field"
        svg = data["svg"]
        
        # Verify square stamp structure
        assert '<rect' in svg, "Square stamp should contain rect elements"
        assert 'viewBox="0 0 240 240"' in svg, "Square stamp should have 240x240 viewBox"
        
        # Verify Connected Triad elements
        assert 'stroke-linecap="round"' in svg, "SVG should contain stroke-linecap='round' for Connected Triad lines"
        assert 'KONEKT' in svg, "SVG should contain KONEKT wordmark"
        
        print(f"✓ Square stamp generated successfully")
    
    def test_generate_stamp_with_different_colors(self):
        """Stamp should support different color options"""
        colors = ["blue", "navy", "red", "black"]
        color_hex_map = {
            "blue": "#1a365d",
            "navy": "#1a365d",
            "red": "#7f1d1d",
            "black": "#0f172a"
        }
        
        for color in colors:
            payload = {
                "stamp_shape": "circle",
                "stamp_color": color,
                "stamp_text_primary": "Test Company"
            }
            response = requests.post(f"{BASE_URL}/api/admin/settings/invoice-branding/generate-stamp", json=payload)
            
            assert response.status_code == 200, f"Color {color} failed: {response.text}"
            svg = response.json()["svg"]
            
            expected_hex = color_hex_map[color]
            assert expected_hex in svg, f"SVG should contain color {expected_hex} for {color}"
            print(f"✓ Color '{color}' generates stamp with {expected_hex}")


class TestStatementPreview:
    """Tests for GET /api/pdf/statements/{email}/preview"""
    
    def test_statement_preview_returns_html_with_connected_triad_logo(self):
        """Statement preview should contain Connected Triad SVG logo in header"""
        email = "demo.customer@konekt.com"
        response = requests.get(f"{BASE_URL}/api/pdf/statements/{email}/preview")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        html = response.text
        
        # Verify HTML structure
        assert '<!DOCTYPE html>' in html, "Response should be valid HTML"
        assert 'STATEMENT' in html, "HTML should contain STATEMENT title"
        
        # Verify Connected Triad logo elements (SVG with stroke-linecap for the triad lines)
        # The logo uses white nodes on navy background
        assert 'stroke-linecap="round"' in html, "HTML should contain Connected Triad SVG with stroke-linecap"
        
        # Verify gold contact bar
        assert '#D4A843' in html or 'D4A843' in html, "HTML should contain gold color for contact bar"
        
        print(f"✓ Statement preview contains Connected Triad logo and gold contact bar")


class TestInvoiceBrandingSettings:
    """Tests for GET/POST /api/admin/settings/invoice-branding"""
    
    def test_get_branding_returns_defaults(self):
        """GET branding should return default values"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/invoice-branding")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify default fields exist
        expected_fields = [
            "show_signature", "show_stamp", "cfo_name", "cfo_title",
            "stamp_mode", "stamp_shape", "stamp_color",
            "stamp_text_primary", "stamp_text_secondary",
            "contact_email", "contact_phone", "contact_address"
        ]
        
        for field in expected_fields:
            assert field in data, f"Response should contain '{field}' field"
        
        print(f"✓ Branding settings returned with all expected fields")
        print(f"  - stamp_text_primary: {data.get('stamp_text_primary')}")
        print(f"  - stamp_text_secondary: {data.get('stamp_text_secondary')}")


class TestLogoUpload:
    """Tests for POST /api/admin/settings/invoice-branding/logo-upload"""
    
    def test_logo_upload_accepts_image(self):
        """Logo upload should accept image files"""
        # Create a minimal PNG file (1x1 pixel)
        import io
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test-logo.png', io.BytesIO(png_data), 'image/png')}
        response = requests.post(f"{BASE_URL}/api/admin/settings/invoice-branding/logo-upload", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "url" in data, "Response should contain 'url' field"
        assert data["url"].startswith("/uploads/branding/"), "URL should be in branding uploads folder"
        assert "company-logo-" in data["url"], "URL should contain 'company-logo-' prefix"
        
        print(f"✓ Logo upload successful: {data['url']}")
    
    def test_logo_upload_rejects_non_image(self):
        """Logo upload should reject non-image files"""
        import io
        
        files = {'file': ('test.txt', io.BytesIO(b'not an image'), 'text/plain')}
        response = requests.post(f"{BASE_URL}/api/admin/settings/invoice-branding/logo-upload", files=files)
        
        assert response.status_code == 400, f"Expected 400 for non-image, got {response.status_code}"
        print(f"✓ Non-image file correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
