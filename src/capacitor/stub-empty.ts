// Browser stub for server-only modules. Server functions in the Capacitor
// bundle are replaced with client RPC stubs by @tanstack/react-start, so the
// server-side helpers these functions import are unreachable at runtime.
export {};
export const supabaseAdmin = new Proxy({}, {
  get() {
    throw new Error("supabaseAdmin is not available in the mobile bundle");
  },
});
export function createLovableAiGatewayProvider() {
  throw new Error("AI gateway is not available in the mobile bundle");
}
export function runAnalyzeCase(): never {
  throw new Error("runAnalyzeCase is not available in the mobile bundle");
}
export function runDeleteMyAccount(): never {
  throw new Error("runDeleteMyAccount is not available in the mobile bundle");
}
export const AnalysisSchema = undefined as unknown;
export type AnalysisResult = unknown;

// Server-only auth middleware placeholder. Server functions are replaced by
// client RPC stubs in the mobile bundle, so this is never invoked.
export const requireSupabaseAuth = {
  _types: undefined as unknown,
  middleware: () => requireSupabaseAuth,
  server: () => requireSupabaseAuth,
  client: () => requireSupabaseAuth,
} as any;
