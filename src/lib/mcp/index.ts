import { auth, defineMcp } from "@lovable.dev/mcp-js";

import createCaseTool from "./tools/create-case";
import getCaseTool from "./tools/get-case";
import listCasesTool from "./tools/list-cases";
import listTherapyGoalsTool from "./tools/list-therapy-goals";
import searchDisordersTool from "./tools/search-disorders";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "slp-assist-ai",
  title: "SLP Assist AI",
  version: "0.1.0",
  instructions:
    "Tools for SLP Assist AI, a clinical decision support app for speech-language pathologists. Use `list_cases`/`get_case` to read the signed-in clinician's saved cases, `create_case` to add a new one, and `search_disorders`/`list_therapy_goals` to look up the clinical catalog. All case data is private to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCasesTool, getCaseTool, createCaseTool, searchDisordersTool, listTherapyGoalsTool],
});
