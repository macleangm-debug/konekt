def build_service_phase_plan(total_amount: float, advance_percent: float = 50.0):
    advance = round(total_amount * (advance_percent / 100.0), 2)
    final = round(total_amount - advance, 2)
    return {
        "advance_due": advance,
        "final_due": final,
        "phases": [
            {"code": "advance", "label": "Advance Payment", "amount": advance},
            {"code": "final", "label": "Final Payment", "amount": final},
        ]
    }

def can_release_service_vendor(amount_paid: float, total_amount: float, advance_percent: float = 50.0,
                               admin_override: bool = False) -> bool:
    if admin_override:
        return True
    required = total_amount * (advance_percent / 100.0)
    return amount_paid >= required
