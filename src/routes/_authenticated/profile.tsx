import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useInvalidateProfile } from "@/hooks/useProfile";
import { pickProfileImage, type PickerSource } from "@/lib/imagePicker";
import { invalidateAvatarCache } from "@/lib/avatar";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Your Profile — SLP Assist AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const invalidate = useInvalidateProfile();

  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<null | "upload" | "remove">(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (!profile || initialised.current) return;
    setDisplayName(profile.displayName || "");
    setFullName(profile.fullName || "");
    setClinicName(profile.clinicName || "");
    initialised.current = true;
  }, [profile]);

  function flash(kind: "ok" | "err", text: string) {
    setMsg({ kind, text });
    window.setTimeout(() => setMsg(null), 2600);
  }

  async function changePhoto(source: PickerSource) {
    if (!profile) return;
    setPhotoBusy("upload");
    try {
      const picked = await pickProfileImage(source);
      if (!picked) return;
      const ext = picked.extension === "jpeg" ? "jpg" : picked.extension;
      const path = `avatars/${profile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("uploads")
        .upload(path, picked.blob, { contentType: picked.mimeType, upsert: true });
      if (upErr) throw upErr;

      // Best-effort: delete previous avatar file to keep storage clean.
      if (profile.avatarPath && profile.avatarPath !== path) {
        await supabase.storage.from("uploads").remove([profile.avatarPath]).catch(() => {});
      }

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_path: path, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (dbErr) throw dbErr;

      invalidateAvatarCache();
      invalidate();
      flash("ok", "Profile photo updated.");
    } catch (err) {
      flash("err", err instanceof Error ? err.message : "Failed to update photo.");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function removePhoto() {
    if (!profile) return;
    setPhotoBusy("remove");
    try {
      if (profile.avatarPath) {
        await supabase.storage.from("uploads").remove([profile.avatarPath]).catch(() => {});
      }
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_path: null, avatar_url: null, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (error) throw error;
      invalidateAvatarCache();
      invalidate();
      flash("ok", "Profile photo removed.");
    } catch (err) {
      flash("err", err instanceof Error ? err.message : "Failed to remove photo.");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          full_name: fullName.trim() || null,
          clinic_name: clinicName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
      if (error) throw error;
      invalidate();
      flash("ok", "Profile saved.");
    } catch (err) {
      flash("err", err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Your Profile" subtitle="Displayed across the app" back>
      <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-4">
          <UserAvatar
            src={profile?.avatarUrl}
            name={profile?.displayName}
            email={profile?.email}
            className="h-20 w-20 rounded-2xl text-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{profile?.displayName || "…"}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <PhotoBtn
            onClick={() => changePhoto("gallery")}
            disabled={photoBusy !== null}
            icon={<ImageIcon className="h-4 w-4" />}
            label="Gallery"
          />
          <PhotoBtn
            onClick={() => changePhoto("camera")}
            disabled={photoBusy !== null}
            icon={<Camera className="h-4 w-4" />}
            label="Camera"
          />
          <PhotoBtn
            onClick={removePhoto}
            disabled={photoBusy !== null || !profile?.avatarPath}
            icon={<Trash2 className="h-4 w-4" />}
            label="Remove"
            destructive
          />
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
          Profile Information
        </h3>
        <Field
          label="Display name"
          value={displayName}
          onChange={setDisplayName}
          placeholder="How your name appears in the app"
          disabled={isLoading}
        />
        <Field
          label="Full name"
          value={fullName}
          onChange={setFullName}
          placeholder="Your legal or professional name"
          disabled={isLoading}
        />
        <Field
          label="Clinic or organisation"
          value={clinicName}
          onChange={setClinicName}
          placeholder="Optional"
          disabled={isLoading}
        />
        <Field label="Email" value={profile?.email ?? ""} onChange={() => {}} disabled readOnly />
      </section>

      {msg && (
        <div
          role="status"
          className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium ${
            msg.kind === "ok"
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        onClick={saveProfile}
        disabled={saving}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving…" : "Save changes"}
      </button>

      <button
        onClick={() => navigate({ to: "/settings" })}
        className="mt-2 h-10 w-full rounded-xl border border-border text-sm font-medium text-muted-foreground"
      >
        Back to Settings
      </button>
    </AppShell>
  );
}

function PhotoBtn({
  onClick,
  disabled,
  icon,
  label,
  destructive,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-[11px] font-semibold transition disabled:opacity-40 ${
        destructive
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-secondary/40 text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="mb-3 block last:mb-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
      />
    </label>
  );
}
