def can_release_to_vendor(payment_mode: str, release_rule: str, amount_paid: float, total_amount: float,
                          advance_percent: float = 0.0, credit_approved: bool = False,
                          manual_release: bool = False) -> bool:
    if manual_release:
        return True
    if release_rule == "after_credit_approval":
        return credit_approved
    if release_rule == "after_full_payment":
        return amount_paid >= total_amount
    if release_rule == "after_advance_payment":
        required = total_amount * (advance_percent / 100.0)
        return amount_paid >= required
    if release_rule == "manual_admin_release":
        return False
    return False
