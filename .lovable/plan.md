
# Smart AAC Keyboard — Production Rebuild

Replace the current AAC Communicator with a search-driven, AI-assisted communication keyboard. Old tap-tile grid becomes a search-results grid; a static core-word row stays visible when the input is empty so users always have a starting point.

## What you'll see

```text
┌──────────────────────────────────────────────┐
│  I  want  🍎apple  ▍                         │  ← sentence strip (tap chip to edit/remove)
├──────────────────────────────────────────────┤
│  🔎 Type a word…                    [Speak]  │  ← native text input + fixed Speak
├──────────────────────────────────────────────┤
│  [🍎 apple] [🍏 green apple] [🎨 apple pie]  │
│  [📷 apple photo] [🍎 red apple] …           │  ← instant results grid
│                                              │
│  Nothing fits?   [ ✨ Generate with AI ]      │
├──────────────────────────────────────────────┤
│  Core: I  you  want  more  stop  help  yes…  │  ← shown when input is empty
├──────────────────────────────────────────────┤
│  ⌫ Delete                          Clear 🗑  │
└──────────────────────────────────────────────┘
```

Offline: a small "Offline" chip appears next to the input; results fall back to cached + user vocab; "Generate with AI" is disabled.

## Architecture (modular)

```text
src/features/aac/
  data/
    core-words.ts            // 20 fixed core tiles (offline-safe)
  engine/
    search.ts                // orchestrates providers by priority
    ranker.ts                // frecency + fuzzy scoring
    cache.ts                 // IndexedDB (idb-keyval) tile + thumb cache
  providers/
    userVocabProvider.ts     // Supabase aac_vocabulary
    coreProvider.ts          // built-in core words
    openverseProvider.ts     // https://api.openverse.org/v1/images
    aiSemanticProvider.ts    // Lovable AI chat, expands query → related terms
  ai/
    generateSymbol.ts        // calls /api/aac-generate-image (server route)
  ui/
    SmartKeyboard.tsx        // input + Speak
    SentenceStrip.tsx        // chips, reorder, tap-to-edit
    ResultsGrid.tsx          // tiles + Generate-with-AI CTA
    CoreRow.tsx              // shown when input empty
    VocabEditorSheet.tsx     // rename/upload/replace/favorite/delete
  hooks/
    useInstantSearch.ts      // debounced 120ms, aborts stale requests
    useOnline.ts (reuse)
    useVocabSync.ts          // realtime Supabase subscription
  types.ts
```

The existing `/clinical-tools/aac` route swaps its component to `<SmartKeyboard />`. Nothing else in the app changes.

## Backend

New migration (single call, includes GRANTs + RLS):

- `aac_vocabulary` — user-owned words: `label`, `keywords[]`, `category`, `image_path` (storage), `image_url` (external cache), `source` (`user|ai|openverse|core`), `is_favorite`, `pinned`, `use_count`, `last_used_at`.
- `aac_search_history` — for prediction: `user_id`, `query`, `chosen_vocab_id`, `created_at`.
- `aac_settings` — per user: `voice_rate`, `voice_pitch`, `high_contrast`, `large_targets`.
- Reuse existing `uploads` bucket under a `aac/{user_id}/` prefix for user photos and AI-generated PNGs.
- Realtime enabled on `aac_vocabulary` for cross-device sync.

New server route `src/routes/api/aac-generate-image.ts` (public /api/, bearer-verified):
- Calls Lovable AI `openai/gpt-image-1-mini` with a locked flat-symbol style prompt (white bg, bold outline, single centered object, no text, no copyrighted characters).
- Uploads PNG to `uploads` bucket, inserts into `aac_vocabulary` with `source='ai'`, returns the row.

## Search priority (engine/search.ts)

For every keystroke (debounced 120ms, previous request aborted):

1. `userVocabProvider` — exact + fuzzy on label/keywords.
2. `cache` — recent Openverse results keyed by normalized query.
3. `coreProvider` — matches from core-word list.
4. `openverseProvider` — online only; `page_size=12`, license=CC0/CC-BY, safe search on.
5. `aiSemanticProvider` — only when < 3 results after 400ms: asks Lovable AI (`google/gemini-3.1-flash-lite`) to return 6 related concepts as JSON, each re-queried through Openverse. Cheap, cached per query.

Never auto-inserts. Grid always shows a "Generate with AI" tile as the last cell when online and < 8 results.

`ranker.ts` combines: exact-prefix > fuzzy score > frecency (use_count × recency decay) > pinned > favorite.

## Native keyboard fix (Phase 1)

Replaces the current broken input with a controlled `<input type="text" inputMode="search" autoCapitalize="none" autoCorrect="off" enterKeyHint="search" />` inside a fixed bottom bar. `useInstantSearch` runs on `onChange` — no Enter needed. On Capacitor: `Keyboard.setResizeMode({ mode: 'body' })` (already configured) + `Keyboard.setAccessoryBarVisible({ isVisible: false })`. Verified on Android WebView, iOS Safari, desktop.

## Sentence builder

`SentenceStrip` state = `{ id, label, emoji|image_url, speak }[]`.
- Tap tile in results → append + speak the single word.
- Tap chip → open edit menu (replace image, edit text, remove).
- Long-press chip → drag to reorder (dnd-kit, already viable in project size).
- Speak button uses existing `speakText()` from `src/lib/native.ts` on the joined sentence.

## Offline

- `core-words.ts` is bundled (no network).
- `aac_vocabulary` + recent Openverse thumbs cached in IndexedDB via `idb-keyval` (small dep) with an LRU cap (300 items).
- `useOnline()` hides Openverse/AI providers; shows "Offline" chip; disables Generate button with tooltip.
- Existing `kb-snapshot` build already ships offline core; we hook into the same pattern.

## Cloud sync

- All mutations go through `createServerFn` with `requireSupabaseAuth`.
- `useVocabSync` subscribes to `postgres_changes` on `aac_vocabulary` filtered by `user_id` — favorites, uploads, AI images, deletes propagate instantly to other devices.
- Settings stored in `aac_settings`, hydrated once on mount.

## Accessibility

- Min 56px touch targets, 64px in "large targets" mode.
- High-contrast theme via existing tokens (`--aac-*` added to `src/styles.css`).
- `aria-label` on every tile, `role="listbox"` on results grid.
- Screen reader announces chip additions.

## Performance targets

- Debounce 120ms; cached results < 50ms; Openverse < 800ms typical.
- Openverse thumbnails only (200px); full-res fetched only when saved to vocab.
- `React.lazy` split for `VocabEditorSheet`.
- Aborted fetches on new keystroke.

## Dependencies to add

- `idb-keyval` (small IndexedDB helper)
- `@dnd-kit/core` + `@dnd-kit/sortable` (chip reorder)
- `fuse.js` (fuzzy matching on local vocab)
- No new native plugins.

## Rollout order

1. **Phase A — DB + backend**: migration for the 3 tables + storage prefix + server route for AI generation.
2. **Phase B — Engine + providers**: search orchestrator, Openverse client, cache, ranker (with unit-style manual verification via preview).
3. **Phase C — UI**: SmartKeyboard, SentenceStrip, ResultsGrid, CoreRow, VocabEditorSheet. Wire into existing `/clinical-tools/aac` route.
4. **Phase D — Offline + sync**: IndexedDB layer, `useVocabSync`, offline indicator.
5. **Phase E — Polish**: accessibility pass, settings, Android version bump (`versionCode 8 → 9`, `versionName 1.0.7 → 1.0.8`) and AAB trigger.

## Out of scope (explicit)

- Role-based Therapist/Parent/Child modes — architecture supports it (permissions on `aac_vocabulary`), but no UI in this pass; documented as future switch on `aac_settings.mode`.
- Pixabay/Unsplash — Openverse only per your choice; adding another provider is a single new file in `providers/` later.

Approve to build in the order above; I'll ship each phase end-to-end before moving to the next.
