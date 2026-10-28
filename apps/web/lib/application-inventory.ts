import { z } from "zod";

export const applicationInventoryEntrySchema = z.object({
  packageName: z.string().trim().min(1).max(255),
  displayName: z.string().trim().min(1).max(255),
  versionName: z.string().trim().max(100).optional(),
  versionCode: z.union([z.string().trim().max(100), z.number().int().nonnegative()]).optional(),
  installationSource: z.string().trim().max(255).optional(),
  apkBackupFilename: z.string().trim().max(512).optional(),
  exportEligible: z.boolean().optional(),
});

export const applicationInventorySchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  deviceName: z.string().trim().min(1).max(255).optional(),
  apps: z.array(applicationInventoryEntrySchema).max(10_000),
});

export type ApplicationInventory = z.infer<typeof applicationInventorySchema>;

export function parseApplicationInventory(source: string): ApplicationInventory {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("The inventory must be a valid JSON file.");
  }

  const parsed = applicationInventorySchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("This is not a VaultSync application inventory (schema version 1).");
  }
  return parsed.data;
}
