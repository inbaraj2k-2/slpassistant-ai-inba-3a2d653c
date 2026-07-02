import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Boxes,
  Brain,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Sparkles,
  Volume2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/games")({
  head: () => ({ meta: [{ title: "Games — SLP Assist AI" }] }),
  component: GamesPage,
});

type GameKey = "flashcards" | "memory" | "sorting" | null;

// Local JSON — no external APIs
const FLASHCARDS = [
  { sound: "S", word: "Sun", sentence: "The sun is shining today." },
  { sound: "S", word: "Snake", sentence: "The snake slid slowly." },
  { sound: "R", word: "Rabbit", sentence: "The rabbit runs really fast." },
  { sound: "R", word: "Rainbow", sentence: "A rainbow appeared after the rain." },
  { sound: "L", word: "Lion", sentence: "The lion licks its paw." },
  { sound: "L", word: "Lemon", sentence: "I like lemon lollipops." },
  { sound: "SH", word: "Ship", sentence: "The ship sails on the sea." },
  { sound: "TH", word: "Thumb", sentence: "Show me your thumb." },
  { sound: "K", word: "Kite", sentence: "Kevin flies a colorful kite." },
  { sound: "F", word: "Fish", sentence: "Four fish swam in the pond." },
];

const MEMORY_PAIRS = ["🐶", "🐱", "🐰", "🦊", "🐼", "🐸", "🦁", "🐵"];

const SORTING_ITEMS: { name: string; category: "Animals" | "Foods" | "Vehicles" }[] = [
  { name: "Apple", category: "Foods" },
  { name: "Banana", category: "Foods" },
  { name: "Bread", category: "Foods" },
  { name: "Dog", category: "Animals" },
  { name: "Cat", category: "Animals" },
  { name: "Elephant", category: "Animals" },
  { name: "Car", category: "Vehicles" },
  { name: "Bus", category: "Vehicles" },
  { name: "Plane", category: "Vehicles" },
];

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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActive(null)}
          className="mb-3 -ml-2"
        >
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
          desc="Practice target sounds with words and sentences."
          onClick={() => setActive("flashcards")}
        />
        <GameTile
          icon={<Brain className="h-5 w-5" />}
          title="Memory Match"
          desc="Flip cards and find matching pairs."
          onClick={() => setActive("memory")}
        />
        <GameTile
          icon={<Boxes className="h-5 w-5" />}
          title="Category Sorting"
          desc="Sort items into the right category."
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
function Flashcards() {
  const [i, setI] = useState(0);
  const card = FLASHCARDS[i];
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };
  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Target sound · {card.sound}
        </p>
        <p className="mt-3 text-4xl font-bold">{card.word}</p>
        <p className="mt-3 text-sm text-muted-foreground">{card.sentence}</p>
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
      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setI((n) => (n - 1 + FLASHCARDS.length) % FLASHCARDS.length)}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="text-xs text-muted-foreground">
          {i + 1} / {FLASHCARDS.length}
        </span>
        <Button variant="ghost" onClick={() => setI((n) => (n + 1) % FLASHCARDS.length)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Memory Match ---------------- */
type MemoryCard = { id: number; value: string; flipped: boolean; matched: boolean };
function MemoryMatch() {
  const [cards, setCards] = useState<MemoryCard[]>(() => shuffleMemory());
  const [pick, setPick] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const won = useMemo(() => cards.every((c) => c.matched), [cards]);

  function shuffleMemory(): MemoryCard[] {
    const deck = [...MEMORY_PAIRS, ...MEMORY_PAIRS]
      .map((v, i) => ({ id: i, value: v, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);
    return deck;
  }

  const onFlip = (id: number) => {
    if (pick.length === 2) return;
    setCards((cs) => cs.map((c) => (c.id === id && !c.matched ? { ...c, flipped: true } : c)));
    const next = [...pick, id];
    setPick(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      const av = cards.find((c) => c.id === a)?.value;
      const bv = cards.find((c) => c.id === b)?.value;
      setTimeout(() => {
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
      }, 700);
    }
  };

  const reset = () => {
    setCards(shuffleMemory());
    setPick([]);
    setMoves(0);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Moves: {moves}</p>
        <Button variant="outline" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
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
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary-soft p-4 text-center text-sm font-semibold text-primary">
          🎉 You matched them all in {moves} moves!
        </div>
      )}
    </div>
  );
}

/* ---------------- Category Sorting ---------------- */
function CategorySorting() {
  const [remaining, setRemaining] = useState(() =>
    [...SORTING_ITEMS].sort(() => Math.random() - 0.5),
  );
  const [placed, setPlaced] = useState<Record<string, string[]>>({
    Animals: [],
    Foods: [],
    Vehicles: [],
  });
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const current = remaining[0];

  const pick = (cat: "Animals" | "Foods" | "Vehicles") => {
    if (!current) return;
    if (current.category === cat) {
      setScore((s) => s + 1);
      setPlaced((p) => ({ ...p, [cat]: [...p[cat], current.name] }));
    } else {
      setWrong((w) => w + 1);
    }
    setRemaining((r) => r.slice(1));
  };

  const reset = () => {
    setRemaining([...SORTING_ITEMS].sort(() => Math.random() - 0.5));
    setPlaced({ Animals: [], Foods: [], Vehicles: [] });
    setScore(0);
    setWrong(0);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Correct: <b className="text-foreground">{score}</b> · Wrong:{" "}
          <b className="text-foreground">{wrong}</b>
        </span>
        <Button variant="outline" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        {current ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Where does this belong?
            </p>
            <p className="mt-3 text-3xl font-bold">{current.name}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-primary">All sorted! 🎉</p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(["Animals", "Foods", "Vehicles"] as const).map((cat) => (
          <button
            key={cat}
            disabled={!current}
            onClick={() => pick(cat)}
            className="rounded-2xl border border-border bg-card p-3 text-sm font-semibold shadow-card disabled:opacity-50"
          >
            {cat}
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              {placed[cat].length} placed
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
