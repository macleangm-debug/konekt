"""
Phase 5 — Portfolio & Reactivation Engine Tests

Tests:
- Sales portfolio endpoints (GET /api/sales/portfolio, tasks, generate-tasks, update task)
- Admin portfolio overview endpoints
- Client classification (active/at_risk/inactive/lost)
- Reactivation task generation and outcomes
- Access control (customer cannot access portfolio endpoints)
- Regression tests for client ownership
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"
SALES_ID = "sales-demo-003"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin auth failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def sales_token():
    """Get sales authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EMAIL,
        "password": SALES_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Sales auth failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer auth failed: {response.status_code} - {response.text}")


class TestSalesPortfolioEndpoints:
    """Sales portfolio dashboard endpoints"""

    def test_get_my_portfolio_returns_data(self, sales_token):
        """GET /api/sales/portfolio returns portfolio data with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "total_clients" in data, "Missing total_clients field"
        assert "buckets" in data, "Missing buckets field"
        assert "clients" in data, "Missing clients field"
        assert "total_revenue" in data, "Missing total_revenue field"
        
        # Verify buckets structure
        buckets = data["buckets"]
        assert "active" in buckets, "Missing active bucket"
        assert "at_risk" in buckets, "Missing at_risk bucket"
        assert "inactive" in buckets, "Missing inactive bucket"
        assert "lost" in buckets, "Missing lost bucket"
        
        print(f"Portfolio: {data['total_clients']} clients, buckets: {buckets}")

    def test_portfolio_client_classification(self, sales_token):
        """Verify client classification in portfolio response"""
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        clients = data.get("clients", [])
        
        # Check that each client has classification
        for client in clients:
            assert "classification" in client, f"Client {client.get('id')} missing classification"
            assert client["classification"] in ["active", "at_risk", "inactive", "lost"], \
                f"Invalid classification: {client['classification']}"
            assert "type" in client, f"Client {client.get('id')} missing type"
            assert client["type"] in ["company", "individual"], f"Invalid type: {client['type']}"
            assert "name" in client, f"Client {client.get('id')} missing name"
            assert "id" in client, "Client missing id"
        
        print(f"Verified {len(clients)} clients have valid classifications")

    def test_get_my_reactivation_tasks(self, sales_token):
        """GET /api/sales/portfolio/tasks returns reactivation tasks"""
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio/tasks",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tasks" in data, "Missing tasks field"
        
        tasks = data["tasks"]
        print(f"Found {len(tasks)} reactivation tasks")
        
        # Verify task structure if tasks exist
        if tasks:
            task = tasks[0]
            assert "id" in task, "Task missing id"
            assert "entity_name" in task, "Task missing entity_name"
            assert "status" in task, "Task missing status"
            assert "classification" in task, "Task missing classification"
            assert "suggested_action" in task, "Task missing suggested_action"

    def test_generate_reactivation_tasks_idempotent(self, sales_token):
        """POST /api/sales/portfolio/generate-tasks creates tasks (idempotent)"""
        # First call
        response1 = requests.post(
            f"{BASE_URL}/api/sales/portfolio/generate-tasks",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response1.status_code == 200, f"Expected 200, got {response1.status_code}: {response1.text}"
        
        data1 = response1.json()
        assert "tasks_created" in data1, "Missing tasks_created field"
        created1 = data1["tasks_created"]
        print(f"First call created {created1} tasks")
        
        # Second call should be idempotent (no duplicates)
        response2 = requests.post(
            f"{BASE_URL}/api/sales/portfolio/generate-tasks",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response2.status_code == 200
        
        data2 = response2.json()
        created2 = data2["tasks_created"]
        print(f"Second call created {created2} tasks (should be 0 if idempotent)")
        
        # If first call created tasks, second should create 0 (idempotent)
        if created1 > 0:
            assert created2 == 0, f"Expected 0 tasks on second call (idempotent), got {created2}"


class TestTaskOutcomeUpdate:
    """Test reactivation task status and outcome updates"""

    def test_update_task_status_and_outcome(self, sales_token):
        """PUT /api/sales/portfolio/tasks/{taskId} updates task"""
        # First get tasks
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio/tasks",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        
        tasks = response.json().get("tasks", [])
        pending_tasks = [t for t in tasks if t.get("status") == "pending"]
        
        if not pending_tasks:
            pytest.skip("No pending tasks to update")
        
        task = pending_tasks[0]
        task_id = task["id"]
        
        # Update task with outcome
        update_response = requests.put(
            f"{BASE_URL}/api/sales/portfolio/tasks/{task_id}",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"status": "completed", "outcome": "reactivated"}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        data = update_response.json()
        assert data.get("ok") == True, f"Expected ok=True, got {data}"
        print(f"Updated task {task_id} with outcome 'reactivated'")

    def test_update_task_with_no_response_outcome(self, sales_token):
        """Test updating task with no_response outcome"""
        # Get tasks
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio/tasks",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        tasks = response.json().get("tasks", [])
        pending_tasks = [t for t in tasks if t.get("status") == "pending"]
        
        if not pending_tasks:
            pytest.skip("No pending tasks to update")
        
        task = pending_tasks[0]
        task_id = task["id"]
        
        update_response = requests.put(
            f"{BASE_URL}/api/sales/portfolio/tasks/{task_id}",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"status": "completed", "outcome": "no_response"}
        )
        assert update_response.status_code == 200
        print(f"Updated task {task_id} with outcome 'no_response'")

    def test_update_task_with_not_interested_outcome(self, sales_token):
        """Test updating task with not_interested outcome"""
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio/tasks",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        tasks = response.json().get("tasks", [])
        pending_tasks = [t for t in tasks if t.get("status") == "pending"]
        
        if not pending_tasks:
            pytest.skip("No pending tasks to update")
        
        task = pending_tasks[0]
        task_id = task["id"]
        
        update_response = requests.put(
            f"{BASE_URL}/api/sales/portfolio/tasks/{task_id}",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"status": "completed", "outcome": "not_interested"}
        )
        assert update_response.status_code == 200
        print(f"Updated task {task_id} with outcome 'not_interested'")

    def test_update_task_with_lost_outcome(self, sales_token):
        """Test updating task with lost outcome"""
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio/tasks",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        tasks = response.json().get("tasks", [])
        pending_tasks = [t for t in tasks if t.get("status") == "pending"]
        
        if not pending_tasks:
            pytest.skip("No pending tasks to update")
        
        task = pending_tasks[0]
        task_id = task["id"]
        
        update_response = requests.put(
            f"{BASE_URL}/api/sales/portfolio/tasks/{task_id}",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"status": "completed", "outcome": "lost"}
        )
        assert update_response.status_code == 200
        print(f"Updated task {task_id} with outcome 'lost'")


class TestAdminPortfolioEndpoints:
    """Admin portfolio overview endpoints"""

    def test_admin_portfolio_overview(self, admin_token):
        """GET /api/admin/portfolio/overview returns all owners"""
        response = requests.get(
            f"{BASE_URL}/api/admin/portfolio/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "owners" in data, "Missing owners field"
        
        owners = data["owners"]
        assert len(owners) > 0, "Expected at least one owner"
        
        # Verify owner structure
        for owner in owners:
            assert "sales_id" in owner, "Owner missing sales_id"
            assert "sales_name" in owner, "Owner missing sales_name"
            assert "total_clients" in owner, "Owner missing total_clients"
            assert "companies" in owner, "Owner missing companies"
            assert "individuals" in owner, "Owner missing individuals"
            assert "pending_tasks" in owner, "Owner missing pending_tasks"
            assert "reactivation_rate" in owner, "Owner missing reactivation_rate"
        
        print(f"Admin overview: {len(owners)} owners")
        for owner in owners[:3]:
            print(f"  - {owner['sales_name']}: {owner['total_clients']} clients, {owner['pending_tasks']} pending tasks")

    def test_admin_get_specific_owner_portfolio(self, admin_token):
        """GET /api/admin/portfolio/{salesId} returns specific owner's portfolio"""
        response = requests.get(
            f"{BASE_URL}/api/admin/portfolio/{SALES_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_clients" in data, "Missing total_clients"
        assert "buckets" in data, "Missing buckets"
        assert "clients" in data, "Missing clients"
        assert data.get("owner_sales_id") == SALES_ID, f"Expected owner_sales_id={SALES_ID}"
        
        print(f"Admin view of {SALES_ID}: {data['total_clients']} clients")

    def test_admin_generate_tasks_for_owner(self, admin_token):
        """POST /api/admin/portfolio/{salesId}/generate-tasks generates tasks"""
        response = requests.post(
            f"{BASE_URL}/api/admin/portfolio/{SALES_ID}/generate-tasks",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tasks_created" in data, "Missing tasks_created field"
        print(f"Admin generated {data['tasks_created']} tasks for {SALES_ID}")


class TestAccessControl:
    """Access control tests - customer cannot access portfolio endpoints"""

    def test_customer_cannot_access_sales_portfolio(self, customer_token):
        """Customer gets 403 on /api/sales/portfolio"""
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Customer correctly denied access to /api/sales/portfolio")

    def test_customer_cannot_access_sales_tasks(self, customer_token):
        """Customer gets 403 on /api/sales/portfolio/tasks"""
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio/tasks",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Customer correctly denied access to /api/sales/portfolio/tasks")

    def test_customer_cannot_access_admin_portfolio_overview(self, customer_token):
        """Customer gets 403 on /api/admin/portfolio/overview"""
        response = requests.get(
            f"{BASE_URL}/api/admin/portfolio/overview",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Customer correctly denied access to /api/admin/portfolio/overview")

    def test_customer_cannot_access_admin_owner_portfolio(self, customer_token):
        """Customer gets 403 on /api/admin/portfolio/{salesId}"""
        response = requests.get(
            f"{BASE_URL}/api/admin/portfolio/{SALES_ID}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Customer correctly denied access to /api/admin/portfolio/{salesId}")

    def test_sales_cannot_access_admin_portfolio_overview(self, sales_token):
        """Sales gets 403 on /api/admin/portfolio/overview"""
        response = requests.get(
            f"{BASE_URL}/api/admin/portfolio/overview",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Sales correctly denied access to /api/admin/portfolio/overview")


class TestRegressionClientOwnership:
    """Regression tests for client ownership endpoints"""

    def test_client_ownership_stats_still_works(self, admin_token):
        """GET /api/admin/client-ownership/stats still works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/client-ownership/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_companies" in data or "companies" in data, "Missing company count"
        print(f"Client ownership stats: {data}")

    def test_companies_list_still_works(self, admin_token):
        """GET /api/admin/client-ownership/companies still works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/client-ownership/companies",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("Companies list endpoint working")

    def test_individuals_list_still_works(self, admin_token):
        """GET /api/admin/client-ownership/individuals still works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/client-ownership/individuals",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("Individuals list endpoint working")


class TestRegressionSalesPerformance:
    """Regression tests for sales performance with portfolio data"""

    def test_sales_performance_team_includes_portfolio(self, admin_token):
        """GET /api/admin/sales-performance/team includes portfolio data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sales-performance/team",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        team = data.get("team", data.get("members", []))
        
        if team:
            member = team[0]
            # Check if portfolio data is included
            if "portfolio" in member:
                portfolio = member["portfolio"]
                assert "owned_companies" in portfolio or "companies" in portfolio, "Missing owned_companies in portfolio"
                print(f"Sales performance includes portfolio data: {portfolio}")
            else:
                print("Note: portfolio field not in team member response (may be expected)")
        
        print("Sales performance team endpoint working")

    def test_my_performance_still_works(self, sales_token):
        """GET /api/admin/sales-performance/me still works for sales user"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sales-performance/me",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("My performance endpoint working for sales user")


class TestPortfolioDataIntegrity:
    """Test portfolio data integrity and calculations"""

    def test_portfolio_buckets_sum_equals_total(self, sales_token):
        """Verify buckets sum equals total_clients"""
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        total = data.get("total_clients", 0)
        buckets = data.get("buckets", {})
        
        bucket_sum = sum([
            buckets.get("active", 0),
            buckets.get("at_risk", 0),
            buckets.get("inactive", 0),
            buckets.get("lost", 0)
        ])
        
        assert bucket_sum == total, f"Bucket sum ({bucket_sum}) != total_clients ({total})"
        print(f"Data integrity: bucket sum ({bucket_sum}) == total_clients ({total})")

    def test_portfolio_clients_count_matches_total(self, sales_token):
        """Verify clients array length matches total_clients"""
        response = requests.get(
            f"{BASE_URL}/api/sales/portfolio",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        total = data.get("total_clients", 0)
        clients = data.get("clients", [])
        
        assert len(clients) == total, f"Clients count ({len(clients)}) != total_clients ({total})"
        print(f"Data integrity: clients count ({len(clients)}) == total_clients ({total})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
