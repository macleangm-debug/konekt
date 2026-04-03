# Suggested distribution logic

# Example safe starter defaults:
# protected_company_margin_percent = 8
# affiliate_percent_of_distributable = 10
# sales_percent_of_distributable = 15
# promo_percent_of_distributable = 10
# referral_percent_of_distributable = 5
# country_bonus_percent_of_distributable = 5
#
# Remaining distributable margin is retained by company.
#
# Distinguish:
# 1. Non-margin-touching promo:
#    - display/uplift style promo
#    - does not reduce company protected margin
#
# 2. Margin-touching promo:
#    - consumes the promo slice from distributable margin
#
# Suggested ownership tags on an order:
# - source_type: website | affiliate | sales | hybrid
# - affiliate_user_id
# - assigned_sales_id
# - referral_user_id
# - country_code
#
# Suggested downstream usage:
# - affiliate settlement
# - sales commission statement
# - margin audit trail
# - country bonus tracking
