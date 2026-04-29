## Optional Emergent integrations

This backend can run outside Emergent (e.g. Render) without the `emergentintegrations` package.

- Core API startup does **not** require `emergentintegrations`.
- Features that depend on Emergent AI/Stripe wrappers return graceful `503` responses when the package is unavailable.

### Affected optional features
- AI chat/image generation endpoints
- AI smart bulk import parsing
- Stripe checkout/webhook helper routes that rely on Emergent wrappers

If deploying on Emergent, install/configure the Emergent integration package and related keys to enable these features.
