# Progreso de implementación

## Estado general

Implementación activa. La fuente de verdad es `MASTER_PLAN.md`.

## Fases

| Fase | Estado | Checkpoint |
| --- | --- | --- |
| 0 — Repositorio y fundación | Completada | `chore: initialize babylon game foundation` |
| 1 — Movimiento | Completada | `feat: implement first person movement` |
| 2 — Audio | Pendiente | — |
| 3 — Módulos | Pendiente | — |
| 4 — Streaming | Pendiente | — |
| 5 — Visual pixelado | Pendiente | — |
| 6 — Iluminación | Pendiente | — |
| 7 — Tensión | Pendiente | — |
| 8 — Salida y final | Pendiente | — |
| 9 — Optimización y QA | Pendiente | — |

## Fase 0 — Repositorio y fundación

- Vite vanilla TypeScript configurado.
- Babylon.js modular inicializa un `Engine` WebGL2 y una escena mínima.
- TypeScript estricto, ESLint, Prettier, Vitest y Playwright configurados.
- State machine explícita y fallback de error disponibles.
- Base path configurable mediante `VITE_BASE_PATH`.
- CI localizable en `.github/workflows/ci.yml`.

### Validación

- `npm install`: correcto, 139 paquetes auditados y 0 vulnerabilidades.
- `npm run validate`: correcto; typecheck, lint, 2 unit tests y build de producción.
- `npm run test:e2e`: correcto; Chromium inicializó Babylon, mostró el canvas con buffer no vacío
  y no emitió errores de consola.
- Build inicial: 600.10 kB de JavaScript principal sin comprimir, 140.69 kB gzip; no hay warnings
  y la descarga queda muy por debajo del presupuesto de 30 MB.
- Resize: canvas CSS ocupa el viewport y Babylon actualiza su buffer con el evento de ventana.

La incompatibilidad de TypeScript 7 con el rango declarado por `typescript-eslint` se detectó
durante instalación y se corrigió usando TypeScript 6.0.3, sin ignorar peer dependencies.

Una división agresiva de los módulos internos de Babylon se rechazó al comprobar en Chromium que
rompía el orden de inicialización de clases. Se conservó el chunk estable y se fijó el aviso local
en 1,100 kB, después de medir el bundle y sin modificar los presupuestos de producto.

## Fase 1 — Vertical slice de movimiento

- Controlador cinemático first-person con elipsoide, gravedad manual y `moveWithCollisions`.
- WASD, mouse y sprint ilimitado; aceleración y frenado configurados.
- Cámara con FOV, sensibilidad, invert Y y head bob suave configurables.
- Sala Level 0 de 16 × 12 m con suelo, techo, paredes, zócalos, retícula, fixtures y colliders
  solapados sin seams.
- Flujo de pointer lock, pausa por Escape/pérdida de foco, reanudación y regreso al menú.
- Pantalla inicial, pausa, créditos y controles DOM accesibles.
- Settings versionados y persistidos con validación defensiva en `localStorage`.
- Debug HUD con FPS, frame time, meshes, triángulos y draw calls por frame.

### Validación

- `npm run validate`: correcto; TypeScript strict, ESLint, 20 unit tests y build.
- `npm run test:e2e`: 3/3 en Chromium.
- E2E real: título/créditos; persistencia de FOV/sensibilidad; pointer lock; WASD; pausa/reanudar;
  pausa por blur; suelo estable; colisión contra las cuatro paredes y dos esquinas.
- Rendimiento observado en headless: 57–60 FPS, 28 draw calls, 1,008 triángulos y 28 meshes.
- Bundle: 1,024.77 kB JS sin comprimir, 243.62 kB gzip; sin warnings y muy por debajo del budget.
- Capturas inspeccionadas: composición inicial completa y sala visible con métricas correctas.
