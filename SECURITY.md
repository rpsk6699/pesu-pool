# Security Policy

## Supported Versions

Currently, only the latest version of the Pesu Pool application on the `main` branch is actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| Older   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please do not open a public issue. Instead, please reach out privately via email or LinkedIn direct message so the issue can be patched before it is disclosed.

All security vulnerabilities will be promptly addressed.

## Security Audit History

**August 2026 - Comprehensive P0-P2 Security Remediation**
A full codebase security audit was conducted, resulting in the patch of several critical and high-severity vulnerabilities. Key remediations include:

* **Authentication & Authorization:** Patched Insecure Direct Object Reference (IDOR) vulnerabilities across server actions. Implemented strict session validation and database-level ownership checks for pool creation, modification, and deletion.
* **Real-Time Data Privacy:** Secured Pusher WebSocket connections by migrating to private channels with a dedicated server-side authentication endpoint (`/api/pusher/auth`).
* **Location Spoofing & Geofencing:** Moved Haversine distance calculations server-side to enforce a strict 2km geofence around the PESU campus, rejecting manipulated client payloads.
* **Race Conditions:** Resolved double-booking business logic flaws in the `joinPool` flow by implementing atomic database transactions via Prisma.
* **PII Protection:** Scoped React Server Component (RSC) Prisma queries to strictly exclude sensitive user data (like emails) from client-side payloads.
* **Infrastructure Security:** Implemented Next.js global middleware for protected routes, pinned Azure AD OAuth to a single-tenant configuration, and enforced strict Content-Security-Policy (CSP) headers.