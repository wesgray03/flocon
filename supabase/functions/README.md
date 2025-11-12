# Supabase Edge Functions (Deno)

This folder contains edge functions that run in the Deno runtime provided by Supabase. They differ from the Next.js/Node environment:

## Why these files are excluded from TypeScript project

- `tsconfig.json` explicitly excludes `supabase/functions/**` so the Next.js TypeScript compiler does not attempt to type‑check Deno specifics.
- Remote URL imports (e.g. `https://deno.land/...` or `https://esm.sh/...`) are valid in Deno but produce diagnostics in a plain Node/TS setup.

## Current Strategy

- We keep `// @ts-nocheck` at the top of each Deno function file to suppress editor diagnostics unless you enable the Deno extension.
- ESLint ignores this folder (configured in `eslint.config.mjs`) so Node lint rules dont complain about globals like `Deno`.

## Optional: Enable full Deno typing locally

If you want rich types inside VS Code:

1. Install the official **Deno** extension.
2. In your VS Code settings (JSON):
   ```jsonc
   {
     "deno.enable": true,
     "deno.enablePaths": ["supabase/functions"],
   }
   ```
3. Remove the `// @ts-nocheck` header from the function files.
4. (Optional) Replace URL imports with an import map (supported by Supabase) if you want version centralization.

## Deno Tasks

A minimal `deno.json` has been added with a task:

```bash
deno task notify-mention
```

This will run the function locally (you may need to mock environment variables or adjust permissions).

## Adding New Functions

1. Create a new folder: `supabase/functions/<function-name>/index.ts`.
2. Add `// @ts-nocheck` at top (unless Deno extension enabled).
3. Export a handler via `serve()` from `std/http/server.ts`.
4. Keep permissions minimal (avoid `--allow-*-all`).

## Future Improvements

- Import map (`deno.json` -> `imports` block) to pin versions more cleanly.
- Shared utility module for common response patterns.
- Structured logging wrapper.

---

If youd like to switch to full typed Deno mode, let me know and I can automate the change.
