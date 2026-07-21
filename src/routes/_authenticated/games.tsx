import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Boxes,
  Brain,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  RotateCcw,
  Shuffle,
  Sparkles,
  SkipForward,
  Volume2,
} from "lucide-react";
import { ARTIC_SOUNDS, emojiFor, SORT_CATEGORIES, SORT_ITEMS, type SortCategory } from "@/lib/games-data";

export const Route = createFileRoute("/_authenticated/games")({
  head: () => ({ meta: [{ title: "Games — SLP Assist AI" }] }),
  component: GamesPage,
});

type GameKey = "flashcards" | "memory" | "sorting" | null;

function GamesPage() {
  const [active, setActive] = useState<GameKey>(null);

  if (active) {
    return (
      <AppShell
        title={
          active === "flashcards"
            ? "Articulation Flashcards"
            : active === "memory"
            ? "Memory Match"
            : "Category Sorting"
        }
        subtitle="Offline activity"
        back
      >
        <Button variant="ghost" size="sm" onClick={() => setActive(null)} className="mb-3 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          All games
        </Button>
        {active === "flashcards" && <Flashcards />}
        {active === "memory" && <MemoryMatch />}
        {active === "sorting" && <CategorySorting />}
      </AppShell>
    );
  }

  return (
    <AppShell title="Games" subtitle="Therapeutic & fun activities" back>
      <div className="grid gap-3">
        <GameTile
          icon={<Sparkles className="h-5 w-5" />}
          title="Articulation Flashcards"
          desc="20 target sounds · initial, medial & final positions."
          onClick={() => setActive("flashcards")}
        />
        <GameTile
          icon={<Brain className="h-5 w-5" />}
          title="Memory Match"
          desc="Easy, Medium & Hard levels with timer & best score."
          onClick={() => setActive("memory")}
        />
        <GameTile
          icon={<Boxes className="h-5 w-5" />}
          title="Category Sorting"
          desc="11 categories · accuracy tracking & final score."
          onClick={() => setActive("sorting")}
        />
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Gamepad2 className="h-3.5 w-3.5" />
        All games work offline — no external services.
      </p>
    </AppShell>
  );
}

function GameTile({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition active:scale-[0.99]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

/* ---------------- Articulation Flashcards ---------------- */
type Position = "initial" | "medial" | "final";
type Card = { sound: string; position: Position; word: string; sentence: string };

const SOUND_KEYS = Object.keys(ARTIC_SOUNDS);
const POSITIONS: Position[] = ["initial", "medial", "final"];

function labelForSound(s: string) {
  if (s === "TH_voiced") return "TH (voiced)";
  if (s === "TH_voiceless") return "TH (voiceless)";
  return s;
}

function buildDeck(sound: string, position: Position | "all"): Card[] {
  const positions: Position[] = position === "all" ? POSITIONS : [position];
  const cards: Card[] = [];
  for (const p of positions) {
    for (const word of ARTIC_SOUNDS[sound][p]) {
      cards.push({
        sound,
        position: p,
        word,
        sentence: `Say the word ${word}.`,
      });
    }
  }
  return cards;
}

import { speakText } from "@/lib/native";

function speak(text: string) {
  void speakText(text);
}

function Flashcards() {
  const [sound, setSound] = useState<string>("S");
  const [position, setPosition] = useState<Position | "all">("all");
  const deck = useMemo(() => buildDeck(sound, position), [sound, position]);
  const [i, setI] = useState(0);

  useEffect(() => setI(0), [sound, position]);

  const card = deck[i];
  const emoji = emojiFor(card.word);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SOUND_KEYS.map((s) => (
          <button
            key={s}
            onClick={() => setSound(s)}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
              sound === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {labelForSound(s)}
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-1.5">
        {(["all", "initial", "medial", "final"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPosition(p)}
            className={`flex-1 rounded-full border px-2 py-1 text-xs font-medium capitalize transition ${
              position === p
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {labelForSound(card.sound)} · {card.position}
        </p>
        <div className="mx-auto mt-4 grid h-32 w-32 place-items-center rounded-2xl bg-primary-soft text-6xl">
          {emoji ?? (
            <span className="text-4xl font-bold text-primary">{card.word.charAt(0)}</span>
          )}
        </div>
        <p className="mt-4 text-4xl font-bold">{card.word}</p>
        <p className="mt-2 text-sm text-muted-foreground">{card.sentence}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => speak(card.word + ". " + card.sentence)}
        >
          <Volume2 className="h-4 w-4" />
          Say it
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setI((n) => (n - 1 + deck.length) % deck.length)}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {i + 1} / {deck.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setI(Math.floor(Math.random() * deck.length))}
            aria-label="Random"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setI((n) => (n + 1) % deck.length)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Memory Match ---------------- */
type MemoryCard = { id: number; value: string; flipped: boolean; matched: boolean };
type Level = "easy" | "medium" | "hard";
const LEVEL_PAIRS: Record<Level, number> = { easy: 4, medium: 8, hard: 12 };
const EMOJI_POOL = ["🐶","🐱","🐰","🦊","🐼","🐸","🦁","🐵","🐨","🐷","🐮","🐴","🦄","🐔","🦉","🐢","🐙","🐝","🦋","🐞","🦕","🦖","🐟","🐳"];

function shuffleDeck(level: Level): MemoryCard[] {
  const pairs = EMOJI_POOL.slice(0, LEVEL_PAIRS[level]);
  return [...pairs, ...pairs]
    .map((v, i) => ({ id: i, value: v, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5);
}

function MemoryMatch() {
  const [level, setLevel] = useState<Level>("easy");
  const [cards, setCards] = useState<MemoryCard[]>(() => shuffleDeck("easy"));
  const [pick, setPick] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const flipTimerRef = useRef<number | null>(null);

  const won = useMemo(() => cards.length > 0 && cards.every((c) => c.matched), [cards]);

  const bestKey = (l: Level) => `mm-best-${l}`;
  const [best, setBest] = useState<{ moves: number; time: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(bestKey(level));
      setBest(raw ? JSON.parse(raw) : null);
    } catch {
      setBest(null);
    }
  }, [level]);

  useEffect(() => {
    if (!running) return;
    timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [running]);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (won) {
      setRunning(false);
      try {
        const raw = localStorage.getItem(bestKey(level));
        const prev = raw ? (JSON.parse(raw) as { moves: number; time: number }) : null;
        const better =
          !prev || moves < prev.moves || (moves === prev.moves && elapsed < prev.time);
        if (better) {
          const next = { moves, time: elapsed };
          localStorage.setItem(bestKey(level), JSON.stringify(next));
          setBest(next);
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const reset = (l: Level = level) => {
    setLevel(l);
    setCards(shuffleDeck(l));
    setPick([]);
    setMoves(0);
    setElapsed(0);
    setRunning(false);
  };

  const onFlip = (id: number) => {
    if (pick.length === 2) return;
    if (!running) setRunning(true);
    setCards((cs) => cs.map((c) => (c.id === id && !c.matched ? { ...c, flipped: true } : c)));
    const next = [...pick, id];
    setPick(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      const av = cards.find((c) => c.id === a)?.value;
      const bv = cards.find((c) => c.id === b)?.value;
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
      flipTimerRef.current = window.setTimeout(() => {
        setCards((cs) =>
          cs.map((c) => {
            if (c.id === a || c.id === b) {
              return av === bv
                ? { ...c, matched: true, flipped: true }
                : { ...c, flipped: false };
            }
            return c;
          }),
        );
        setPick([]);
        flipTimerRef.current = null;
      }, 700);
    }
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const gridCols =
    level === "easy" ? "grid-cols-4" : level === "medium" ? "grid-cols-4" : "grid-cols-6";

  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {(["easy", "medium", "hard"] as Level[]).map((l) => (
          <button
            key={l}
            onClick={() => reset(l)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
              level === l
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {l} · {LEVEL_PAIRS[l] * 2}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-xs shadow-card">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Time</p>
          <p className="font-mono text-base font-semibold">
            {mm}:{ss}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Moves</p>
          <p className="text-base font-semibold">{moves}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-muted-foreground">Best</p>
          <p className="text-sm font-semibold">
            {best ? `${best.moves} · ${String(Math.floor(best.time / 60)).padStart(2, "0")}:${String(best.time % 60).padStart(2, "0")}` : "—"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => reset()}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className={`grid ${gridCols} gap-2`}>
        {cards.map((c) => (
          <button
            key={c.id}
            disabled={c.flipped || c.matched}
            onClick={() => onFlip(c.id)}
            className={`aspect-square rounded-xl border shadow-card text-3xl transition ${
              c.flipped || c.matched
                ? "border-primary/40 bg-primary-soft"
                : "border-border bg-card"
            }`}
          >
            {c.flipped || c.matched ? c.value : ""}
          </button>
        ))}
      </div>

      {won && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary-soft p-4 text-center">
          <p className="text-sm font-semibold text-primary">🎉 Solved!</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {moves} moves · {mm}:{ss}
          </p>
          <Button size="sm" className="mt-3" onClick={() => reset()}>
            Play again
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Category Sorting ---------------- */
type SortItem = { name: string; category: SortCategory };

function buildSortPool(categories: SortCategory[], perCat = 10): SortItem[] {
  const pool: SortItem[] = [];
  for (const c of categories) {
    const items = [...SORT_ITEMS[c]].sort(() => Math.random() - 0.5).slice(0, perCat);
    for (const name of items) pool.push({ name, category: c });
  }
  return pool.sort(() => Math.random() - 0.5);
}

function CategorySorting() {
  const [selected, setSelected] = useState<SortCategory[]>(["Animals", "Foods", "Vehicles"]);
  const [remaining, setRemaining] = useState<SortItem[]>(() => buildSortPool(selected));
  const [placed, setPlaced] = useState<Record<string, number>>({});
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const current = remaining[0];
  const total = correct + wrong + skipped;
  const acc = total ? Math.round((correct / total) * 100) : 0;

  const start = (cats: SortCategory[]) => {
    setSelected(cats);
    setRemaining(buildSortPool(cats));
    setPlaced({});
    setCorrect(0);
    setWrong(0);
    setSkipped(0);
  };

  const pick = (cat: SortCategory) => {
    if (!current) return;
    if (current.category === cat) {
      setCorrect((s) => s + 1);
      setPlaced((p) => ({ ...p, [cat]: (p[cat] ?? 0) + 1 }));
    } else {
      setWrong((w) => w + 1);
    }
    setRemaining((r) => r.slice(1));
  };

  const skip = () => {
    if (!current) return;
    setSkipped((s) => s + 1);
    setRemaining((r) => r.slice(1));
  };

  const toggleCat = (c: SortCategory) => {
    const next = selected.includes(c)
      ? selected.filter((x) => x !== c)
      : [...selected, c];
    if (next.length >= 2 && next.length <= 4) start(next);
  };

  if (!current) {
    return (
      <div>
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <p className="text-sm font-semibold text-primary">All sorted! 🎉</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <Stat label="Correct" value={correct} />
            <Stat label="Wrong" value={wrong} />
            <Stat label="Accuracy" value={`${acc}%`} />
          </div>
          <Button className="mt-4" onClick={() => start(selected)}>
            <RotateCcw className="h-4 w-4" /> Play again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">Choose 2–4 categories</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SORT_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => toggleCat(c)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              selected.includes(c)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2 text-xs">
        <Stat label="Correct" value={correct} />
        <Stat label="Wrong" value={wrong} />
        <Stat label="Accuracy" value={`${acc}%`} />
        <Stat label="Left" value={remaining.length} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Where does this belong?
        </p>
        <p className="mt-3 text-3xl font-bold">{current.name}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {selected.map((cat) => (
          <button
            key={cat}
            onClick={() => pick(cat)}
            className="rounded-2xl border border-border bg-card p-3 text-sm font-semibold shadow-card"
          >
            {cat}
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              {placed[cat] ?? 0} placed
            </p>
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={skip}>
          <SkipForward className="h-4 w-4" /> Skip
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => start(selected)}>
          <RotateCcw className="h-4 w-4" /> Retry
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2 text-center shadow-card">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
