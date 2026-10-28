"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BellRing, CheckCircle2, KeyRound, LoaderCircle, LogOut, Moon, Shield, Sun, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useMe } from "./connection-badge";
import { DriveConnectButton } from "./drive-connect-button";

const authErrors: Record<string, string> = {
  server_configuration: "The server credentials are incomplete or invalid. Check .env.local and restart VaultSync.",
  database_setup: "VaultSync could not reach its Supabase tables. Apply supabase/migrations/202610280001_initial_vaultsync.sql, then try again.",
  oauth_state: "The Google sign-in was opened from a different hostname or the request expired. Open http://127.0.0.1:3000 and try again.",
  oauth_expired: "The Google sign-in request expired. Please start it again.",
  google_access_denied: "Google Drive access was cancelled. No account changes were made.",
  google_oauth: "Google could not complete authorization. Please retry and approve the requested Drive permission.",
  oauth_token_exchange: "Google returned the account but the secure token exchange failed. Confirm the exact callback URL in Google Cloud.",
  oauth_profile_failed: "Google authorized Drive, but the account profile could not be read. Please reconnect.",
  service_unavailable: "Google or Supabase did not respond in time. Check your internet connection and Supabase project, then retry.",
  oauth_callback: "Google sign-in returned, but VaultSync could not finish account setup. Check the server log and Supabase migration.",
};

export function SettingsPanel() {
  const me = useMe(); const queryClient = useQueryClient();
  const [theme, setTheme] = useState("dark"); const [schedule, setSchedule] = useState("manual"); const [wifiOnly, setWifiOnly] = useState(true);
  const [authNotice, setAuthNotice] = useState<{ kind: "success" | "error"; text: string }>();
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme ?? "dark"); setSchedule(localStorage.getItem("vaultsync-schedule") ?? "manual"); setWifiOnly(localStorage.getItem("vaultsync-wifi-only") !== "false");
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) setAuthNotice({ kind: "error", text: authErrors[error] ?? "Google Drive could not be connected. Please retry." });
    else if (params.get("connected") === "1") setAuthNotice({ kind: "success", text: "Google Drive connected successfully. This browser is ready to back up files." });
    if (error || params.has("connected")) window.history.replaceState({}, "", window.location.pathname);
  }, []);
  const changeTheme = (value: string) => { setTheme(value); document.documentElement.dataset.theme = value; localStorage.setItem("vaultsync-theme", value); };
  const changeSchedule = (value: string) => { setSchedule(value); localStorage.setItem("vaultsync-schedule", value); };
  const signOut = async () => {
    setSigningOut(true); setAuthNotice(undefined);
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.invalidateQueries({ queryKey: ["remote-backups"] });
      setAuthNotice({ kind: "success", text: "This browser has been signed out of VaultSync." });
    } catch {
      setAuthNotice({ kind: "error", text: "VaultSync could not sign out this browser. Please retry." });
    } finally { setSigningOut(false); }
  };
  return <div className="grid gap-4 xl:grid-cols-2">
    {authNotice && <div role={authNotice.kind === "error" ? "alert" : "status"} className={`xl:col-span-2 flex items-start gap-3 rounded-2xl border p-4 text-sm ${authNotice.kind === "error" ? "border-red-300/20 bg-red-300/[.06] text-red-100" : "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100"}`}>{authNotice.kind === "error" ? <AlertCircle className="mt-0.5 shrink-0" size={17}/> : <CheckCircle2 className="mt-0.5 shrink-0" size={17}/>}<span>{authNotice.text}</span></div>}
    <SettingCard icon={me.data?.authenticated ? Shield : KeyRound} title="Google Drive account" description={me.data?.mockData ? "Mock data is enabled for visual review. No Google account is connected and no files can upload." : me.data?.authenticated ? me.data.user?.email ?? "Connected" : me.data?.configured === false ? "Server credentials have not been configured." : "Connect with the limited drive.file permission."}>{me.data?.mockData ? <span className="inline-flex rounded-full border border-[#ff9188]/25 bg-[#ff9188]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#ffaaa3]">Demo mode active</span> : me.data?.authenticated ? <button type="button" disabled={signingOut} onClick={() => void signOut()} className="rounded-xl border border-red-300/15 bg-red-300/[.05] px-4 py-2 text-xs text-red-200 disabled:cursor-wait disabled:opacity-60">{signingOut ? <LoaderCircle className="mr-2 inline animate-spin" size={14}/> : <LogOut className="mr-2 inline" size={14}/>} {signingOut ? "Signing out…" : "Sign out on this device"}</button> : <DriveConnectButton compact className="gradient-button rounded-xl px-4 py-2 text-xs font-semibold"/>}</SettingCard>
    <SettingCard icon={theme === "dark" ? Moon : Sun} title="Appearance" description="Use a high-contrast dark surface or a soft light workspace."><div className="flex rounded-xl bg-black/10 p-1">{["dark","light"].map((value) => <button type="button" key={value} onClick={() => changeTheme(value)} className={`flex-1 rounded-lg px-3 py-2 text-xs capitalize ${theme === value ? "bg-white/10 text-[var(--ink)]" : "text-[var(--muted)]"}`}>{value}</button>)}</div></SettingCard>
    <SettingCard icon={BellRing} title="Backup schedule" description="The PWA can remind you and resume when reopened; it cannot promise background execution after the browser is closed."><select value={schedule} onChange={(event) => changeSchedule(event.target.value)} className="w-full rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5 text-sm"><option value="manual">Manual only</option><option value="daily">Daily reminder</option><option value="weekly">Weekly reminder</option></select></SettingCard>
    <SettingCard icon={Wifi} title="Network preference" description="This preference is checked before a queue starts when the browser exposes connection information."><label className="flex items-center justify-between rounded-xl bg-black/10 p-3 text-sm"><span>Prefer Wi-Fi</span><input type="checkbox" checked={wifiOnly} onChange={(event) => { setWifiOnly(event.target.checked); localStorage.setItem("vaultsync-wifi-only", String(event.target.checked)); }} className="size-4 accent-[#70d6df]"/></label></SettingCard>
    <SettingCard icon={KeyRound} title="End-to-end encryption" description="The encryption format and recovery workflow are documented, but encrypted uploads remain disabled in this release until streaming restore verification is enabled."><div className="rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3 text-xs leading-relaxed text-amber-100">VaultSync will not offer a switch that can create unrecoverable backups. Plain uploads still travel directly to your Drive over HTTPS.</div></SettingCard>
    <SettingCard icon={Shield} title="Privacy controls" description="Disconnecting this browser removes its session. Revoking Google access is handled from your Google Account security page."><a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer" className="text-xs text-[#70d6df]">Open Google account connections ↗</a></SettingCard>
  </div>;
}

function SettingCard({ icon: Icon, title, description, children }: { icon: typeof Shield; title: string; description: string; children: React.ReactNode }) { return <section className="soft-card rounded-2xl p-5"><Icon size={20} className="text-[#9d83ff]"/><h2 className="mt-4 font-semibold">{title}</h2><p className="mb-5 mt-2 text-xs leading-relaxed text-[var(--muted)]">{description}</p>{children}</section>; }
