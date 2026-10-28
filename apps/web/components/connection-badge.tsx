"use client";

import { useQuery } from "@tanstack/react-query";
import { Cloud, LoaderCircle } from "lucide-react";

export type Me = { authenticated: boolean; configured?: boolean; mockData?: boolean; user?: { name: string | null; email: string; avatarUrl: string | null }; drive?: { connected: boolean; rootFolderId: string | null } };

async function getMe(): Promise<Me> {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  if (!response.ok) return { authenticated: false };
  return response.json() as Promise<Me>;
}

export function useMe() { return useQuery({ queryKey: ["me"], queryFn: getMe }); }

export function ConnectionBadge() {
  const { data, isLoading } = useMe();
  if (isLoading) return <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted)]"><LoaderCircle className="animate-spin" size={14}/>Checking connection</div>;
  return <div className="flex items-center gap-2 rounded-xl bg-white/[.035] px-3 py-2.5 text-xs"><span className={`size-2 rounded-full ${data?.authenticated ? "bg-emerald-400 shadow-[0_0_12px_#34d399]" : "bg-amber-400"}`}/><Cloud size={15}/><span>{data?.mockData ? "Demo data preview" : data?.authenticated ? "Google Drive connected" : "Drive not connected"}</span></div>;
}
