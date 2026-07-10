# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable decisions

- Framework: Vue 3 single-file components with Vite.
- Styling: Tailwind CSS v4 through the official Vite plugin, with shared tokens in `src/styles.css`.
- Visual source of truth: `design-reference.png` (selected ideation direction 2).
- Product structure: keep this prototype self-contained inside `landing/` so future product areas can live in sibling folders.
