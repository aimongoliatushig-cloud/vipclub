# Bootstrap credentials

VIP accounts no longer have repository-defined default passwords.

## Provisioning rule

Each account reads its one-time password from an account-specific environment variable:

`NOMAD_VIP_BOOTSTRAP_PASSWORD_<NORMALIZED_EMAIL>`

Example variable name for `manager.sapphire@vipclub.local`:

`NOMAD_VIP_BOOTSTRAP_PASSWORD_MANAGER_SAPPHIRE_VIPCLUB_LOCAL`

The password value must be at least 16 characters and include upper-case, lower-case, numeric, and symbol characters. Never place values in source code, images, tickets, logs, shell history, or documentation.

If a variable is absent during first provisioning, the User record is created disabled with no known password. An administrator must use a secure invitation/reset process before enabling it.

## One-time procedure

1. Generate a unique password for every account in an approved secret manager.
2. Inject only the required account variables into the migration/provisioning process.
3. Run provisioning and verify the expected role and branch without printing the environment.
4. Remove the variables immediately after provisioning.
5. Deliver the credential through an approved secure channel and require a password change.
6. Record account identifier, actor, time, and success/failure in the rotation evidence; never record the secret.

Existing production accounts are not automatically reset by migrations. Rotate them in a coordinated maintenance step with session revocation and a tested rollback administrator.

## Recurrence check

Run:

```bash
python scripts/check_no_bootstrap_secrets.py
```

The check fails when Python source contains a literal `new_password` or a literal constant ending in `_PASSWORD`.
