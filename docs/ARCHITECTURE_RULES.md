# Import Flow – Non-Negotiable Rules

## Navigation
- Only layout-router can navigate.
- Apply functions MUST NEVER navigate.

## Payload
- Payload is consumed once.
- Apply is idempotent (one apply per payloadId).

## Order
navigate(act) -> mount -> requestAnimationFrame -> apply

## Storage
- consumePendingPayload runs only in layout-router.

## Forbidden
- No auto-navigate inside apply.
- No heuristic routing during apply.
