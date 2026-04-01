"""
Assignment Scoring Service — Weighted scoring for sales and vendor assignment.
Preserves manual override with full audit trail.
"""
from datetime import datetime, timezone


def score_sales_rep(rep: dict) -> float:
    """Score a sales rep candidate. Higher = better fit."""
    return round(
        rep.get("availability_score", 0) * 0.4
        + rep.get("workload_score", 0) * 0.2
        + rep.get("response_speed_score", 0) * 0.2
        + rep.get("customer_fit_score", 0) * 0.2,
        3,
    )


def score_vendor(candidate: dict) -> float:
    """Score a vendor candidate. Higher = better fit."""
    return round(
        candidate.get("capability_match", 0) * 0.5
        + candidate.get("availability_score", 0) * 0.3
        + candidate.get("turnaround_score", 0) * 0.1
        + candidate.get("workload_score", 0) * 0.1,
        3,
    )


def rank_candidates(candidates: list, scorer) -> list:
    """Rank candidates by score, highest first."""
    scored = [
        {**c, "_score": scorer(c)}
        for c in candidates
    ]
    return sorted(scored, key=lambda c: c["_score"], reverse=True)


def choose_best(candidates: list, scorer):
    """Pick the top candidate from a scored list."""
    ranked = rank_candidates(candidates, scorer)
    return ranked[0] if ranked else None


async def log_assignment_decision(db, *, entity_type: str, entity_id: str,
                                   candidates: list, selected_id: str,
                                   selected_score: float, override_by: str = None,
                                   override_reason: str = None):
    """
    Persist assignment decision with full audit trail.
    Logs candidate list, scores, selected winner, and any manual override.
    """
    doc = {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "candidates": [
            {
                "id": c.get("id") or c.get("_id") or c.get("user_id"),
                "name": c.get("name") or c.get("business_name"),
                "score": c.get("_score", 0),
            }
            for c in candidates
        ],
        "selected_id": selected_id,
        "selected_score": selected_score,
        "was_overridden": override_by is not None,
        "override_by": override_by,
        "override_reason": override_reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.assignment_audit_log.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}
