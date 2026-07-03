import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/legal/account-deletion")({
  head: () => ({ meta: [{ title: "Account Deletion — SLP Assist AI" }] }),
  component: AccountDeletionPage,
});

function AccountDeletionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runDelete = useServerFn(deleteMyAccount);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await runDelete({});
      toast.success("Your account and data have been permanently deleted.");
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
      setLoading(false);
    }
  }

  return (
    <AppShell title="Account Deletion" back>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">This action is permanent</p>
            <p className="mt-1 text-foreground/80">
              Deleting your account cannot be undone. All of the following data will
              be permanently erased.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 text-sm shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-primary">What gets deleted</h2>
          <ul className="ml-4 list-disc space-y-1.5 text-foreground/85">
            <li>Your account and profile</li>
            <li>All saved cases and AI-generated reports</li>
            <li>All files you have uploaded</li>
            <li>All personal data associated with your account</li>
          </ul>
        </section>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="h-11 w-full"
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
              {loading ? "Deleting..." : "Delete my account permanently"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove your account, saved cases, reports,
                and uploaded files. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, delete everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
