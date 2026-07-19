#!/usr/bin/env node
/**
 * Snapshot the clinical Knowledge Base from Supabase to public/kb-snapshot.json
 * so the Android app and any offline visitor can read it without a network round trip.
 *
 * Runs before vite build. Non-fatal on failure — the app falls back to a live
 * network fetch if the snapshot is missing or stale.
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://secxdvsiifksotorhcub.supabase.co';
const ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlY3hkdnNpaWZrc290b3JoY3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNzgwMDMsImV4cCI6MjA5NjY1NDAwM30.KCoxU2Ule0fnDIMsOKDNHObyjRp4wDqltOjPp_-TnkQ';

const outDir = resolve(process.cwd(), 'public');
const outFile = resolve(outDir, 'kb-snapshot.json');

async function fetchAll(table, select) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  const res = await fetch(url, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  console.log('[kb-snapshot] fetching…');
  try {
    const [disorders, assessments, materials, therapy_goals, clinical_sources] = await Promise.all([
      fetchAll('disorders', 'id,name,category,symptoms,red_flags,source_reference,parent_id'),
      fetchAll('assessments', 'disorder_id,name,source_reference'),
      fetchAll('materials', 'disorder_id,name,source_reference'),
      fetchAll('therapy_goals', 'disorder_id,goal,source_reference'),
      fetchAll('clinical_sources', 'disorder_id,primary_source,secondary_source,verification_status,kind'),
    ]);
    const snapshot = {
      generated_at: new Date().toISOString(),
      version: 1,
      counts: {
        disorders: disorders.length,
        assessments: assessments.length,
        materials: materials.length,
        therapy_goals: therapy_goals.length,
        clinical_sources: clinical_sources.length,
      },
      disorders,
      assessments,
      materials,
      therapy_goals,
      clinical_sources,
    };
    writeFileSync(outFile, JSON.stringify(snapshot));
    console.log(
      `[kb-snapshot] wrote ${outFile} — disorders=${disorders.length} assessments=${assessments.length} materials=${materials.length} goals=${therapy_goals.length} sources=${clinical_sources.length}`,
    );
  } catch (err) {
    console.warn('[kb-snapshot] failed:', err?.message || err);
    console.warn('[kb-snapshot] the app will fall back to live network fetch at runtime.');
    // Write an empty stub so the app can detect "no snapshot".
    if (!existsSync(outFile)) {
      writeFileSync(
        outFile,
        JSON.stringify({ generated_at: null, version: 1, empty: true }),
      );
    }
  }
}

main();
