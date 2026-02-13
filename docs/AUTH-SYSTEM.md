# Authentication & Authorization System

## Overview

The Marianas Open platform uses **Clerk** for authentication and a **whitelist/invite-only** model for admin access. Public pages are unauthenticated. Admin pages require Clerk sign-in + a matching user record in our database.

## Architecture

```
┌─────────────┐     ┌───────────┐     ┌──────────────┐
│  React App  │────▶│   Clerk   │────▶│  Rails API   │
│  (Frontend) │     │  (Auth)   │     │  (Backend)   │
└─────────────┘     └───────────┘     └──────────────┘
       │                  │                   │
       │  1. User signs   │  2. Clerk issues  │  3. API verifies
       │     in via Clerk │     JWT token     │     JWT via JWKS
       │                  │                   │
       │                  │                   │  4. Looks up user
       │                  │                   │     by clerk_id
       │                  │                   │
       │                  │                   │  5. Checks role
       │                  │                   │     (admin/staff/viewer)
```

## Roles (RBAC)

| Role | Access Level | Description |
|------|-------------|-------------|
| `admin` | Full access | CRUD all resources, manage users, import data |
| `staff` | Limited admin | Access admin panel, manage content (no user management) |
| `viewer` | Read-only admin | View admin dashboard and data |

Role is stored in the `users.role` column (default: `viewer`).

## Whitelist / Invite-Only Model

**Users are NOT auto-created.** This is a deliberate security choice.

### How it works:

1. **First admin** is created via `db/seeds.rb` using the `SEED_ADMIN_EMAIL` env var
2. **Admin invites users** via the Users Admin page (`/admin/users`)
   - Creates a `User` record with email + role + placeholder `clerk_id` (`pending_<uuid>`)
3. **Invited user signs up** via Clerk (on the `/admin` login page)
4. **First sign-in**: `ClerkAuthenticatable` matches by email, links their real Clerk ID
5. **Subsequent sign-ins**: Matched by `clerk_id` directly

### What happens to uninvited users:

If someone signs up via Clerk but has no matching `User` record → they get:
```json
{ "error": "User not found. Contact an administrator for access." }
```
Status: `401 Unauthorized`

## Backend Implementation

### `ClerkAuthenticatable` Concern (`app/controllers/concerns/clerk_authenticatable.rb`)

Included in admin controllers. Key methods:

- `authenticate_user!` — Extracts JWT from `Authorization: Bearer <token>`, verifies via JWKS, finds/creates user
- `require_admin!` — Calls `authenticate_user!` + checks `user.admin?`
- `require_staff!` — Calls `authenticate_user!` + checks `user.staff?`
- `find_or_create_user` — Matches by `clerk_id` first, then by email (for first-time invited users). Returns `nil` for unknown users.

### `ClerkAuth` Service (`app/services/clerk_auth.rb`)

- Verifies JWTs using Clerk's JWKS endpoint
- Caches JWKS keys in memory (refreshes on cache miss)
- Uses the `jwt` and `httparty` gems

### User Model (`app/models/user.rb`)

```ruby
ROLES = %w[admin staff viewer].freeze

validates :clerk_id, presence: true, uniqueness: true
validates :email, presence: true, uniqueness: { case_sensitive: false }
validates :role, inclusion: { in: ROLES }
```

## Frontend Implementation

### Clerk Provider (`web/src/components/auth/ClerkProtectedContent.tsx`)

- Wraps admin routes in `<ClerkProvider>`
- Only loads Clerk on admin pages (not public pages — saves bundle size)
- Uses `VITE_CLERK_PUBLISHABLE_KEY` env var

### Admin Layout (`web/src/layouts/AdminLayout.tsx`)

- Checks Clerk `isSignedIn` state
- Shows sign-in prompt if not authenticated
- Sidebar navigation to all admin pages

### API Service Auth (`web/src/services/api.ts`)

- `getAuthHeaders()` — Gets Clerk session token via `clerk.session.getToken()`
- All admin API calls include `Authorization: Bearer <token>` header

## User Management

### Admin Users Page (`/admin/users`)

Admins can:
- **Invite users** — Enter email + role, creates whitelist entry
- **Edit roles** — Change user's role (admin/staff/viewer)
- **Delete users** — Remove access (with safeguards)

### Safety Guards

- **Self-delete prevention** — Admins cannot delete themselves
- **Last-admin lockout prevention** — Cannot delete the last admin user
- **Role validation** — Only valid roles accepted

## Environment Variables

### Backend (Rails)
| Variable | Purpose |
|----------|---------|
| `CLERK_SECRET_KEY` | Clerk backend API key (for server-side verification) |
| `CLERK_JWKS_URL` | JWKS endpoint for JWT verification |
| `SEED_ADMIN_EMAIL` | Email for the initial admin user (used in seeds) |

### Frontend (Vite)
| Variable | Purpose |
|----------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend key (for sign-in UI) |

## Setup for New Environments

1. Create a Clerk application at https://clerk.com
2. Set `CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, and `VITE_CLERK_PUBLISHABLE_KEY`
3. Set `SEED_ADMIN_EMAIL` to the first admin's email
4. Run `rails db:seed` to create the admin user
5. Admin signs in via Clerk → system links their Clerk ID
6. Admin invites additional users via `/admin/users`

## Security Notes

- JWTs are verified server-side using JWKS (asymmetric keys)
- No secrets stored in frontend
- Admin routes are protected at both frontend (Clerk) and backend (JWT + role check) levels
- Whitelist model prevents unauthorized access even if someone creates a Clerk account
