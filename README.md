# recetitas.app

Landing y primera versión de la red social de recetitas.app, una comunidad para descubrir, guardar y compartir recetas de gente real.

## Stack

- Vue 3 + Vite
- Tailwind CSS v4
- Phosphor Icons
- API sobre Cloudflare Worker
- D1 para perfiles, recetas, likes, guardados, comentarios y follows
- Registro e inicio de sesión propios con usuario, correo y contraseña
- Feed inicial vacío: las recetas visibles son publicadas por usuarios, no contenido de muestra
- Perfiles públicos bajo `/app/u/:usuario`, edición del perfil, seguidores y recetarios personales

## Estructura

- `src/`: landing pública.
- `app/`: red social Vue publicada bajo `/app/`.
- `api/`: endpoints y reglas de autorización.
- `db/` y `drizzle/`: definición y migración de la base de datos.
- `worker/`: enrutamiento de landing, app y API.

## Desarrollo local

```bash
pnpm install
pnpm dev
pnpm dev:app
```

## Build

```bash
pnpm build
pnpm test:api
```

La landing está disponible en [recetitas-app.stherling53.chatgpt.site](https://recetitas-app.stherling53.chatgpt.site) y la comunidad en [/app/](https://recetitas-app.stherling53.chatgpt.site/app/).
