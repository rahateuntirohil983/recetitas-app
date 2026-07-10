# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable decisions

- Framework: Vue 3 single-file components with Vite.
- Styling: Tailwind CSS v4 through the official Vite plugin, with shared tokens in `src/styles.css`.
- Visual source of truth: `design-reference.png` (selected ideation direction 2).
- Product structure: keep this prototype self-contained inside `landing/` so future product areas can live in sibling folders.
- Social app: keep the signed-in Vue experience in `app/`, built under `/app/` and visually derived from the landing tokens.
- API: keep same-origin Worker endpoints in `api/`; use D1 through the logical `DB` binding for durable profiles, recipes, likes, bookmarks, comments, and follows.
- Authentication: recetitas.app owns registration and login with email/handle plus password. Passwords use salted PBKDF2 hashes; opaque sessions are stored hashed in D1 and sent only through HttpOnly same-site cookies.
- Content integrity: production and local previews start without synthetic recipes; every visible community recipe must be created by a signed-in user.
- Profile navigation: public profiles use stable `/app/u/:handle` URLs; profile edits, follow relationships, connection lists, and owned-recipe deletion remain same-origin API operations.
- Recipe media: browsers upload only through the authenticated same-origin API; the Worker forwards validated JPEG/PNG/WebP bytes to the VPS media service, while D1 stores only the resulting HTTPS URL.
- Avatar system: use the generated 8×8 pig-chef atlas in `app/src/assets/pig-avatar-atlas.webp`; every user receives a stable index from 0–63 and may reroll it from profile editing.
