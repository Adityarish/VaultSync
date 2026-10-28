import { Logo } from "./logo";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-5 border-b border-[var(--line)] px-5 pb-6 pt-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pb-8 lg:pt-8">
    <div><div className="mb-7 lg:hidden"><Logo /></div>{eyebrow && <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#70d6df]">{eyebrow}</p>}<h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{description}</p></div>
    {action}
  </header>;
}
