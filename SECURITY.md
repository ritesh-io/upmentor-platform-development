# Upmentor security and persistence notes

## Authentication URL

Vercel project inspection identified the production alias as `upmentor-platform-development-riteshsynk-6666.vercel.app`. The production deployment inspected on 24 November 2026 was in `ERROR` state; the alias is verified, but the deployment itself was not healthy at inspection time.

Set `BETTER_AUTH_URL` in the Vercel project’s **Production** environment to:

```text
https://upmentor-platform-development-riteshsynk-6666.vercel.app
```

Keep `BETTER_AUTH_URL` unset for other environments unless their own canonical origin is known. Do not use a deployment-specific preview hostname. This repository change does not read, add, or overwrite any Vercel environment setting; verify the alias in project settings before changing it.

## Distributed API rate limiting

The JSON request guard uses Upstash Redis via `@upstash/ratelimit` and `@upstash/redis`. Each guarded route retains the existing limit of 12 requests per minute per route and caller. AI routes key limits to a non-reversible HMAC of the authenticated user ID; other guarded routes use the forwarded client address. A rejected request returns HTTP `429` with `Retry-After`.

The connected Vercel Upstash integration supplies server-only variables. The supported variable pairs are:

- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (the connected Vercel integration)
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (standard Upstash names)

Never prefix these values with `NEXT_PUBLIC_`, expose them in client code, or use the read-only token for writes. In development, missing Redis variables use a process-local limiter so local work remains usable. In production, missing Redis configuration or a Redis error fails closed with HTTP `503`; it never silently falls back to per-instance limits.

## Persistent mentorship sessions

`mentorship_sessions` stores a session ID, mentor user ID, mentee user ID, cohort ID, start time, agenda, status, mentor notes, approved summary evidence, follow-up items, and timestamps. New records are created only when the mentor and mentee are both members of the referenced `program_cohorts` record. Mentor list, update, and AI-summary operations re-check session ownership and current cohort membership; mentees can list only records whose `studentId` is their authenticated account ID. Raw notes are returned only to the owning mentor. The browser demo continues to use its existing local demo data and does not write test or fabricated sessions to MongoDB.

## Security integration test

Run `pnpm run test:security` to create a random, isolated MongoDB database, start a separate Next.js development server against that database, create temporary Better Auth accounts and cohort fixtures, exercise role/ownership/rate-limit checks, and clear all temporary fixture documents when the test process exits. The MongoDB role used by the project does not grant `dropDatabase`, so the now-empty random database and its collection definitions remain; no user records are present in it. The suite does not query the default authentication database or use production user records. The temporary `.next-security-test` build directory is separate from the normal preview build.
