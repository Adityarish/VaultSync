# Platform and release limitations

- A PWA cannot enumerate a phone, read the full address book, discover installed apps, or access other apps' private data. Users must choose files/folders; contact selection remains user-controlled.
- Mobile browsers can suspend or terminate an active upload. The queue persists enough state to retry while the PWA is open, but background completion is not guaranteed.
- The browser cannot promise a daily or weekly background run. Current schedule settings are reminders/resume preferences, not claims of native execution.
- `drive.file` allows VaultSync to manage files it created or the user explicitly opened with it. It does not grant arbitrary Drive browsing.
- Drive folder organization currently separates devices and categories. Year/month partitioning can be added without changing canonical metadata.
- Gallery previews and restores fetch directly from Google Drive with a short-lived in-memory access token. Browsers without the File System Access API may need to buffer a large download before presenting the save prompt; Chromium-based browsers can stream to the chosen file.
- End-to-end encrypted upload is not exposed yet. Shipping encryption without a tested streaming restore path could make backups unrecoverable; HTTPS direct-to-Drive transport and encrypted provider tokens are active today.
- The Android directory is an architecture scaffold. Native authorization, Room queue persistence, full MediaStore/Contacts/SAF processing, and WorkManager upload execution require Android SDK validation and live credentials.
- APK restore always uses Android's normal package installer and confirmation. App-private data, login sessions, and protected backups are outside VaultSync's access.
