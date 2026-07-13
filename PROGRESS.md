# Progreso de implementación

## Estado general

Implementación activa. La fuente de verdad es `MASTER_PLAN.md`.

## Fases

| Fase | Estado | Checkpoint |
| --- | --- | --- |
| 0 — Repositorio y fundación | Completada | `chore: initialize babylon game foundation` |
| 1 — Movimiento | Completada | `feat: implement first person movement` |
| 2 — Audio | Completada | `feat: add environmental audio system` |
| 3 — Módulos | Completada | `feat: add procedural room generation` |
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

## Fase 2 — Audio vertical

- `GameAudioEngine` lazy: ningún `AudioContext` se crea antes del gesto de entrada.
- Mezclador Web Audio con buses master, ambience, lights, footsteps, events y UI, más limitador
  suave, rampas de volumen y cierre idempotente.
- Volúmenes master/ambiente/pasos conectados a los ajustes persistidos.
- Banco procedural original y determinista: tres loops periódicos sin DC ni costuras audibles y
  un pop fluorescente con envolvente propia.
- Ambiente por capas con fundamental de 60 Hz, armónicos, buzz, ballast, modulación lenta,
  perfiles de tensión, silencios y pops deterministas.
- Pasos estéreo alternados sobre `wet_carpet`, sintetizados en cuatro condiciones y disparados por
  distancia real distinta al caminar/correr.
- Fades de pausa y pérdida de foco, reanudación desde gesto, listener 3D y ruta `noAudio` sin crear
  objetos Web Audio.
- HUD y atributos debug con estado, mezcla, nodos activos, pasos y distancia pendiente.
- Límites duros de pops, pasos por frame y voces simultáneas; recuperación limpia si la creación
  inicial del grafo falla parcialmente.

### Validación

- `npm run validate`: correcto; TypeScript strict, ESLint, 43 unit tests y build de producción.
- `npm run test:e2e`: 5/5 en Chromium; incluye autoplay, `noAudio`, pasos durante movimiento y
  fade al pausar, además de toda la regresión de fases anteriores.
- Audio unitario: determinismo, amplitud normalizada, DC/costuras, cadencia, buses, limiter,
  rampas, listener, límites de voces y cleanup/reintento sin leaks.
- Rendimiento observado con audio activo: 60 FPS sostenidos tras warm-up, 31 nodos de audio,
  28 draw calls y 1,008 triángulos en la sala vertical.
- Bundle: 1,058.81 kB JS sin comprimir, 253.50 kB gzip; sin warnings y muy por debajo del budget.

## Fase 3 — Sistema de módulos y generación base

- Catálogo tipado con los 12 módulos base de `MASTER_PLAN.md`, footprints, recetas geométricas,
  pesos, etiquetas y sockets cardinales con anchura y altura explícitas.
- `SeedBank` con streams independientes `world`, `visual`, `audio` y `tension`; la topología no
  cambia al consumir aleatoriedad cosmética o sonora.
- Grafo lógico de `RoomInstance`, conexiones recíprocas y estados `open`, `connected` y `sealed`
  como fuente de verdad separada del renderer.
- Generación ponderada y determinista con rotaciones de cuarto de vuelta, alineación de sockets,
  rechazo por AABB, límites de repetición y cierre explícito de sockets sin pareja.
- Renderer modular original con materiales compartidos, geometría combinada por habitación,
  columnas, retícula, fixtures, colliders, triggers de visita y anclas de iluminación.
- Juntas sin superficies coplanares: suelo visible limitado al footprint, collider invisible con
  solape mínimo y paredes, linteles y zócalos retraídos dentro de su módulo.
- Mundo de checkpoint de 18 habitaciones integrado al ciclo real del juego, con spawn orientado,
  transición física entre módulos, conteo único de visitas y reinicio reproducible con la misma seed.
- Telemetría de seed, firma topológica, intentos/rechazos, habitación actual, visitas, meshes,
  colliders y triángulos disponible para HUD y automatización.

### Validación

- `npm run validate`: correcto; TypeScript strict, ESLint, 13 archivos/52 tests y build de producción.
- Property test sobre 320 seeds y grafos de 36–48 habitaciones: conectividad, reciprocidad,
  alineación, determinismo, cobertura de los 12 módulos, ausencia de solapes y límites de repetición.
- `npm run test:e2e`: 7/7 en Chromium; incluye misma seed/misma topología, seed distinta/layout
  distinto, cruce físico de una junta, cambio de habitación, visitas y restart reproducible.
- Smoke `NullEngine`: construcción/reconstrucción de 48 habitaciones estable en 338 meshes y
  liberación completa de meshes, materiales y transform nodes al disponer el mundo.
- Capturas inspeccionadas a ambos lados de una unión: 45–61 FPS en la captura headless, 5–38 draw
  calls y 720–5,796 triángulos activos según la habitación visible.
- Bundle: 1,079.27 kB JS sin comprimir, 260.34 kB gzip; build en 404 ms y dentro del budget.
