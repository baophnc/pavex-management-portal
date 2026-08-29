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

- Identity
- Partners / Merchant administration
- Network
- Pricing

Shipment administration is added after the backend exposes the corresponding
admin query contract.
