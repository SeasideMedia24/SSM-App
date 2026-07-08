// No-op stand-in for the `server-only` package under test. The real package
// throws unless imported with Next.js's `react-server` condition, which Vitest
// doesn't set; the modules we test are server-side by construction anyway.
export {};
