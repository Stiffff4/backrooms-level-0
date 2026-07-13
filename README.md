# LEVEL 0 — THRESHOLD

Experiencia first-person de horror liminal para navegador, construida con Babylon.js,
TypeScript estricto, Vite, DOM y Web Audio API. El producto implementa únicamente Level 0 y
mantiene el horror en la arquitectura, la iluminación, el sonido y la desorientación; no contiene
entidades ni combate.

## Requisitos

- Node.js 24 LTS
- npm 10 o posterior
- Navegador de escritorio con WebGL2

## Desarrollo

```powershell
npm install
npm run dev
```

Vite mostrará la URL local. Abrirla en Chromium, Edge o Firefox con aceleración gráfica activa.

## Validación

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

La suite E2E se añadirá y ejecutará antes del cierre del producto.

## Build estático

```powershell
npm run build
npm run preview
```

Para una subruta, crear `.env.production.local` con, por ejemplo,
`VITE_BASE_PATH=/threshold/` antes de compilar. El contenido de `dist/` es autosuficiente y debe
servirse mediante hosting estático.

## Especificación

`MASTER_PLAN.md` es la fuente de verdad. `PROGRESS.md`, `DECISIONS.md` y `KNOWN_ISSUES.md`
registran el estado verificable de implementación.
