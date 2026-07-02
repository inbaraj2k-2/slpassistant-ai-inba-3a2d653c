import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import {
  BookOpenText,
  ClipboardList,
  Download,
  FileText,
  Brain,
  Search,
  UploadCloud,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/library/")({
  head: () => ({ meta: [{ title: "Library — SLP Assist AI" }] }),
  component: LibraryIndex,
});

type Tone = "violet" | "green" | "amber" | "blue" | "pink";

const items: {
  to: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  tone: Tone;
}[] = [
  {
    to: "/library/case-history",
    label: "Case History Forms",
    desc: "Clinical templates and intake forms",
    icon: <ClipboardList className="h-5 w-5" />,
    tone: "violet",
  },
  {
    to: "/library/books",
    label: "Clinical Books",
    desc: "Medical and educational books",
    icon: <BookOpenText className="h-5 w-5" />,
    tone: "blue",
  },
  {
    to: "/library/research",
    label: "Research & PDFs",
    desc: "Articles, guidelines and manuals",
    icon: <FileText className="h-5 w-5" />,
    tone: "green",
  },
  {
    to: "/library/community",
    label: "Community Library",
    desc: "Shared resources from users",
    icon: <Users className="h-5 w-5" />,
    tone: "amber",
  },
  {
    to: "/library/downloads",
    label: "Downloads",
    desc: "Your saved offline files",
    icon: <Download className="h-5 w-5" />,
    tone: "blue",
  },
  {
    to: "/library/app-reference",
    label: "App Reference",
    desc: "Disorders, symptoms and assessments",
    icon: <Brain className="h-5 w-5" />,
    tone: "violet",
  },
  {
    to: "/library/uploads",
    label: "My Uploads",
    desc: "Manage your uploaded content",
    icon: <UploadCloud className="h-5 w-5" />,
    tone: "pink",
  },
];

const toneClasses: Record<Tone, string> = {
  violet: "bg-primary-soft text-primary",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-sky-100 text-sky-700",
  pink: "bg-pink-100 text-pink-700",
};

function LibraryIndex() {
  const [query, setQuery] = useState("");
  const filtered = items.filter(
    (i) =>
      !query.trim() ||
      i.label.toLowerCase().includes(query.toLowerCase()) ||
      i.desc.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell title="Library" subtitle="Resources & references">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search resources, books, PDFs..."
          className="h-11 rounded-2xl border-border bg-card pl-9 shadow-card"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition active:scale-[0.98]"
          >
            <span
              className={`grid h-10 w-10 place-items-center rounded-xl ${toneClasses[it.tone]}`}
            >
              {it.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{it.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{it.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No resources match “{query}”.
        </p>
      )}
    </AppShell>
  );
}
