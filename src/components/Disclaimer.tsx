import { ShieldAlert } from "lucide-react";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-foreground/80">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
      <p className="leading-relaxed">
        <span className="font-semibold">AI Disclaimer:</span>{" "}
        {compact
          ? "Educational decision support only. Not a confirmed diagnosis."
          : "This application is for educational and clinical decision support purposes only. All outputs are AI-generated suggestions and must not be considered a confirmed diagnosis."}
      </p>
    </div>
  );
}
