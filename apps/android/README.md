# VaultSync Android companion boundary

The native companion is intentionally kept separate from the functional PWA. Its purpose is to add capabilities browsers cannot reliably provide:

- user-approved MediaStore photo/video discovery;
- user-approved Storage Access Framework folders with persisted URI grants;
- explicit Contacts Provider export/restore previews;
- visible, permission-compliant application inventory and eligible APK export;
- Room-backed transfer/checkpoint state;
- WorkManager jobs constrained by network, charging, and battery preferences;
- Android Keystore protection for local device secrets.

The companion must use the same versioned manifest schema as `@vaultsync/schemas`, register a distinct device ID, upload to that device's canonical Drive folder IDs, and never claim access to another application's private sandbox.

This directory is an architecture scaffold, not a shippable Android binary. Before native implementation is enabled, add an Android Gradle project, configure Google OAuth for the Android application signature, implement the Room queue and resumable Drive client, and verify permission denial, process death, WorkManager retry, contact deduplication, and restored checksums on physical devices. No privileged/root APIs are permitted.
