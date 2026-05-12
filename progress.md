# Admin Auth Refactor - In Progress

## Goal
Stabilize admin auth flow: fix `node:crypto` Edge Runtime incompatibility, enforce role-based permissions with 403 forbidden page, seed OWNER admin account, and verify end-to-end login/logout.

## Constraints & Preferences
- Passwords hashed with bcrypt; sessions use HTTP-only cookies with HMAC-signed tokens.
- Role-based permissions enforced on UI and all backend API routes.
- Login UI: dark theme, clean errors, no email existence leakage.
- Bootstrap first OWNER via env vars; seed script is idempotent.
- All `/api/admin` routes enforce server-side auth — no frontend-only guards.
- Do NOT add forgot password or new features until refactor is stable.

## Key Decisions
- Session tokens = HMAC-signed JSON in `admin_session` cookie. Middleware & server components extract role without DB calls.
- `requireAdminAuth` / `requireCurrentAdminAuth` return `{ session }` on success. Callers check `'status' in auth`.
- `PERMISSION_ROLES` + `PAGE_PERMISSIONS` in `authPermissions.ts` is single source of truth.
- `AdminSession` DB records store revocation tokens; cookie is primary auth.
- `crypto.subtle` (Web Crypto API) for all HMAC ops — works in Edge Runtime (middleware) and Node.js (API routes/server components).
- `ADMIN_SESSION_SECRET` env var is mandatory; signing throws if missing.
- Logged-in users without sufficient role → redirect to `/admin/forbidden`. Unauthenticated → redirect to `/admin/login` by middleware.

## Key Context
- `node:crypto` Edge Runtime warning resolved by switching to `crypto.subtle`.
- All auth helpers (`verifySessionToken`, `signSessionToken`, `parseAdminSession`, `isAdminAuthenticated`, `requireAdminAuth`) are now async.
- `ADMIN_SESSION_SECRET` must be in `.env` or app throws on sign/verify.
- `/admin/forbidden` page is static (prerendered) for any logged-in user lacking page permission.

## Auth Flow
1. User POSTs to `/api/admin/auth/login` with email/username + password.
2. Server verifies credentials via bcrypt (`verifyAdminCredentials`), creates session in DB (`createAdminSession`).
3. Signs JWT-like payload with `signSessionToken` (HMAC-SHA256 via Web Crypto).
4. Sets `admin_session` cookie (HTTP-only, secure in prod).
5. Middleware intercepts `/admin/*` routes, calls `isAdminAuthenticated` → `verifySessionToken` → decodes role.
6. Server pages check `canAccessPage(role, pageKey)` → redirect to `/admin/forbidden` if denied.
7. POST `/api/admin/auth/logout` revokes session cookie and DB record.

## Relevant Files
- `web/src/lib/sessionToken.ts`: Web Crypto HMAC sign/verify (Edge-compatible)
- `web/src/lib/adminAuth.ts`: Cookie parsing, async `requireAdminAuth` / `requireCurrentAdminAuth`
- `web/src/lib/authPermissions.ts`: `PERMISSION_ROLES`, `PAGE_PERMISSIONS`, `hasPermission`, `canAccessPage`
- `web/src/lib/adminAuthPrisma.ts`: `verifyAdminCredentials`, `createAdminSession`
- `web/src/lib/auditLog.ts`: `writeAuditLog`, `auditFromRequest`
- `web/src/lib/password.ts`: bcrypt hash/verify helpers
- `web/src/app/api/admin/auth/login/route.ts`: Login endpoint, session creation, audit logging
- `web/src/app/api/admin/auth/logout/route.ts`: Logout endpoint, session revocation
- `web/src/app/api/admin/auth/me/route.ts`: Current user endpoint
- `web/src/components/admin/DashboardHeader.tsx`: Role-filtered nav via `canAccessPage`
- `web/src/components/admin/AdminLayout.tsx`: `AdminPageFrame` forwards `adminRole` to header
- `web/src/app/admin/forbidden/page.tsx`: 403 forbidden page (dark theme)
- `web/src/app/admin/login/AdminLogin.tsx`: Login form component
- `web/src/app/admin/*/page.tsx`: All server pages pass `session?.role`, redirect to `/admin/forbidden` on insufficient permission
- `web/middleware.ts`: Async Edge auth guard (no crypto warning)
- `web/scripts/seed-admin.ts`: Idempotent OWNER bootstrap (reads from env)
- `web/.env`: Contains `ADMIN_SESSION_SECRET` + OWNER credentials (`ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_NAME`, `ADMIN_PASSWORD`)
- `web/prisma/schema.prisma`: AdminUser, AdminSession, AuditLog models + AdminRole enum
