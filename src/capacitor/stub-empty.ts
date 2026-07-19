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
