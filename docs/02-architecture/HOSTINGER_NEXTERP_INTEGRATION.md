---
type: runbook
status: verified
last_reviewed: 2026-08-13
---

# Hostinger NextERP Integration Runbook

## Target and access

The verified target is Hostinger VPS `1871758`, hostname `srv1871758.hstgr.cloud`, public IPv4 `187.77.144.226`, SSH user `root`, port `22`. A dedicated ED25519 public key named `vipclub-nexterp-hostinger-2026-08-13` is registered in hPanel. Its private key remains only in the local SSH directory and must never be committed or copied into the application.

The verified SSH ED25519 host fingerprint is:

```text
SHA256:XFhJmOfkWPf4dtX0Dh2mLEFC3vYgy8Bm5dzNnL6rnqk
```

Always keep strict host-key verification enabled. Do not replace existing authorized keys or host keys during application deployment.

## Deployment layout

| Path/project | Purpose |
| --- | --- |
| `/opt/nomad-vip/frappe_docker` / Compose project `nomad` | Frappe, ERPNext, HRMS, MariaDB, Redis, scheduler and workers |
| `/opt/nomad-vip/apps/nomad_vip` | Bind-mounted custom Frappe app source |
| `/opt/nomad-vip/frontend` / project `nomad-entertainer` | Staff PWA served at `/staff/` |
| `/opt/nomad-vip/staging/manager-ui-final-20260813` / container `nomad-manager-web` | Role-aware management PWA served at `/manager/` |
| `/opt/vipclub-registration` / project `vipclub` | Public Nginx TLS/reverse proxy and `/vip-entry/` app |
| Frappe volume site `nomad.local` | Production site |
| Frappe volume site `bat116-test.local` | Test site; scheduler intentionally disabled |

## Safe change sequence

1. Preserve a repository-controlled copy of the exact `nomad_vip` source and record a checksum/version before editing.
2. Run a new Frappe site backup and confirm the backup file exists and is non-empty.
3. Implement DocType/API changes in source control. Do not edit database tables directly.
4. Install/migrate and test on `bat116-test.local`, including role/branch negative tests and API contract tests.
5. Build the PWA with no embedded API token or production secret. Prefer same-origin Frappe session authentication.
6. Deploy the tested app source and PWA assets, migrate `nomad.local`, then restart only the affected services.
7. Verify health, scheduler/workers, authenticated Branch Manager scope, CEO scope, read APIs, one idempotent test mutation where approved, and audit records.
8. Retain the pre-change source/database backup and document rollback commands and release checksum.

## Live API boundary

The public Frappe API is at `https://srv1871758.hstgr.cloud/api/`. The reverse proxy already supports same-origin Frappe routes, `/staff-api/`, and `/vip-entry-api/`. Frappe REST/RPC authentication and role checks must remain authoritative.

Browser applications use an authenticated Frappe session cookie plus CSRF protections for writes. API key/secret token pairs are for server-to-server processes only. If such an integration user is later required, create a separate least-privileged user and store its secret in the server secret manager/environment, never in Git, localStorage, or a Vite `VITE_*` variable.

## Verification evidence (2026-08-13)

- Hostinger key registration succeeded.
- SSH public key authentication succeeded with strict fingerprint verification.
- Production scheduler active; two workers online.
- Test scheduler disabled/paused.
- Public `/healthz` returned HTTP 200.
- Unauthenticated custom API access returned HTTP 403.
- Branch Manager context was resolved from the Frappe identity and branch.
- Fresh production database backups were present before integration changes.
- `VIP Branch Sales Goal` and `nomad_vip.api.management` passed migration and 6 management tests on `bat116-test.local`, including a real database proposal → submission → CEO approval flow.
- A fresh production backup was completed at 2026-08-13 18:44 before deployment.
- The tested backend source was deployed and `nomad.local` migrated successfully; affected Frappe services restarted healthy.
- All four production Branch Manager identities passed a read-only smoke test for derived branch, CRM count, penalty count, and paid-POS sales availability.
- The role-aware management PWA was deployed at `/manager/` with a light Mongolian interface, same-origin Frappe session authentication, CSRF-protected writes, and no embedded API token.
- Public `/manager/`, its JavaScript/CSS assets, root routing, and `/healthz` returned HTTP 200 after deployment; unauthenticated management API access remained HTTP 403.
- The management backend company smoke check returned four branches, live paid-POS sales availability, and no unexpected business-record mutation.

No production customer, employee, schedule, leave, penalty, goal, approval, or accounting business record was changed during the deployment. The only production database change was the new empty `VIP Branch Sales Goal` schema and supporting metadata/indexes created by the standard Frappe migration. A source/configuration rollback copy is retained under `/opt/nomad-vip/backups/pre-manager-ui-20260813-1930/`.
