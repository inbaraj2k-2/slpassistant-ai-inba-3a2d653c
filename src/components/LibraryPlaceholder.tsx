import { AppShell } from "@/components/AppShell";
import type { ReactNode } from "react";

export function LibraryPlaceholder({
  title,
  subtitle,
  icon,
  message,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  message?: string;
}) {
  return (
    <AppShell title={title} subtitle={subtitle} back>
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-card">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          {icon}
        </div>
        <p className="mt-4 text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {message ?? "Content coming soon."}
        </p>
      </div>
    </AppShell>
  );
}
