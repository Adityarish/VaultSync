import { z } from "zod";

export const backupCategorySchema = z.enum([
  "photos", "videos", "contacts", "documents", "audio", "downloads", "apks", "app-inventory", "other",
]);

export const backupManifestItemSchema = z.object({
  schemaVersion: z.literal(1),
  backupId: z.string().uuid(),
  deviceId: z.string().uuid(),
  createdAt: z.string().datetime(),
  category: backupCategorySchema,
  originalFilename: z.string().min(1),
  originalRelativePath: z.string(),
  size: z.number().int().nonnegative(),
  mimeType: z.string(),
  lastModified: z.number().int().nonnegative(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  driveFileId: z.string().min(1),
  state: z.literal("verified"),
  encrypted: z.boolean(),
  encryption: z.object({ algorithm: z.literal("AES-GCM"), iv: z.string(), salt: z.string(), iterations: z.number() }).optional(),
  restoreCompatibility: z.enum(["browser", "android", "download-only"]),
});

export type BackupManifestItem = z.infer<typeof backupManifestItemSchema>;
