import type { RemoteBackupItem } from "./remote-backups";

export const MOCK_BACKUP_ITEMS: RemoteBackupItem[] = [
  { id: "10000000-0000-4000-8000-000000000001", backup_job_id: "20000000-0000-4000-8000-000000000001", category: "photos", original_filename: "Diwali-at-home.jpg", original_relative_path: "DCIM/Camera/Diwali-at-home.jpg", size_bytes: 4_820_314, mime_type: "image/jpeg", last_modified_ms: 1793140200000, checksum_sha256: "1".repeat(64), drive_file_id: "mock-drive-photo-1", verified_at: "2026-10-28T11:42:00.000Z", restore_compatibility: "browser" },
  { id: "10000000-0000-4000-8000-000000000002", backup_job_id: "20000000-0000-4000-8000-000000000001", category: "photos", original_filename: "Ladakh-sunrise.heic", original_relative_path: "Pictures/Trips/Ladakh-sunrise.heic", size_bytes: 7_640_921, mime_type: "image/heic", last_modified_ms: 1793139600000, checksum_sha256: "2".repeat(64), drive_file_id: "mock-drive-photo-2", verified_at: "2026-10-28T11:42:00.000Z", restore_compatibility: "browser" },
  { id: "10000000-0000-4000-8000-000000000003", backup_job_id: "20000000-0000-4000-8000-000000000001", category: "videos", original_filename: "family-moments.mp4", original_relative_path: "DCIM/Camera/family-moments.mp4", size_bytes: 684_271_616, mime_type: "video/mp4", last_modified_ms: 1793053200000, checksum_sha256: "3".repeat(64), drive_file_id: "mock-drive-video-1", verified_at: "2026-10-28T11:42:00.000Z", restore_compatibility: "browser" },
  { id: "10000000-0000-4000-8000-000000000004", backup_job_id: "20000000-0000-4000-8000-000000000001", category: "documents", original_filename: "Internship-offer.pdf", original_relative_path: "Documents/Internship-offer.pdf", size_bytes: 1_284_992, mime_type: "application/pdf", last_modified_ms: 1792966800000, checksum_sha256: "4".repeat(64), drive_file_id: "mock-drive-doc-1", verified_at: "2026-10-28T11:42:00.000Z", restore_compatibility: "browser" },
  { id: "10000000-0000-4000-8000-000000000005", backup_job_id: "20000000-0000-4000-8000-000000000001", category: "contacts", original_filename: "contacts-2026-10-28.vcf", original_relative_path: "Contacts/contacts-2026-10-28.vcf", size_bytes: 186_404, mime_type: "text/vcard", last_modified_ms: 1793142000000, checksum_sha256: "5".repeat(64), drive_file_id: "mock-drive-contact-1", verified_at: "2026-10-28T11:42:00.000Z", restore_compatibility: "browser" },
  { id: "10000000-0000-4000-8000-000000000006", backup_job_id: "20000000-0000-4000-8000-000000000000", category: "audio", original_filename: "voice-note.m4a", original_relative_path: "Audio/voice-note.m4a", size_bytes: 8_912_864, mime_type: "audio/mp4", last_modified_ms: 1792621200000, checksum_sha256: "6".repeat(64), drive_file_id: "mock-drive-audio-1", verified_at: "2026-10-25T06:18:00.000Z", restore_compatibility: "browser" },
  { id: "10000000-0000-4000-8000-000000000007", backup_job_id: "20000000-0000-4000-8000-000000000000", category: "apks", original_filename: "notes-app.apk", original_relative_path: "APKs/notes-app.apk", size_bytes: 34_603_008, mime_type: "application/vnd.android.package-archive", last_modified_ms: 1792534800000, checksum_sha256: "7".repeat(64), drive_file_id: "mock-drive-apk-1", verified_at: "2026-10-25T06:18:00.000Z", restore_compatibility: "download-only" },
  { id: "10000000-0000-4000-8000-000000000008", backup_job_id: "20000000-0000-4000-8000-000000000000", category: "app-inventory", original_filename: "vaultsync-app-inventory.json", original_relative_path: "App-Inventory/vaultsync-app-inventory.json", size_bytes: 2_048, mime_type: "application/json", last_modified_ms: 1792534800000, checksum_sha256: "8".repeat(64), drive_file_id: "mock-drive-inventory-1", verified_at: "2026-10-25T06:18:00.000Z", restore_compatibility: "android" },
];

export const MOCK_APPLICATION_INVENTORY = {
  schemaVersion: 1 as const,
  exportedAt: "2026-10-25T06:10:00.000Z",
  deviceName: "Pixel 9",
  apps: [
    { packageName: "com.example.notes", displayName: "Notes", versionName: "4.2.1", versionCode: 421, installationSource: "Google Play", apkBackupFilename: "notes-app.apk", exportEligible: true },
    { packageName: "com.google.android.apps.photos", displayName: "Photos", versionName: "7.48", installationSource: "Google Play", exportEligible: false },
    { packageName: "org.videolan.vlc", displayName: "VLC", versionName: "3.6.5", installationSource: "Google Play", exportEligible: true },
  ],
};

export const mockModeEnabled = () => process.env.MOCK_DATA === "true" || process.env.mock_data === "true";
