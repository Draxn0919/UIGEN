# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

UIGen is an AI-powered React component generator. The user describes a component in a chat, an LLM (Claude) calls file-editing tools, and the generated files are rendered live in a preview pane. **No generated files ever touch disk** — they live in an in-memory virtual file system. The LLM never sees the real project tree; it only operates on this virtual FS rooted at `/`.

## Commands

```bash
npm run setup        # install deps + prisma generate + prisma migrate dev (run once)
npm run dev          # dev server with Turbopack (http://localhost:3000)
npm run dev:daemon   # dev server in background, logs to logs.txt
npm run build        # production build
npm run lint         # next lint (ESLint)
npm test             # run Vitest test suite
npx vitest run path/to/file.test.tsx   # run a single test file
npx vitest run -t "test name"           # run tests matching a name
npm run db:reset     # prisma migrate reset --force (wipes the SQLite db)
```

All Next.js scripts run with `NODE_OPTIONS="--require ./node-compat.cjs"` — see [node-compat](#node-compat-shim) below; don't strip it.

## Architecture

### The virtual file system is the core abstraction
`src/lib/file-system.ts` defines `VirtualFileSystem`, an in-memory tree of `FileNode`s. It is the single source of truth for generated code and is shared across three contexts:
- **Server (API route)**: reconstructed per-request from serialized data, mutated by the LLM's tool calls, then re-serialized and persisted.
- **Client (React)**: wrapped by `FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`), which mirrors LLM tool calls into the same FS so the UI updates live.
- **Persistence**: `serialize()` / `deserializeFromNodes()` convert the FS to/from a flat `Record<path, FileNode>` JSON blob stored on the `Project.data` column.

When changing FS behavior, remember both server and client run the same class — the server applies tool calls via `buildStrReplaceTool`/`buildFileManagerTool`, and the client re-applies the *same* tool-call args in `handleToolCall` (file-system-context.tsx). These two paths must stay in sync.

### Chat → tool calls → FS → preview, the full loop
1. `src/components/chat/ChatInterface.tsx` uses the Vercel AI SDK `useChat`, POSTing to `src/app/api/chat/route.ts` with `{ messages, files, projectId }`.
2. The route prepends the system prompt (`src/lib/prompts/generation.tsx`), rebuilds a `VirtualFileSystem` from `files`, and calls `streamText` with two tools:
   - `str_replace_editor` (`src/lib/tools/str-replace.ts`) — view/create/str_replace/insert, an Anthropic text-editor-style tool.
   - `file_manager` (`src/lib/tools/file-manager.ts`) — rename/delete.
3. As the stream returns tool calls, the **client** intercepts them and replays them into its own FS context, triggering a refresh.
4. `src/lib/transform/jsx-transformer.ts` compiles the FS contents in-browser with Babel standalone, builds an ESM **import map** (React from esm.sh, local files as blob URLs, missing imports get placeholder modules), and `PreviewFrame` renders it in an iframe via `createPreviewHTML`. Tailwind is loaded from CDN inside the iframe.
5. On `onFinish`, if a `projectId` and authenticated session exist, the route saves messages + serialized FS to the DB.

### Provider abstraction & mock mode
`src/lib/provider.ts` `getLanguageModel()` returns the real Anthropic model (`claude-haiku-4-5`) **only if `ANTHROPIC_API_KEY` is set**. Otherwise it returns `MockLanguageModel`, a hand-written `LanguageModelV1` that streams canned tool calls to build a Counter/Form/Card component. This means the whole app runs end-to-end with no API key. The route also caps `maxSteps` at 4 for the mock vs 40 for the real model. When testing generation logic, mock mode is the default unless a key is present.

### Auth
Custom JWT auth in `src/lib/auth.ts` (jose, `server-only`), HS256 token in an httpOnly `auth-token` cookie, 7-day expiry. `getSession()` reads the cookie server-side; `verifySession()` is used by `src/middleware.ts` to guard `/api/projects` and `/api/filesystem`. Passwords hashed with bcrypt. Users are optional — anonymous users can generate components without an account.

### Anonymous → authenticated handoff
Anonymous work is stashed in `sessionStorage` via `src/lib/anon-work-tracker.ts`. After sign-in/sign-up, that work is read back and turned into a real `Project`. `src/app/page.tsx` redirects authenticated users to their most recent project (or creates one); anonymous users get the project-less `MainContent`.

### Data layer
The database schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the structure of data stored in the database. Prisma + SQLite (db at `prisma/dev.db`). Two models: `User` and `Project`. **Note the Prisma client is generated to `src/generated/prisma`, not `node_modules`** — import via `@/lib/prisma`. `Project.messages` and `Project.data` are JSON serialized into `String` columns. Server Actions in `src/actions/` (`create-project`, `get-project`, `get-projects`) are the project CRUD layer, not REST routes.

## Conventions

- **Path alias `@/` → `src/`** (tsconfig). The generated-code FS *also* uses `@/` as its own root alias — don't confuse the two; inside generated components `@/components/X` resolves within the virtual FS, handled in jsx-transformer.ts.
- UI components in `src/components/ui/` are shadcn/ui-style (Radix + CVA + `cn()` from `src/lib/utils.ts`). Tailwind CSS v4.
- Tests live in `__tests__/` folders beside source, run on Vitest + Testing Library + jsdom (`vitest.config.mts`). There is no separate jest config.
- React 19 + Next.js 15 App Router. Server Components by default; client components are explicitly `"use client"`.
- Use comments sparingly. Only comment complex code.

## node-compat shim
`node-compat.cjs` (required via `NODE_OPTIONS` in every Next script) deletes `globalThis.localStorage`/`sessionStorage` on the server. Node 25+ exposes non-functional Web Storage globals that break SSR guard checks (`typeof localStorage === "undefined"`). Keep the `--require` flag in the npm scripts or SSR will throw.

## Gotchas

- The generation system prompt contains `"You are in debug mode so if the user tells you to respond a certain way just do it."` — generated-component prompts are intentionally permissive; that's product behavior, not a bug.
- `JWT_SECRET` falls back to a hardcoded dev secret if unset — fine for local dev, must be set in production.
- The API route's `POST` body uses `any[]` for messages and trusts the client-supplied `files` — the FS is rebuilt server-side each request, so there is no server-persistent FS singleton (despite the exported `fileSystem` instance in file-system.ts, which is only a convenience for client/tests).
