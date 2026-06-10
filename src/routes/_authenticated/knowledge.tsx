import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Beaker, BookOpen, MessageSquare, Mic, Package, Search, Target, Wind } from "lucide-react";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge Base — SLP Assist AI" }] }),
  component: KnowledgePage,
});

type Category = {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: { title: string; body: string }[];
};

const CATEGORIES: Category[] = [
  {
    key: "speech",
    label: "Speech Disorders",
    icon: <Mic className="h-4 w-4" />,
    items: [
      {
        title: "Articulation Disorder",
        body: "Difficulty producing speech sounds (substitutions, omissions, distortions). Assess with GFTA-3 or Diagnostic Articulation Test. Therapy focuses on auditory discrimination and motor placement.",
      },
      {
        title: "Phonological Disorder",
        body: "Patterned sound errors (e.g., fronting, stopping, cluster reduction). Assess with Khan-Lewis Phonological Analysis. Use cycles or minimal-pair approach.",
      },
      {
        title: "Childhood Apraxia of Speech",
        body: "Motor planning disorder; inconsistent errors, vowel distortions, prosody issues. Use DEMSS / motor-based DTTC therapy.",
      },
      {
        title: "Dysarthria",
        body: "Neuromuscular speech weakness affecting respiration, phonation, articulation, prosody. Assess with Frenchay Dysarthria Assessment.",
      },
      {
        title: "Stuttering",
        body: "Disfluency in rate/rhythm. Use SSI-4 for severity. Therapy: fluency shaping, stuttering modification, Lidcombe (pediatric).",
      },
    ],
  },
  {
    key: "language",
    label: "Language Disorders",
    icon: <MessageSquare className="h-4 w-4" />,
    items: [
      {
        title: "Developmental Language Disorder",
        body: "Persistent language impairment without known etiology. Assess with CELF-5, REELS. Target morphosyntax, vocabulary, narrative skills.",
      },
      {
        title: "Aphasia",
        body: "Acquired language disorder post-stroke / brain injury. Assess with WAB-R or Boston Naming Test. Therapy: SFA, MIT, script training.",
      },
      {
        title: "Autism Spectrum Disorder",
        body: "Social communication challenges, restricted interests. Use CARS / ADOS-2 referral. SLP targets joint attention, pragmatics, AAC if needed.",
      },
      {
        title: "Selective Mutism",
        body: "Consistent failure to speak in specific social situations. Multi-disciplinary; gradual stimulus fading.",
      },
    ],
  },
  {
    key: "voice",
    label: "Voice & Resonance",
    icon: <Wind className="h-4 w-4" />,
    items: [
      {
        title: "Voice Disorders",
        body: "Hoarseness, breathiness, hard glottal attacks. Assess with CAPE-V, GRBAS, acoustic + aerodynamic measures. Vocal hygiene + resonant voice therapy.",
      },
      {
        title: "Resonance / Cleft Palate",
        body: "Hypernasality, nasal emission, compensatory articulation. Use Bzoch Error Pattern, nasometry. Coordinate with surgical/prosthodontic team.",
      },
      {
        title: "Hearing Loss Related Speech",
        body: "Reduced sound inventory, prosody issues. Coordinate audiologic management (HA/CI). Auditory-verbal therapy.",
      },
    ],
  },
  {
    key: "assess",
    label: "Assessment Tools",
    icon: <Beaker className="h-4 w-4" />,
    items: [
      { title: "REELS", body: "Receptive-Expressive Emergent Language Scale (0–3 yrs)." },
      { title: "CELF-5", body: "Clinical Evaluation of Language Fundamentals (5–21 yrs)." },
      { title: "GFTA-3", body: "Goldman-Fristoe Test of Articulation." },
      { title: "PPVT-5", body: "Peabody Picture Vocabulary Test — receptive vocab." },
      { title: "SSI-4", body: "Stuttering Severity Instrument." },
      { title: "CAPE-V", body: "Consensus Auditory-Perceptual Evaluation of Voice." },
      { title: "Pure-tone audiometry / OAE / ABR", body: "Core audiology test battery." },
    ],
  },
  {
    key: "materials",
    label: "Therapy Materials",
    icon: <Package className="h-4 w-4" />,
    items: [
      { title: "Articulation card decks", body: "Initial/medial/final position picture cards." },
      { title: "Oromotor kit", body: "Tongue depressors, mirror, straws, bubble blower." },
      { title: "AAC tools", body: "Low-tech PECS boards, high-tech speech-generating apps." },
      { title: "Phonology minimal-pair sets", body: "Targeted contrast cards." },
      { title: "Narrative kits", body: "Sequencing cards, story grammar mats." },
    ],
  },
  {
    key: "goals",
    label: "Therapy Goals",
    icon: <Target className="h-4 w-4" />,
    items: [
      { title: "Articulation", body: "Produce /target/ in initial position in 8/10 trials across 3 sessions." },
      { title: "Language", body: "Use 3-word combinations in spontaneous play in 80% of opportunities." },
      { title: "Fluency", body: "Use easy onset technique with <3% SLD in structured tasks." },
      { title: "Voice", body: "Maintain resonant voice quality for 5 minutes of connected speech." },
      { title: "Pragmatics", body: "Initiate joint attention with adult 4/5 opportunities per session." },
    ],
  },
];

function KnowledgePage() {
  const [active, setActive] = useState(CATEGORIES[0].key);
  const [q, setQ] = useState("");
  const cat = CATEGORIES.find((c) => c.key === active)!;
  const filtered = cat.items.filter(
    (i) =>
      !q ||
      i.title.toLowerCase().includes(q.toLowerCase()) ||
      i.body.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell title="Knowledge Base" subtitle="Quick clinical reference">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search topics, tools, materials…"
          className="h-11 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm shadow-card outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="-mx-4 mb-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition ${
                active === c.key
                  ? "bg-gradient-primary text-primary-foreground shadow-card"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-3">
        {filtered.map((i) => (
          <li key={i.title} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="mb-1.5 flex items-center gap-2 text-primary">
              <BookOpen className="h-4 w-4" />
              <h3 className="text-sm font-semibold">{i.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{i.body}</p>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No entries match "{q}".
          </li>
        )}
      </ul>
    </AppShell>
  );
}
