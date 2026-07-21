# recetitas.app

recetitas.app is a Spanish-first social network for recipes. A recipe is more than a list of ingredients here: it is a post, a cooking guide, a conversation, and a way for a new cook to find an audience.

- Live landing: https://recetitas-app.stherling53.chatgpt.site/
- Live application: https://recetitas-app.stherling53.chatgpt.site/app/
- Code repository: https://github.com/rahateuntirohil983/recetitas-app

## Why we built it

We are Martina and Valentino, a couple who share an interest in food and technology. We kept seeing talented Latin American cooks publish recipes inside general-purpose social platforms, where a useful recipe quickly disappears into the feed and a new creator has little context around their work.

We wanted the reach and personality of a social app without losing the structure that makes a recipe useful in the kitchen. That tension shaped the product: every dish belongs to a person, but it still has clear ingredients, steps, timing, difficulty, language, and cooking tools.

## What works today

The deployed application supports user-generated content from end to end. It does not seed the feed with synthetic recipes.

- Account registration and login with a username, email, and password
- A social feed with follows, likes, bookmarks, comments, comment photos, and notifications
- Recipes with a cover photo, an optional 35-second video, hashtags, polls, difficulty, language, portions, and an optional timer
- Public creator profiles, followers, recipe collections, edit history, and achievements
- Ingredient-based recipe matching, recipe of the day, recipe roulette, search, and hashtag discovery
- Automatic shopping lists and a full-screen step-by-step cooking mode
- Live WebRTC broadcasts from desktop or mobile with camera switching, microphone and torch controls, chat, pig stickers, moderators, bans, and reconnection handling
- Device-local accessibility preferences for text size, contrast, reduced motion, and color-vision modes
- Spanish, English, and Portuguese interface support, plus recipe-language filters

## Architecture

| Area | Implementation |
| --- | --- |
| Landing and social app | Vue 3, Vite, Tailwind CSS v4, Phosphor Icons |
| Edge API and routing | Cloudflare Worker |
| Persistent data | Cloudflare D1 with SQL migrations |
| Recipe media | Authenticated Worker upload flow backed by a VPS media service |
| Live video | MediaMTX with WHIP publishing and WHEP playback |
| Authentication | Salted PBKDF2 password hashes and hashed opaque sessions in D1 |
| Session delivery | HttpOnly, SameSite cookies |
| Automated checks | Node test runner for API, social, live, administration, and support flows |

The Worker serves the landing, the Vue application, and same-origin API routes. D1 stores users, sessions, recipes, social relationships, notifications, tags, polls, live metadata, and moderation state. Image and video bytes live in the VPS media service; D1 stores their HTTPS URLs.

## How we used Codex and GPT-5.6

Codex and GPT-5.6 were part of the development loop from the first landing page to the deployed social application.

Martina contributed product ideas, reviewed the experience, and tested builds on a real phone. Valentino directed the architecture, implementation, and releases. We gave Codex concrete evidence instead of broad prompts: screenshots from mobile, browser console errors, broken layouts, failing interactions, and precise descriptions of how a feature should behave.

Codex inspected the repository, traced each report to the relevant Vue component or Worker route, edited the frontend and API, added D1 migrations, ran builds and tests, used Git for versioned changes, and helped ship working releases. GPT-5.6 helped reason through decisions that crossed several layers of the product:

- Authentication and authorization across account, profile, recipe, comment, and moderation actions
- Validated media uploads where the browser never receives the VPS upload secret
- The WebRTC lifecycle from camera permission to WHIP publication, WHEP playback, readiness, heartbeats, moderation, and cleanup
- Mobile camera grouping so users see Front and Back instead of duplicate physical lenses, while preserving torch support when the selected track exposes it
- Deployment caching rules that prevent stale dynamic imports from receiving HTML with the wrong MIME type
- Responsive layouts, text wrapping, accessibility settings, and language-aware discovery

This was not a one-shot generation. We repeatedly tested the deployed result, sent back evidence, and refined the implementation. The product choices remained ours. Codex shortened the path between a specific observation and a tested patch.

## Repository structure

```text
src/             Public landing page
app/             Signed-in Vue social application
api/             Worker API routes and authorization rules
db/              Database schema
drizzle/         Ordered D1 migrations
worker/          Asset and API routing
media-service/   VPS upload and live-media service configuration
scripts/         Build and asset preparation utilities
```

## Run it locally

Requirements: Node.js 20 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

The signed-in Vue interface can be started separately:

```bash
pnpm dev:app
```

The local Vite servers cover frontend work. Durable account and social features require a Worker environment with the `DB` D1 binding. Media and live features also require the service bindings documented in `media-service/README.md`.

There is intentionally no sample recipe dataset. New accounts start with an empty community until people publish recipes.

## Build and test

```bash
pnpm build
pnpm test:api
```

The build command compiles both Vue applications and prepares the Worker assets. The API suite exercises authentication, recipe ownership, social actions, assisted cooking data, live lifecycle rules, moderation, administration, and support routes.

## Team

- Martina: product ideas, user experience, mobile testing, and product feedback
- Valentino: full-stack development, architecture, infrastructure, and deployment
