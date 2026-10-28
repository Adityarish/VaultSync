# Restore guide

1. Open **Restore Center** while connected to the Google account used for backup.
2. Search or filter the committed recovery metadata.
3. Download an item. VaultSync verifies that the metadata belongs to your session before streaming bytes from Drive.
4. Choose a destination using browser or operating-system controls.
5. Resolve conflicts explicitly: skip, rename/keep both, or replace only when the platform shows that option.
6. For contacts, import the downloaded VCF into the target contact manager and review duplicates before confirming.
7. For APKs, use Android's normal installer. The user must confirm installation and may need to allow the browser/file manager as an installation source.

For disaster-recovery testing, compare the SHA-256 hash of a restored file with `checksum_sha256` in the corresponding Drive manifest.
