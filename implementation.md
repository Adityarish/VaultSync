# MASTER IMPLEMENTATION PROMPT — VAULTSYNC

> Implementation status (2026-10-28): The repository now contains the Phase 1–3 web foundation and functional PWA backup path: responsive Next.js UI, Google OAuth authorization-code + PKCE, opaque server sessions, encrypted provider tokens, `drive.file` folder provisioning, browser-to-Drive resumable uploads, IndexedDB queue recovery, SHA-256 deduplication, verified metadata, atomic snapshot finalization, Drive manifests, file/contact browsing, VCF workflows, restore downloads, offline shell, Supabase migration/RLS lockdown, and deployment/security documentation. The optional Android companion is represented by an honest architecture scaffold; native Google authorization, Room queue persistence, and end-to-end WorkManager upload execution still require an Android build environment and live provider credentials. End-to-end encryption is intentionally not exposed in the UI until streaming encrypted restore can be verified. See `docs/limitations.md` for the exact boundary.

## ROLE AND OBJECTIVE

You are a senior full-stack engineer, Android developer, cloud architect, UI/UX designer, and application security engineer.

Build a production-quality Progressive Web Application called **VaultSync — Your Phone, Your Drive**.

The application must allow users to securely back up and restore their personal phone data to their own Google Drive account.

The product should combine the usability of Google Photos, Google One Backup, and a modern cloud file manager.

Build a real, functional application with a clean architecture, robust error handling, responsive layouts, and a polished interface.

Do not build a static demonstration or simulate completed backups.

Implement the system in two layers:

1. A Next.js Progressive Web Application available through browsers and installable on supported devices.
2. An optional native Android companion application for capabilities unavailable to normal browser applications.

The PWA must be fully functional without the companion app for supported operations.

Never claim that a feature is supported if the browser or Android security model prevents it.

---

# 1. TECHNOLOGY STACK

## Frontend

- Next.js with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion / Motion for React
- Lucide icons
- TanStack Query
- Zustand for lightweight UI state
- IndexedDB using Dexie
- Responsive PWA with manifest and service worker
- Accessible, mobile-first interface

## Backend

- Next.js route handlers or a separate API service where appropriate
- TypeScript
- PostgreSQL through Supabase
- Supabase Row Level Security
- Zod for validation
- Structured logging
- Secure server-side session handling

## Storage

Primary cloud storage:

Google Drive API v3

The actual backup content must be stored in the user's own Google Drive account.

Supabase should store only the metadata required for the product, such as:

- User records
- Device registration
- Backup job metadata
- File metadata
- Backup history
- User preferences
- Restore job state

Do not upload a user's personal files to Supabase Storage unless an explicitly documented optional feature requires it.

Do not permanently store private backup content on the application server.

## Android Companion

- Kotlin
- Jetpack Compose
- Android WorkManager
- Android Photo Picker / MediaStore
- Storage Access Framework
- Android Contacts Provider
- Android Keystore
- Room database
- Foreground services only where permitted and justified
- Standard Android permission APIs

---

# 2. AUTHENTICATION AND GOOGLE DRIVE

Implement Google OAuth 2.0 using a secure authorization-code flow with PKCE where applicable.

Use the narrowest permissions that support the product.

Start with:

https://www.googleapis.com/auth/drive.file

Use the Google Drive API for backup upload, retrieval, restoration, and management of application-created files.

If broader access is needed, require a clear use case, explicit consent, and document verification requirements.

Do not request full Drive access merely for convenience.

Implement:

- Sign in with Google
- Sign out
- Connected account details
- Reconnect expired account
- Session expiration handling
- Account switching
- Multiple Google Drive destinations as a future-ready design
- Secure token storage
- Refresh token rotation and revocation handling where applicable

Never expose refresh tokens in client-side JavaScript or browser storage.

For browser uploads, prefer supported user-authorized flows. Do not route large personal files through the application server unless necessary.

---

# 3. GOOGLE DRIVE FOLDER ORGANIZATION

On first successful connection, create a dedicated root folder in Google Drive.

Suggested structure:

VaultSync/
    Devices/
        Android-Device-001/
            Photos/
                2026/
                    10/
                    11/
            Videos/
                2026/
            Contacts/
            Documents/
            Audio/
            Downloads/
            APKs/
            App-Inventory/
            Backups/
            Manifests/
    Exports/
    Restore-Packages/

Use Google Drive folder IDs as the canonical references.

Never rely solely on folder names or paths.

Allow users to choose or rename their application's root backup folder where supported.

Do not automatically delete or modify unrelated Google Drive files.

Include a machine-readable manifest for each backup session.

Manifest fields:

- Backup ID
- Device ID
- Backup creation timestamp
- Backup schema version
- File category
- Original filename
- Original relative path
- File size
- MIME type
- Last modified timestamp
- Content checksum
- Google Drive file ID
- Backup state
- Encryption metadata
- Restore compatibility

Manifest updates must be atomic or recoverable.

---

# 4. MAIN DASHBOARD

Build a visually polished dashboard.

Top section:

- VaultSync logo
- Connected Google account
- Device name
- Last successful backup
- Connection status
- Backup health

Display storage statistics:

- Google Drive storage used
- Total Drive quota when available
- Estimated available storage
- Bytes stored by VaultSync
- Photos backed up
- Videos backed up
- Contacts backed up
- Documents backed up
- Total protected files

Use a clean storage usage chart with category breakdown.

Primary actions:

- Backup Now
- Restore Data
- View Files
- Manage Devices

Show a backup status card containing:

- Current backup phase
- Current file
- Uploaded bytes
- Total bytes
- Transfer speed
- Estimated completion time when reliably calculable
- Pause
- Resume
- Cancel

The dashboard must accurately reflect actual backend and upload state.

Use skeleton loading and useful empty states.

---

# 5. PHOTOS AND VIDEOS BACKUP

Implement a dedicated gallery module.

Features:

- Photo grid
- Video grid
- Album and folder browsing
- Preview
- Multi-selection
- Filtering by file type
- Date grouping
- Sorting
- Search
- Backup selected media
- Restore selected media
- Download originals
- Verify backed-up copies

Supported formats should include common formats such as:

JPEG, PNG, WEBP, HEIC where the platform supports it, MP4, MOV, and other safely supported files.

Do not modify original media by default.

Preserve original bytes, filenames, and applicable timestamps.

Avoid stripping EXIF or other original metadata from the backed-up file.

Generate thumbnails locally where possible.

Never upload original photos to a third-party thumbnail service.

PWA implementation:

Allow users to choose files or supported directories.

Use browser file handling APIs with feature detection and graceful fallback.

Native Android implementation:

Use permission-appropriate media access APIs to discover and upload eligible photos and videos.

Support incremental backup of newly discovered media.

Do not repeatedly upload unchanged media.

---

# 6. CONTACTS BACKUP

Build a dedicated contact backup and restore interface.

Features:

- Import contacts
- Display imported contacts
- Search contacts
- Detect duplicates
- Export selected contacts
- Export all contacts
- Restore contacts
- View historical backups

Use vCard (.vcf) as the primary interoperable backup format.

Optionally support JSON and CSV exports.

PWA implementation:

- Support uploading VCF files.
- Use Contact Picker API only when supported.
- Respect that browser contact selection is user-controlled and cannot be treated as unrestricted address-book access.

Android implementation:

- Request contact access only after an explicit user action.
- Read authorized contact records through the Contacts Provider.
- Export supported contact fields.
- Restore contacts only after showing a preview and requesting confirmation.
- Avoid duplicate creation during restore.

Supported contact fields should include names, phone numbers, emails, addresses, notes, and supported labels where available.

---

# 7. DOCUMENTS AND FILE BACKUP

Build a file-management experience.

Support:

- PDFs
- Word documents
- Excel files
- PowerPoint files
- Text files
- ZIP files
- Audio files
- Downloaded files
- Other arbitrary user-selected files

Features:

- File selection
- Folder selection where supported
- Drag and drop on desktop
- Search
- File type filters
- Folder browsing
- File preview for safe supported formats
- Upload progress
- Download
- Restore
- File integrity verification

For native Android, allow the user to grant access to chosen folders using Android's Storage Access Framework.

Preserve relative folder structure in backup manifests.

---

# 8. APPLICATION BACKUP

Create a dedicated Apps section.

IMPORTANT:

A third-party PWA cannot read the complete installed application list, extract APKs automatically, or access private data belonging to other applications.

Android also restricts access to other applications' private data.

Implement the following realistic features.

## PWA

- Upload user-selected APK files.
- Import app inventory exported by the Android companion.
- Show backed-up APK files.
- Download backed-up APKs.
- Provide manual restoration instructions.

## Android Companion

- Display applications visible through permission-compliant Android package APIs.
- Record accessible metadata such as package name, display name, version, and installation source when available.
- Provide an application inventory backup.
- Support APK export only for eligible applications and only where platform capabilities and licensing allow.
- Handle split APKs and app bundles appropriately.
- Never bypass sandbox restrictions to access private application data.
- Do not use root-only or security-bypass mechanisms.

Restoring an APK must require the normal Android installation flow and user confirmation.

Do not promise automatic restoration of login sessions, bank app data, WhatsApp private data, or other protected app content.

Provide guidance for using official app-native export and backup features.

---

# 9. SMART BACKUP ENGINE

Create a robust backup engine supporting:

- Full backup
- Incremental backup
- Manual backup
- Selected-category backup
- Backup retry
- Interrupted upload recovery
- Queue persistence
- File verification

On an initial backup, identify all user-authorized files in the selected scope.

On subsequent backups, process new and modified files.

Use a combination of file metadata and cryptographic checksums for change detection.

Maintain a local metadata index.

Do not rely solely on filenames for duplicate detection.

A file with the same name may contain different content.

Maintain separate concepts for:

- Duplicate detection
- Version history
- Content integrity
- Backup completion

Use a transaction-safe queue.

Ensure that a partially uploaded file is never marked as successfully backed up.

Support resumable uploads through the Google Drive API.

Implement exponential backoff with jitter for transient errors.

Handle:

- Network disconnection
- Access token expiration
- Insufficient cloud storage
- API rate limiting
- Large video files
- File permission removal
- App termination
- User cancellation

Persist sufficient metadata to recover compatible interrupted uploads.

---

# 10. AUTO BACKUP AND SCHEDULING

Create configurable backup preferences.

Options:

- Manual only
- Daily
- Weekly
- Wi-Fi only
- Charging only
- Battery threshold
- Selected folders
- Selected categories

The PWA must not claim guaranteed periodic background execution.

Use browser background capabilities only where supported.

Clearly distinguish between:

- Scheduled reminder
- Backup when the PWA is reopened
- Active upload while the PWA is running
- True native Android background backup

Implement reliable scheduled background backup in the optional Android companion using WorkManager, subject to Android scheduling and power-management constraints.

Show the actual backup execution state rather than an assumed successful state.

---

# 11. RESTORE CENTER

Build a Restore Center where users can recover files from previously completed backups.

Features:

- Select device
- Select backup snapshot
- Select category
- Preview backup contents
- Select individual items
- Restore all supported items
- Restore to current device
- Download ZIP or individual files where practical
- Display restore progress
- Verify integrity

Restoring media and documents should allow the user to choose a destination where platform rules require it.

Restoring contacts must support deduplication and user confirmation.

Restoring apps is limited to supported APK installation workflows.

Show conflicts before overwriting local files.

Include options:

- Skip
- Rename
- Keep both
- Replace, where supported

Never overwrite files silently.

---

# 12. OFFLINE-FIRST PROGRESSIVE WEB APPLICATION

The application must be installable as a PWA.

Implement:

- Valid web manifest
- Proper install icons
- Service worker
- Offline dashboard shell
- Cached application assets
- Offline backup history
- IndexedDB-backed metadata
- Pending upload queue
- Connection status
- Automatic synchronization when the app is active and connectivity returns

Do not claim that a PWA can always continue uploading when a phone closes the browser or terminates the app.

Cached offline data must be carefully scoped and storage usage monitored.

Avoid caching full private media collections by default.

Provide offline mode with clear differences between local data and confirmed cloud backups.

---

# 13. PRIVACY AND ENCRYPTION

Treat the product as a privacy-sensitive backup system.

Implement:

- HTTPS
- Secure authorization
- Least-privilege permissions
- Row Level Security
- Input validation
- Protected secrets
- Audit logging without personal file content
- User account deletion
- Device unlinking
- Explicit consent before backing up personal data

Provide optional end-to-end encrypted backups.

For encrypted backups:

- Encrypt data locally before upload.
- Use established authenticated encryption.
- Use proper nonce management.
- Derive keys through appropriate audited cryptography.
- Store versioned encryption metadata.
- Never transmit the recovery passphrase to the server.
- Never store plaintext encryption keys on the backend.
- Provide recovery-key export.
- Explain that losing the recovery key can make encrypted backups unrecoverable.

Do not invent custom cryptographic algorithms.

Avoid telemetry collection of contacts, photographs, document contents, or filenames unless necessary, explicitly disclosed, and authorized.

---

# 14. USER INTERFACE DESIGN

Create a modern, premium-quality interface.

Visual direction:

- Dark navy and charcoal backgrounds
- Subtle violet, blue, and teal accents
- Soft gradients
- Refined typography
- Rounded cards
- Thin borders
- Lightweight glass effects
- Smooth animations
- Clean data visualizations
- Minimal clutter

Build both light and dark modes.

Use a mobile-first layout.

Mobile bottom navigation:

1. Home
2. Gallery
3. Files
4. Restore
5. Settings

Desktop navigation:

- Overview
- Photos & Videos
- Contacts
- Documents
- Applications
- Backup History
- Restore Center
- Connected Devices
- Settings

Animations:

- Backup progress
- File upload transitions
- Storage visualization
- Success feedback
- Modal transitions
- Gallery interaction

Respect reduced-motion settings.

Maintain accessibility and good performance.

Avoid expensive animations while transferring large files.

---

# 15. BACKUP HISTORY AND DEVICE MANAGEMENT

Allow multiple authorized devices under one account.

Device information:

- Friendly device name
- Device type
- Platform
- Last connected
- Last successful backup
- Backup storage size
- Backup capabilities

History page:

- Backup timestamp
- Device
- Selected categories
- Total files
- Uploaded bytes
- Skipped files
- Failed files
- Duration
- Verification state

Use the history page to explain failures.

Support retrying unsuccessful items without restarting the whole completed backup.

Provide backup retention controls.

Do not delete old backups or Drive files automatically without an explicitly configured retention policy.

---

# 16. DATABASE DESIGN

Design Supabase PostgreSQL tables covering:

- users
- connected_accounts
- devices
- backup_jobs
- backup_items
- backup_manifests
- backup_snapshots
- restore_jobs
- restore_items
- user_settings
- sync_checkpoints
- security_events

Use appropriate keys, constraints, indexes, timestamps, and row-level security policies.

Every query must be scoped to the authorized user.

Do not expose service-role credentials in the frontend.

Create migration scripts and seed only non-sensitive development data.

---

# 17. PROJECT STRUCTURE

Use a monorepo.

vaultsync/
    apps/
        web/
            app/
            components/
            hooks/
            lib/
            public/
            workers/
        android/
            app/
            core/
            data/
            backup/
            restore/
    packages/
        shared/
        schemas/
        backup-core/
        drive-client/
    supabase/
        migrations/
    docs/
        architecture.md
        api.md
        security.md
        implementation.md
        limitations.md
        restore-guide.md
    .env.example
    README.md

Ensure shared schemas are versioned.

Do not introduce unnecessary microservices.

---

# 18. IMPLEMENTATION PHASES

## PHASE 1 — FUNCTIONAL PWA MVP

Implement:

- Next.js setup
- PWA configuration
- Google OAuth
- Google Drive connection
- Root folder creation
- File and media selection
- Upload files to Drive
- Resumable uploads
- Backup history
- File browsing
- Download and restore
- IndexedDB upload metadata
- Responsive dashboard

This phase must be usable end-to-end.

## PHASE 2 — BACKUP INTELLIGENCE

Implement:

- Incremental backups
- Deduplication
- Checksums
- Retry handling
- Queue persistence
- Restore snapshots
- Multi-device metadata
- Search and filters
- Storage statistics

## PHASE 3 — CONTACTS AND PRIVACY

Implement:

- VCF import/export
- Contact Picker support with detection
- Contact restore preview
- Duplicate detection
- Optional local encryption
- Recovery-key management

## PHASE 4 — ANDROID COMPANION

Implement:

- Native permission flows
- Photo and video discovery
- Contact backup
- User-approved folder backup
- Application inventory
- Eligible APK export
- WorkManager scheduling
- Wi-Fi and charging constraints
- Device registration
- Shared backup manifest format

## PHASE 5 — PRODUCTION HARDENING

Implement:

- Security reviews
- Integration tests
- Restore testing
- Performance optimization
- Accessibility checks
- Error monitoring
- CI/CD
- Deployment documentation
- Recovery documentation

---

# 19. TESTING REQUIREMENTS

Write unit, integration, and appropriate end-to-end tests.

Test:

- Google sign-in
- Invalid and expired authentication
- First backup
- Incremental backup
- Duplicate detection
- Upload interruption
- Upload resumption
- Offline behavior
- Large-file uploads
- Insufficient Drive quota
- Refresh token failure
- Manifest corruption
- Contact parsing
- Restore integrity
- User account isolation
- Android permission denial
- Encryption and decryption
- Snapshot compatibility

Verify restored files against the original content checksums whenever feasible.

Do not mark a backup as verified without performing the necessary checks.

---

# 20. DEPLOYMENT

Prepare for Vercel hosting of the PWA and Supabase for metadata.

Provide:

- Environment variable examples
- Google Cloud configuration instructions
- OAuth redirect configuration
- Supabase setup instructions
- Database migrations
- Local development commands
- Production build commands
- Deployment instructions
- Android build instructions

Document relevant OAuth consent-screen verification and Android permissions.

Never hardcode credentials.

---

# 21. DEVELOPER OPERATING RULES

Before building:

1. Inspect the existing repository.
2. Identify reusable components.
3. Write an implementation.md plan.
4. Design the data model and architecture.
5. Document platform limitations.
6. Start with a working end-to-end MVP.

During development:

- Write production-oriented code.
- Avoid placeholder success responses.
- Avoid fake progress values.
- Avoid unnecessary mock data.
- Keep modules maintainable.
- Use strict TypeScript.
- Implement real Google Drive operations.
- Handle failures explicitly.
- Build and test after each phase.
- Update implementation.md as progress is made.

Do not claim that inaccessible Android data can be backed up.

Do not use privileged, root, or security-bypass techniques.

If a requirement is technically restricted, implement the closest safe and supported alternative and document the limitation.

## FINAL EXPECTED OUTPUT

Deliver a fully working, installable VaultSync PWA backed by Google Drive, with a functional backup and restore workflow, robust metadata tracking, responsive design, and an architecture ready for a native Android companion.

Prioritize reliable backup and successful restoration over decorative features.

A backup product is only successful if the user's files can actually be recovered.

Begin by creating implementation.md, then implement Phase 1 in the actual codebase. Continue through subsequent phases as resources allow, documenting any remaining work rather than claiming unfinished features are complete.
