# BAT-113 migration and rollback

## Forward migration

1. Back up the site database and private/public files.
2. Deploy the custom app version containing the new DocType and fields.
3. Run `bench --site <site> migrate`.
4. The post-model-sync patch creates one open branch assignment for each active legacy profile that has a branch and no equivalent open assignment.
5. Re-running the patch is safe: the equivalent open assignment is detected and skipped.
6. Verify counts by branch, overlap count, missing Employee/User links, consent status distribution and permission probes before enabling the PWA.

## Rollback

Application rollback must not silently delete consent or assignment history.

1. Disable the Manager/Entertainer feature flag and stop writes to the new fields/DocType.
2. Restore the previous app image/code.
3. Keep the new columns/table in place during the observation period; older code ignores them.
4. If a full database rollback is required, restore the pre-migration backup rather than issuing broad DELETE/DROP commands.
5. If only migration-created assignments must be reversed, first export and review records whose `reason` exactly matches the migration marker. Remove them only through an approved change with a backup and row-count evidence.

## Privacy and retention

- A photo is returned to the entertainer API only while consent status is `Granted`.
- Revoked/denied media remains hidden immediately and enters the approved file-retention/deletion process.
- Consent actor, timestamp and version are audit fields and must not be overwritten by bulk imports.
