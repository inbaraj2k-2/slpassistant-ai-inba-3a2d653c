-- AAC feature: user vocabulary, search history, and per-user settings.

-- 1) aac_vocabulary
CREATE TABLE public.aac_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  category text,
  emoji text,
  image_path text,     -- storage path within 'uploads' bucket (aac/{user_id}/...)
  image_url text,      -- external cached url (openverse thumb, etc.)
  source text NOT NULL DEFAULT 'user' CHECK (source IN ('user','ai','openverse','core')),
  is_favorite boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  use_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX aac_vocabulary_user_idx ON public.aac_vocabulary(user_id);
CREATE INDEX aac_vocabulary_user_label_idx ON public.aac_vocabulary(user_id, lower(label));
CREATE INDEX aac_vocabulary_user_recent_idx ON public.aac_vocabulary(user_id, last_used_at DESC NULLS LAST);
CREATE INDEX aac_vocabulary_keywords_gin ON public.aac_vocabulary USING gin (keywords);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aac_vocabulary TO authenticated;
GRANT ALL ON public.aac_vocabulary TO service_role;

ALTER TABLE public.aac_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own vocab" ON public.aac_vocabulary
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own vocab" ON public.aac_vocabulary
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vocab" ON public.aac_vocabulary
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vocab" ON public.aac_vocabulary
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER aac_vocabulary_updated_at
  BEFORE UPDATE ON public.aac_vocabulary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) aac_search_history
CREATE TABLE public.aac_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  chosen_vocab_id uuid REFERENCES public.aac_vocabulary(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX aac_search_history_user_idx ON public.aac_search_history(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.aac_search_history TO authenticated;
GRANT ALL ON public.aac_search_history TO service_role;

ALTER TABLE public.aac_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own history" ON public.aac_search_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own history" ON public.aac_search_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own history" ON public.aac_search_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3) aac_settings
CREATE TABLE public.aac_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_rate real NOT NULL DEFAULT 0.95,
  voice_pitch real NOT NULL DEFAULT 1.0,
  high_contrast boolean NOT NULL DEFAULT false,
  large_targets boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'default' CHECK (mode IN ('default','therapist','parent','child')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aac_settings TO authenticated;
GRANT ALL ON public.aac_settings TO service_role;

ALTER TABLE public.aac_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings" ON public.aac_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER aac_settings_updated_at
  BEFORE UPDATE ON public.aac_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Realtime for cross-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.aac_vocabulary;