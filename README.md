# Mythcast

Generates internally-consistent mythologies — cultures, pantheons, and myths that drift coherently over simulated time. See `mythcast-spec.md` for the full design doc.

**Stack:** Next.js + Convex + Clerk (matching ConLangLab), Neo4j Aura for the relationship/lineage graph layer (wired in Phase 6).

## Setup

```bash
pnpm install
```

Before `pnpm dev` or `pnpm build` will fully work, two external services need to be provisioned (interactive, not automatable from here):

1. **Convex** — run `npx convex dev` and follow the prompts to create/link a deployment. This populates `.env.local` with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`.
2. **Clerk** — create an application at [clerk.com](https://clerk.com), then add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_JWT_ISSUER_DOMAIN` to `.env.local` (see `.env.local.example`). In the Clerk dashboard, add a JWT template named `convex` so Convex can verify Clerk sessions (see `convex/auth.config.ts`).

## Development

```bash
pnpm dev     # dev server
pnpm test    # vitest
pnpm lint    # eslint
pnpm build   # production build (needs real Convex/Clerk env vars)
```

## Structure

- `src/lib/types.ts` — core data model (`CultureProfile`, `God`, `Myth`, `MythVariant`)
- `src/lib/pipeline.ts` — stub seed→culture→pantheon→myth pipeline (Phase 0; real generators land in Phases 2-4)
- `convex/schema.ts` — Convex tables (stub shapes, tightened as each layer's generator lands)
- `tests/pipeline.test.ts` — end-to-end stub pipeline test
