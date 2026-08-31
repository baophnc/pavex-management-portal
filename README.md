# Pavex Management Portal

Next.js 16 management console for Pavex operators and administrators.

The browser never receives the backend refresh token directly. The portal uses
same-origin Route Handlers as a BFF, stores access/refresh tokens in HttpOnly
cookies, and forwards authenticated requests to the Kotlin API Gateway.

## Requirements

- Node.js 20.9+
- pnpm 11+
- Pavex API Gateway reachable from the management web process

## Environment

Set the API Gateway base URL before starting the portal:

```bash
API_BASE_URL=http://localhost:8080
```

When the management portal itself runs in Docker while the backend runs on the
host, use the host address appropriate for the environment, for example:

```bash
API_BASE_URL=http://host.docker.internal:8080
```

## Development

```bash
corepack enable
pnpm install
pnpm dev
```

Quality gates:

```bash
pnpm check
pnpm build
```

## Authentication and authorization

Management login calls `/api/v1/auth/login`, loads `/api/v1/auth/me`, and only
creates a browser session when the account has at least one management
permission. Customer/Merchant-only accounts are rejected by the Management BFF.

The browser calls backend APIs through:

```text
/api/backend/*
```

The BFF automatically:

- attaches the access token;
- refreshes an expired or missing access token from the HttpOnly refresh cookie;
- coalesces concurrent refresh attempts inside one web process to avoid refresh-token rotation races;
- retries the original backend request once after a successful refresh;
- clears the local session only when authentication is actually invalid;
- preserves useful backend response headers such as `Retry-After`, `ETag` and request/trace IDs.

Navigation is permission-driven. Backend authorization remains the source of
truth; hiding a menu or button is only a UX guard, never the security boundary.

## Current management modules

- Identity (users plus custom-role management)
- Partners / Merchant administration
- Network
- Pricing
- Shipment administration
- Operations access foundation

Shipment administration uses the dedicated admin query contract and never reuses
merchant-owned shipment endpoints.

## Identity role management

The role workspace reads the backend-owned permission catalog from `GET /api/v1/permissions`.
Permissions are capabilities, not frontend-managed records: Management does not create, edit or
delete permission codes. Users with `identity.roles.manage` can create custom roles, edit their
name/description, replace their permission matrix, and delete an unused custom role. System roles
remain immutable.

## Network and Pricing operator tools

Network screens use the Kotlin admin contracts under `/api/v1/admin/network/**` for
regions, hubs, service areas, coverage, lanes/schedules, route templates, route
planning, capacity reservations and audit. Read-only users can inspect the network;
mutating actions are only rendered for `network.manage`.

Pricing screens use `/api/v1/admin/pricing/**` for rate-plan lifecycle, audit and
quote inspection. The simulator still calls the real public Quote Engine, while the
quote inspector reads the immutable admin snapshot so support can verify the exact
rate revision, location resolution, parcel weights and fee breakdown used by a quote.
Mutating rate-plan actions require `pricing.manage`.

## Shipment operator tools

Shipment screens use `GET /api/v1/admin/shipments` and
`GET /api/v1/admin/shipments/{trackingCode}` guarded by `shipments.admin.read`.
The list supports status/lifecycle/Merchant/search filters with cursor pagination
and an exact `totalCount` for dashboard metrics. The detail workspace exposes the
customer snapshot together with internal ownership/routing identifiers, the complete
event stream, and delivery-attempt/POD records for support and operations.

Shipment detail remains read-only in this frontend checkpoint. The backend now exposes
explicit exception, case and Control Tower contracts; later Management patches wire those
operator actions without changing the BFF authorization model.
