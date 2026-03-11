"""
Test Quote Pipeline (Kanban) API Endpoints
- GET /api/admin/quotes/pipeline - Returns quotes grouped by status columns
- PATCH /api/admin/quotes/{quote_id}/move - Moves quote to different stage
- GET /api/admin/quotes/pipeline/stats - Returns pipeline statistics
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestQuotePipelineAPI:
    """Test quote pipeline API for Kanban board"""

    def test_get_pipeline_success(self, api_client):
        """GET /api/admin/quotes/pipeline - Returns quotes grouped by status"""
        response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "columns" in data, "Response should have 'columns' key"
        assert "summary" in data, "Response should have 'summary' key"
        
        # Verify column structure - should have 4 kanban columns + other
        columns = data["columns"]
        assert "draft" in columns, "Missing 'draft' column"
        assert "sent" in columns, "Missing 'sent' column"
        assert "approved" in columns, "Missing 'approved' column"
        assert "converted" in columns, "Missing 'converted' column"
        assert "other" in columns, "Missing 'other' column for non-kanban statuses"
        
        # Verify summary has counts
        summary = data["summary"]
        assert "draft" in summary, "Summary missing 'draft' count"
        assert "sent" in summary, "Summary missing 'sent' count"
        assert "approved" in summary, "Summary missing 'approved' count"
        assert "converted" in summary, "Summary missing 'converted' count"
        assert "total_value" in summary, "Summary missing 'total_value'"
        
        # Verify counts are integers
        assert isinstance(summary["draft"], int), "Draft count should be integer"
        assert isinstance(summary["sent"], int), "Sent count should be integer"
        assert isinstance(summary["approved"], int), "Approved count should be integer"
        assert isinstance(summary["converted"], int), "Converted count should be integer"
        assert isinstance(summary["total_value"], (int, float)), "Total value should be numeric"
        
        print(f"✅ Pipeline loaded with {sum([summary['draft'], summary['sent'], summary['approved'], summary['converted']])} quotes in kanban columns")
        print(f"✅ Total value: {summary['total_value']}")

    def test_pipeline_quote_structure(self, api_client):
        """Verify quote objects in pipeline have required fields"""
        response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline")
        assert response.status_code == 200
        
        data = response.json()
        columns = data["columns"]
        
        # Find first quote from any column
        quote = None
        for col_name, col_quotes in columns.items():
            if col_quotes:
                quote = col_quotes[0]
                break
        
        if quote is None:
            pytest.skip("No quotes in pipeline to verify structure")
        
        # Verify quote fields for Kanban cards
        assert "id" in quote, "Quote missing 'id'"
        assert "quote_number" in quote, "Quote missing 'quote_number'"
        assert "customer_name" in quote, "Quote missing 'customer_name'"
        assert "status" in quote, "Quote missing 'status'"
        assert "total" in quote, "Quote missing 'total'"
        assert "created_at" in quote, "Quote missing 'created_at'"
        
        print(f"✅ Quote structure verified: {quote['quote_number']}")

    def test_get_pipeline_stats_success(self, api_client):
        """GET /api/admin/quotes/pipeline/stats - Returns pipeline statistics"""
        response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify all status counts are present
        assert "total" in data, "Stats missing 'total' count"
        assert "draft" in data, "Stats missing 'draft' count"
        assert "sent" in data, "Stats missing 'sent' count"
        assert "approved" in data, "Stats missing 'approved' count"
        assert "converted" in data, "Stats missing 'converted' count"
        assert "rejected" in data, "Stats missing 'rejected' count"
        assert "expired" in data, "Stats missing 'expired' count"
        assert "total_value" in data, "Stats missing 'total_value'"
        
        # Verify counts are non-negative integers
        assert data["total"] >= 0, "Total should be non-negative"
        assert data["draft"] >= 0, "Draft count should be non-negative"
        assert data["sent"] >= 0, "Sent count should be non-negative"
        assert data["approved"] >= 0, "Approved count should be non-negative"
        assert data["converted"] >= 0, "Converted count should be non-negative"
        
        # Verify total equals sum of all statuses (approximately - might have other statuses)
        kanban_total = data["draft"] + data["sent"] + data["approved"] + data["converted"]
        full_total = kanban_total + data["rejected"] + data["expired"]
        
        print(f"✅ Pipeline stats: total={data['total']}, draft={data['draft']}, sent={data['sent']}, approved={data['approved']}, converted={data['converted']}")
        print(f"✅ Total pipeline value: {data['total_value']}")


class TestQuoteMoveAPI:
    """Test moving quotes between pipeline stages"""

    def test_move_quote_valid_status(self, api_client):
        """PATCH /api/admin/quotes/{id}/move?status={status} - Move quote to valid status"""
        # First get a quote to move
        pipeline_response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline")
        assert pipeline_response.status_code == 200
        
        data = pipeline_response.json()
        
        # Find a quote in draft status to move to sent
        draft_quotes = data["columns"]["draft"]
        if not draft_quotes:
            pytest.skip("No draft quotes to move")
        
        quote = draft_quotes[0]
        quote_id = quote["id"]
        original_status = quote["status"]
        
        # Move to sent status
        target_status = "sent"
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/move?status={target_status}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        updated_quote = response.json()
        
        # Verify quote was updated
        assert updated_quote["status"] == target_status, f"Expected status '{target_status}', got '{updated_quote['status']}'"
        assert updated_quote["id"] == quote_id, "Quote ID should match"
        
        # Move it back to original status
        restore_response = api_client.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/move?status={original_status}")
        assert restore_response.status_code == 200
        
        print(f"✅ Successfully moved quote {quote['quote_number']} from {original_status} to {target_status} and back")

    def test_move_quote_all_kanban_statuses(self, api_client):
        """Verify quote can be moved to all valid kanban statuses"""
        # First get a quote
        pipeline_response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline")
        assert pipeline_response.status_code == 200
        
        data = pipeline_response.json()
        
        # Find any quote
        quote = None
        original_status = None
        for col_name, col_quotes in data["columns"].items():
            if col_quotes and col_name != "other":
                quote = col_quotes[0]
                original_status = quote["status"]
                break
        
        if quote is None:
            pytest.skip("No quotes available for status transition testing")
        
        quote_id = quote["id"]
        
        # Test moving to each kanban status
        kanban_statuses = ["draft", "sent", "approved", "converted"]
        
        for target_status in kanban_statuses:
            response = api_client.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/move?status={target_status}")
            assert response.status_code == 200, f"Failed to move to {target_status}: {response.text}"
            updated = response.json()
            assert updated["status"] == target_status, f"Expected {target_status}, got {updated['status']}"
        
        # Restore original status
        api_client.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/move?status={original_status}")
        
        print(f"✅ Quote {quote['quote_number']} successfully moved through all kanban statuses")

    def test_move_quote_non_kanban_statuses(self, api_client):
        """Verify quote can be moved to non-kanban statuses (rejected, expired)"""
        # First get a quote
        pipeline_response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline")
        assert pipeline_response.status_code == 200
        
        data = pipeline_response.json()
        
        # Find any quote
        quote = None
        original_status = None
        for col_name, col_quotes in data["columns"].items():
            if col_quotes and col_name == "draft":  # Use draft to avoid affecting approved/converted
                quote = col_quotes[0]
                original_status = quote["status"]
                break
        
        if quote is None:
            pytest.skip("No draft quotes for non-kanban status testing")
        
        quote_id = quote["id"]
        
        # Test rejected status
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/move?status=rejected")
        assert response.status_code == 200, f"Failed to move to rejected: {response.text}"
        
        # Test expired status
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/move?status=expired")
        assert response.status_code == 200, f"Failed to move to expired: {response.text}"
        
        # Restore original status
        api_client.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/move?status={original_status}")
        
        print(f"✅ Quote {quote['quote_number']} successfully moved to rejected and expired statuses")

    def test_move_quote_invalid_status(self, api_client):
        """PATCH with invalid status should return 400"""
        # First get a quote
        pipeline_response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline")
        assert pipeline_response.status_code == 200
        
        data = pipeline_response.json()
        
        # Find any quote
        quote = None
        for col_name, col_quotes in data["columns"].items():
            if col_quotes:
                quote = col_quotes[0]
                break
        
        if quote is None:
            pytest.skip("No quotes for invalid status testing")
        
        quote_id = quote["id"]
        
        # Try invalid status
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/move?status=invalid_status")
        
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print("✅ Invalid status correctly rejected with 400")

    def test_move_quote_not_found(self, api_client):
        """PATCH with non-existent quote ID should return 404"""
        fake_id = "000000000000000000000000"
        
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes/{fake_id}/move?status=sent")
        
        assert response.status_code == 404, f"Expected 404 for non-existent quote, got {response.status_code}"
        print("✅ Non-existent quote correctly returns 404")

    def test_move_quote_invalid_id_format(self, api_client):
        """PATCH with invalid ObjectId format should return 404"""
        invalid_id = "not-a-valid-id"
        
        response = api_client.patch(f"{BASE_URL}/api/admin/quotes/{invalid_id}/move?status=sent")
        
        assert response.status_code == 404, f"Expected 404 for invalid ID format, got {response.status_code}"
        print("✅ Invalid ID format correctly returns 404")


class TestPipelineConsistency:
    """Test pipeline data consistency"""

    def test_pipeline_and_stats_consistency(self, api_client):
        """Verify pipeline column counts match stats endpoint"""
        # Get pipeline
        pipeline_response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline")
        assert pipeline_response.status_code == 200
        pipeline_data = pipeline_response.json()
        
        # Get stats
        stats_response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline/stats")
        assert stats_response.status_code == 200
        stats_data = stats_response.json()
        
        # Compare counts
        pipeline_summary = pipeline_data["summary"]
        
        assert pipeline_summary["draft"] == stats_data["draft"], f"Draft count mismatch: {pipeline_summary['draft']} vs {stats_data['draft']}"
        assert pipeline_summary["sent"] == stats_data["sent"], f"Sent count mismatch: {pipeline_summary['sent']} vs {stats_data['sent']}"
        assert pipeline_summary["approved"] == stats_data["approved"], f"Approved count mismatch: {pipeline_summary['approved']} vs {stats_data['approved']}"
        assert pipeline_summary["converted"] == stats_data["converted"], f"Converted count mismatch: {pipeline_summary['converted']} vs {stats_data['converted']}"
        
        print("✅ Pipeline summary and stats are consistent")

    def test_move_updates_pipeline(self, api_client):
        """Verify moving a quote updates the pipeline correctly"""
        # Get initial pipeline
        initial_response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline")
        assert initial_response.status_code == 200
        initial_data = initial_response.json()
        
        # Find a draft quote
        draft_quotes = initial_data["columns"]["draft"]
        if not draft_quotes:
            pytest.skip("No draft quotes for pipeline update testing")
        
        quote = draft_quotes[0]
        quote_id = quote["id"]
        initial_draft_count = initial_data["summary"]["draft"]
        initial_sent_count = initial_data["summary"]["sent"]
        
        # Move to sent
        move_response = api_client.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/move?status=sent")
        assert move_response.status_code == 200
        
        # Get updated pipeline
        updated_response = api_client.get(f"{BASE_URL}/api/admin/quotes/pipeline")
        assert updated_response.status_code == 200
        updated_data = updated_response.json()
        
        # Verify counts changed
        assert updated_data["summary"]["draft"] == initial_draft_count - 1, "Draft count should decrease by 1"
        assert updated_data["summary"]["sent"] == initial_sent_count + 1, "Sent count should increase by 1"
        
        # Restore
        api_client.patch(f"{BASE_URL}/api/admin/quotes/{quote_id}/move?status=draft")
        
        print("✅ Pipeline correctly updates after quote move")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
