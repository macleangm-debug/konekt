# Admin-side service partner mapping notes

# Requirement:
# Admin should be able to map one or more partners to one or more services.
# A partner may perform multiple services well.

# Suggested model:
# collection: partner_service_capabilities
# fields:
# - partner_id
# - service_key
# - country_code
# - regions
# - capability_status: active | inactive | probation
# - quality_score
# - avg_turnaround_days
# - success_rate
# - notes
# - created_at
# - updated_at

# Suggested admin actions:
# - assign partner to service
# - remove partner from service
# - set priority partner per service/country
# - track partner performance per service
# - allow multiple partners for the same service

# Suggested routing logic:
# route by:
# 1. country / region coverage
# 2. capability active
# 3. quality_score
# 4. current queue / load
# 5. service-specific success rate
