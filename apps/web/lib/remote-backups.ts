"use client";

import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/components/connection-badge";

export interface RemoteBackupItem {
  id: string; backup_job_id: string; category: string; original_filename: string; original_relative_path: string;
  size_bytes: number; mime_type: string; last_modified_ms: number; checksum_sha256: string; drive_file_id: string;
  verified_at: string; restore_compatibility: string;
}

export function useRemoteBackups() {
  const me = useMe();
  return useQuery({ queryKey: ["remote-backups"], enabled: Boolean(me.data?.authenticated), queryFn: async () => {
    const response = await fetch("/api/backups", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load verified backups.");
    return (await response.json() as { items: RemoteBackupItem[] }).items;
  } });
}
