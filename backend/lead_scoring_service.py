"""
Lead Scoring Service
Compute lead score based on qualification criteria
"""


def compute_lead_score(lead: dict) -> int:
    """Compute a lead score from 0-100 based on qualification criteria"""
    score = 0

    budget = str(lead.get("budget_range") or "").lower()
    urgency = str(lead.get("urgency") or "").lower()
    company_size = str(lead.get("company_size") or "").lower()
    source = str(lead.get("source") or "").lower()

    # Budget scoring (up to 25 points)
    if "high" in budget or "500" in budget or "1000000" in budget:
        score += 25
    elif budget:
        score += 10

    # Urgency scoring (up to 25 points)
    if urgency in {"high", "urgent", "immediate"}:
        score += 25
    elif urgency:
        score += 10

    # Company size scoring (up to 20 points)
    if company_size in {"enterprise", "large", "medium"}:
        score += 20

    # Source quality scoring (up to 15 points)
    if source in {"referral", "affiliate", "returning_customer"}:
        score += 15

    # Decision maker identified (10 points)
    if lead.get("decision_maker_name"):
        score += 10

    # Expected close date provided (5 points)
    if lead.get("expected_close_date"):
        score += 5

    return min(score, 100)
