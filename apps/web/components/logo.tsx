import { ShieldCheck } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="VaultSync">
      <span className="grid size-10 place-items-center rounded-[14px] bg-[linear-gradient(140deg,#8b70ff,#5ed3e2)] text-[#0c1020] shadow-[0_9px_28px_rgba(102,109,255,.28)]">
        <ShieldCheck size={21} strokeWidth={2.5} />
      </span>
      {!compact && <span><b className="block text-[15px] tracking-[-.02em]">VaultSync</b><span className="text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">Your drive. Your data.</span></span>}
    </div>
  );
}
