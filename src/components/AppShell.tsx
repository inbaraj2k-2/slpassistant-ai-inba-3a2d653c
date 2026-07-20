import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, FolderClock, Home, Settings, WifiOff } from "lucide-react";
import { type ReactNode } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useProfile } from "@/hooks/useProfile";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
}

export function AppShell({ title, subtitle, back, right, children, hideNav }: Props) {
  const router = useRouter();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { data: profile } = useProfile();
  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {!online && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-1.5 text-[11px] font-semibold text-amber-950 shadow-sm"
        >
          <WifiOff className="h-3.5 w-3.5" />
          Offline — AI features disabled. Saved data still available.
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="flex items-center gap-3 px-4 pb-3 pt-5">
          {back ? (
            <button
              onClick={() => router.history.back()}
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-accent"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => navigate({ to: "/settings" })}
              aria-label="Open profile & settings"
              className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-primary text-primary-foreground shadow-card"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <BrandMark />
              )}
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {right}
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      {!hideNav && (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
            <NavItem to="/home" icon={<Home className="h-5 w-5" />} label="Home" />
            <NavItem to="/cases" icon={<FolderClock className="h-5 w-5" />} label="Cases" />
            <NavItem to="/library" icon={<BookOpen className="h-5 w-5" />} label="Library" />
            <NavItem to="/settings" icon={<Settings className="h-5 w-5" />} label="Settings" />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition data-[status=active]:text-primary"
      activeProps={{ className: "text-primary" }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
