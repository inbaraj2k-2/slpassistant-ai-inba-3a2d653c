import jsPDF from "jspdf";
import type { AnalysisResult } from "./analyze.functions";
import { downloadToDevice, isNative } from "./native";

interface CaseLike {
  name: string;
  age: string | null;
  gender: string | null;
  chief_complaint: string | null;
  prenatal_history: string | null;
  natal_history: string | null;
  postnatal_history: string | null;
  motor_milestones: string | null;
  speech_milestones: string | null;
  language_history: string | null;
  hearing_history: string | null;
  education_history: string | null;
  family_history: string | null;
  additional_notes: string | null;
  analysis: AnalysisResult | null;
  created_at: string;
}

export async function exportCasePDF(c: CaseLike) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ensure = (lines = 1, lh = 14) => {
    if (y + lines * lh > H - M) {
      doc.addPage();
      y = M;
    }
  };

  // Header band
  doc.setFillColor(91, 33, 182);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SLP Assist AI", M, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Clinical Decision Support — Draft Report", M, 58);
  y = 100;

  doc.setTextColor(20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Case: ${c.name}`, M, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(
    `Age: ${c.age || "—"}    Gender: ${c.gender || "—"}    Date: ${new Date(c.created_at).toLocaleDateString()}`,
    M,
    y,
  );
  y += 20;

  // Case Summary
  sectionHeader(doc, "Case Summary", M, (val) => (y = val), () => y);
  const histFields: [string, string | null][] = [
    ["Chief Complaint", c.chief_complaint],
    ["Prenatal", c.prenatal_history],
    ["Natal", c.natal_history],
    ["Postnatal", c.postnatal_history],
    ["Motor Milestones", c.motor_milestones],
    ["Speech Milestones", c.speech_milestones],
    ["Language History", c.language_history],
    ["Hearing History", c.hearing_history],
    ["Education", c.education_history],
    ["Family", c.family_history],
    ["Additional Notes", c.additional_notes],
  ];
  doc.setFontSize(10);
  for (const [k, v] of histFields) {
    if (!v) continue;
    ensure(2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60);
    doc.text(`${k}:`, M, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30);
    const wrapped = doc.splitTextToSize(v, W - 2 * M - 90);
    doc.text(wrapped, M + 90, y);
    y += Math.max(14, wrapped.length * 12) + 4;
  }

  const a = c.analysis;
  if (a) {
    y += 6;
    sectionHeader(doc, "Possible Conditions", M, (val) => (y = val), () => y);
    doc.setFontSize(10);
    for (const cond of a.possible_conditions) {
      ensure(3);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text(`${cond.name}  (${cond.confidence}% match)`, M, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70);
      const lines = doc.splitTextToSize(cond.rationale, W - 2 * M);
      doc.text(lines, M, y);
      y += lines.length * 12 + 6;
    }

    bulletSection(doc, "Recommended Assessments", a.recommended_assessments, M, (val) => (y = val), () => y, W, H);
    bulletSection(doc, "Materials Required", a.materials_required, M, (val) => (y = val), () => y, W, H);
    bulletSection(doc, "Suggested Therapy Goals", a.therapy_goals, M, (val) => (y = val), () => y, W, H);
    if (a.differential_diagnoses?.length)
      bulletSection(doc, "Differential Diagnoses", a.differential_diagnoses, M, (val) => (y = val), () => y, W, H);
  }

  // Disclaimer footer on last page
  if (y > H - 120) {
    doc.addPage();
    y = M;
  }
  y = Math.max(y, H - 130);
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(140, 70, 0);
  doc.text("AI Disclaimer", M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  const disc = doc.splitTextToSize(
    "This report is for educational and clinical decision support purposes only. All outputs are AI-generated suggestions and must not be considered a confirmed diagnosis. Always corroborate findings with direct clinical assessment and licensed clinician judgment.",
    W - 2 * M,
  );
  doc.text(disc, M, y);

  doc.save(`SLP-Assist-${c.name.replace(/\s+/g, "_")}.pdf`);
}

function sectionHeader(
  doc: jsPDF,
  title: string,
  M: number,
  setY: (n: number) => void,
  getY: () => number,
) {
  let y = getY();
  doc.setFillColor(243, 232, 255);
  doc.rect(M - 6, y - 12, doc.internal.pageSize.getWidth() - 2 * (M - 6), 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(91, 33, 182);
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), M, y + 2);
  y += 18;
  setY(y);
}

function bulletSection(
  doc: jsPDF,
  title: string,
  items: string[],
  M: number,
  setY: (n: number) => void,
  getY: () => number,
  W: number,
  H: number,
) {
  if (!items?.length) return;
  let y = getY() + 8;
  if (y > H - 80) {
    doc.addPage();
    y = M;
  }
  setY(y);
  sectionHeader(doc, title, M, setY, getY);
  y = getY();
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30);
  for (const it of items) {
    const lines = doc.splitTextToSize(`• ${it}`, W - 2 * M);
    if (y + lines.length * 12 > H - 60) {
      doc.addPage();
      y = M;
    }
    doc.text(lines, M, y);
    y += lines.length * 12 + 2;
  }
  setY(y);
}
