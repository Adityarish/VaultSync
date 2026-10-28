"use client";

import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function DriveConnectButton({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const reset = () => setConnecting(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <form action="/api/auth/google" method="get" onSubmit={() => setConnecting(true)}>
      <button
        type="submit"
        disabled={connecting}
        aria-busy={connecting}
        className={`${className} disabled:cursor-wait disabled:opacity-70`}
      >
        {connecting ? <LoaderCircle className="mr-2 inline animate-spin" size={16} /> : null}
        {connecting ? "Opening Google…" : "Connect Google Drive"}
        {!connecting && !compact ? <ArrowUpRight className="ml-2 inline" size={16} /> : null}
      </button>
    </form>
  );
}
