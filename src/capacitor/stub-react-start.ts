// Capacitor stub for `@tanstack/react-start`.
// Server-function machinery is not needed at runtime in the mobile bundle:
// * `useServerFn` in components receives our aliased shim functions and just
//   returns them unchanged (they already do their own fetch under the hood).
// * `createServerFn`, `createMiddleware`, `createStart` are only referenced
//   from server-side modules that are additionally aliased to no-ops.
export function useServerFn<T>(fn: T): T {
  return fn;
}
export function createServerFn(): never {
  throw new Error("createServerFn is not available in the mobile bundle");
}
export function createMiddleware(): never {
  throw new Error("createMiddleware is not available in the mobile bundle");
}
export function createStart(): never {
  throw new Error("createStart is not available in the mobile bundle");
}
