# Progreso de implementación

## Estado general

Implementación activa. La fuente de verdad es `MASTER_PLAN.md`.

## Fases

| Fase                        | Estado     | Checkpoint                                  |
| --------------------------- | ---------- | ------------------------------------------- |
| 0 — Repositorio y fundación | Completada | `chore: initialize babylon game foundation` |
| 1 — Movimiento              | Completada | `feat: implement first person movement`     |
| 2 — Audio                   | Completada | `feat: add environmental audio system`      |
| 3 — Módulos                 | Completada | `feat: add procedural room generation`      |
| 4 — Streaming               | Completada | `feat: add streamed infinite world`         |
| 5 — Visual pixelado         | Completada | `feat: implement pixel rendering pipeline`  |
| 6 — Iluminación             | Completada | `feat: add fluorescent lighting system`     |
| 7 — Tensión                 | Completada | `feat: implement tension and anomalies`     |
| 8 — Salida y final          | Completada | `feat: add controlled exit sequence`        |
| 9 — Optimización y QA       | Pendiente  | —                                           |

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

## Fase 4 — Streaming e infinito aparente

- Horizonte lógico determinista de 1,024 habitaciones sin geometría eager y estrategia `deep` que
  conserva ramificaciones mientras prioriza una espina larga de exploración.
- `ChunkStreamer` independiente del renderer con BFS cacheado, radio activo 3, precarga 4, cap duro
  de 60 habitaciones, tiers, métricas y deltas reproducibles.
- Descarga antes de carga en swaps llenos y rollback de handles/tier si falla una materialización;
  el límite tampoco se sobrepasa de forma transitoria.
- Historial compacto de salas visitadas sin meshes, colliders, luces ni transforms renderizados.
- `ModularWorld` incremental con registro lógico, carga/descarga idempotente, sincronización de sets,
  offset persistente y LRU acotada a ocho vistas deshabilitadas para backtracking rentable.
- `StreamingVisibilityGuard` pull-based: protege frustum antes del fin de niebla, distancia de
  seguridad y vecinos tras entradas visibles; verifica después de cada swap que no desapareció nada
  protegido y publica un contador de violaciones.
- Niebla lineal coherente con el fondo entre 16 y 44 m para cerrar líneas visuales y ocultar el borde
  de precarga sin depender de pasillos infinitos.
- Floating origin horizontal a 240 m en producción: mueve mundo y jugador en el mismo frame,
  conserva velocidad, coordenadas lógicas y listener, y aplica el offset a cargas futuras.
- Reset completo de streamer, historial, LRU activa, origen, visitas y spawn al reiniciar o volver al
  título; la seed y la firma topológica permanecen estables.
- HUD/dataset con posición local y lógica, active/preload/protected/pool, cargas/descargas, historial,
  rebases, offset, fog, recursos de escena y violaciones de visibilidad.

### Validación

- `npm run validate`: correcto; TypeScript strict, ESLint, 18 archivos/75 tests y build de producción.
- Simulación lógica equivalente a 30 minutos y recorrido determinista repetido: materialización y
  pico siempre ≤ 60, secuencia load/unload idéntica e historial sin geometría.
- Grafos `deep` de 1,024 habitaciones validados sin solapes y con 1,023 conexiones; seis seeds
  representativas superaron profundidad 500 en Vitest. En una auditoría separada de 128 seeds, la
  profundidad fue 458–773 (media 640) y 96.09% superó 500, siempre de forma determinista.
- Auditoría ampliada: 568 seeds/196,608 habitaciones, incluidas 48 generaciones de producción y
  ocho al máximo de 2,048; 0 fallos, 78/78 regeneraciones idénticas, pico global 36/60 y 10,000
  rebases sin error relativo. La generación de 1,024 promedió 606 ms.
- Smokes `NullEngine`: swap al cap, rollback del streamer y de sincronización del renderer,
  LRU/reuse/eviction, diez ciclos, carga después de rebase, posiciones relativas y dispose hasta el
  baseline sin leaks.
- `npm run test:e2e`: 8/8 en Chromium; incluye cruce real, streaming acelerado de 180 habitaciones,
  fog, 19 rebases de prueba, cap/pool, cero descargas visibles y restart posterior al rebase.
- Captura final tras 180 entradas: 181 visitas, 12 salas activas, 1 preload, 8 pooled, 63 meshes
  activos, 3,396 triángulos visibles y 63 draw calls; el avance QA cede al navegador cada ocho salas.
- Soak frame-like de 5 × 180 swaps: heap post-GC 39.1–48.0 MiB y estabilizado en los ciclos 4–5;
  `purgePool`/`dispose` dejaron meshes, nodes, geometrías y materiales en cero. El pico transitorio
  detectado al avanzar 180 salas en una sola tarea se eliminó troceando el helper debug; el recorrido
  normal ya materializaba entre frames.
- Bundle: 1,107.59 kB JS sin comprimir, 267.58 kB gzip; build en 398 ms y dentro del budget.

## Fase 5 — Arte y render pixelado

- Pipeline de render interno real con presets `low` (240p), `default` (360p) y `high` (480p),
  escalado nearest-neighbor nítido y UI DOM conservada a resolución nativa.
- Resolución interna recalculada por aspecto y resize mediante un único `ResizeObserver`; los cambios
  de preset son en vivo, coalescidos por frame y no recrean la escena ni el postproceso.
- Postproceso único con paleta amarilla enfermiza, negros levantados, contraste moderado, Bayer 4×4
  espacial y grano estable. No usa ruido temporal, bloom, VHS ni desenfoque que oculten el pixel grid.
- Doce texturas PNG originales y deterministas para papel, manchas, normales, alfombra seca/mojada,
  techo, zócalos, columnas y luminarias, generadas localmente y verificadas contra un manifiesto.
- Biblioteca compartida de once materiales con mipmaps, wrapping, filtrado trilineal, anisotropía por
  preset, normales opcionales, variantes mojadas/manchadas/apagadas y readiness observable.
- UVs físicas y offsets deterministas por habitación preservados al combinar geometría, de forma que
  la escala del patrón se mantiene coherente y las repeticiones contiguas no parecen una sola copia.
- Ajustes persistentes de calidad y dithering integrados en título y pausa, junto con respeto efectivo
  de `reducedFlashing`; fog, normales, anisotropía y buffer cambian como una unidad.
- Licencia y procedencia de cada activo registradas en `ASSET_LICENSES.md`; todos los assets creados
  para el proyecto se publican como CC0-1.0 y no se incorporó material de origen desconocido.

### Validación

- `npm run validate`: correcto; generación reproducible de assets, TypeScript strict, ESLint,
  23 archivos/92 tests y build de producción.
- `npm run test:e2e`: 11/11 en Chromium; cubre presets y buffers reales, texturas listas, cambio de
  calidad/dithering en vivo, gameplay existente, streaming, audio y regresión visual.
- Regresión versionada a 1280×720 y dos capturas inmóviles separadas 150 ms idénticas byte a byte;
  sin blur, artefactos estáticos ni errores de consola durante la captura.
- Soak de 48 ciclos `low → default → high`, 144 resizes y alternancia de dithering/reduced flashing:
  materiales 11, texturas 12, postprocesos 1 y observers 1 permanecieron constantes; `dispose()`
  idempotente devolvió todos los recursos y callbacks a cero.
- Build bajo subruta `VITE_BASE_PATH=/threshold` servido correctamente: HTML, JS y 12/12 texturas
  respondieron 200. Los PNG y su manifiesto ocupan 108,254 bytes.
- Bundle: 1,073.68 kB JS sin comprimir, 261.04 kB gzip; build en 403 ms y dentro del budget.

## Fase 6 — Iluminación fluorescente

- Cada luminaria es una entidad lógica determinista con perfiles `stable`, `microflicker`,
  `slow-fluctuation`, `intermittent-failure`, `off` y `exit`, muestreados a 30 Hz desde tiempo
  absoluto; no existe aleatoriedad por frame.
- Emisores visuales animados mediante slices RGBA independientes dentro de los meshes combinados:
  se conserva un draw call por material/sala y se realiza como máximo una subida de color por mesh
  modificado.
- `LightPool` fijo de ocho `PointLight` sin sombras, con presupuestos efectivos de 4/6/8 según el
  preset, selección estable por visibilidad, distancia, sala activa, anomalía y salida, y reutilización
  sin crear luces durante el juego.
- Perfiles exhaustivos de iluminación y audio para los doce módulos, con intensidad de proxy, ganancia
  de buzz, ambiente y reverberación coherentes con cada tipología.
- Cuatro voces Web Audio posicionales preasignadas; los presets usan 2/3/4, el zumbido global sigue el
  promedio de la sala activa y los pops de fallo se deduplican mediante ids deterministas de evento.
- La misma muestra controla emisión, proxy, buzz y evento. El override de depuración demuestra que
  apagar una sala deja intensidad visual y sonora en cero sin apagar luces válidas de salas vecinas.
- `reducedFlashing` modifica las curvas del mismo controlador y limita fallos agresivos, sin mantener
  un pipeline visual o sonoro alternativo.
- HUD y datasets exponen fixtures, uploads, capacidad/presupuesto/asignaciones del pool, proxies de la
  sala activa, voces espaciales e intensidad compartida para diagnóstico automatizado.

### Validación

- `npm run validate`: correcto; assets reproducibles, TypeScript strict, ESLint, 29 archivos/119 tests
  y build de producción (539 módulos).
- Unit tests: 25 casos focales de perfiles, overrides, accesibilidad, slices, selección/reuso del pool,
  perfiles de sala y posiciones tras floating origin; además 3 casos de integración director/audio.
- `npm run test:e2e`: 13/13 en Chromium con un worker WebGL; incluye budgets 4/6/8, cambio en vivo de
  `reducedFlashing`, audio desbloqueado por gesto y override conjunto de emisores/proxies/buzz.
- Regresión visual versionada renovada e inspeccionada a 1280×720: las paredes reciben luz amarilla
  localizada, luminarias y pasillos conservan lectura, y dos frames inmóviles siguen siendo idénticos.
- El pool conserva exactamente ocho objetos Babylon durante toda la sesión, nunca habilita más del
  presupuesto y mantiene sombras desactivadas; las cuatro voces de audio también se crean una vez.
- Bundle principal: 1,117.13 kB JS sin comprimir y 270.96 kB gzip; continúa muy por debajo del budget
  de descarga, aunque el umbral informativo de chunk se revisará en la optimización final.

## Fase 7 — Tension Director y anomalías

- `TensionDirector` lógico, determinista y separado de Babylon, con cinco fases entre orientación y
  resolución, intensidad monotónica, agenda por seed, cooldowns globales/por tipo y un solo evento
  transitorio simultáneo.
- Los primeros dos minutos permanecen estables; después aparecen de forma dirigida `light-dip`,
  silencios, cambios de paleta, ecos de repetición, un blackout máximo y hasta tres layout shifts.
- Cada decisión consume tiempo, habitaciones únicas, velocidad, tiempo sin moverse, calidad,
  `reducedFlashing`, tags del módulo y candidatos realmente cargados; no existe RNG por frame.
- Veintidós módulos totales, diez avanzados y poco frecuentes: galerías cortas/largas con arcos
  escalonados reales, grids de cuatro/seis pilares, techos bajos/altos, depresión húmeda, corredor con
  fallo, borde de blackout y sala de repetición.
- Los módulos avanzados atraviesan en línea y dejan la ramificación a las junctions del catálogo base,
  conservando una espina de más de 500 salas en las seeds de escala sin sacrificar variación local.
- Los layout shifts solo habilitan geometría preconstruida, no colisionable y fuera de vista; el estado
  sobrevive descarga/LRU/rebase y nunca modifica sockets, transforms lógicos ni conectividad.
- Iluminación, emisión, buzzing, silencio y postproceso comparten el mismo snapshot contextual. El
  blackout conserva una única luminaria lejana sin audio y restaura todos los overrides al terminar.
- El efecto de anomalía añade desplazamiento por bandas y tinte verdoso discretos sobre el pipeline
  pixel estable; a fuerza cero reproduce exactamente la regresión anterior y respeta reduced flashing.
- HUD y datasets exponen fase, intensidad, agenda, evento, recuentos, silencio, efecto visual, módulos
  visitados y habitaciones alteradas para reproducir y auditar partidas sin editar código.

### Validación

- `npm run validate`: correcto; assets reproducibles, TypeScript strict, ESLint, 30 archivos/125 tests
  y build de producción (542 módulos).
- Soak lógico determinista de 20 minutos: apertura estable, fases crecientes, cero solapamiento de
  eventos, cooldowns respetados, máximo un blackout/tres shifts y reset idéntico para la misma seed.
- Tests de catálogo/propiedad/renderer verifican los 22 módulos, cobertura avanzada, arcos, pilares,
  humedad, persistencia del shift, visibilidad doblemente deshabilitada y conectividad intacta.
- Seis grafos de 1,024 salas vuelven a superar profundidad 500; la propiedad multiseed no detectó
  sockets inválidos, solapes ni repeticiones por encima de los límites configurados.
- `npm run test:e2e`: 16/16 en Chromium serial; cubre curva completa, silencio, paleta, blackout y
  restauración, recorrido de 180 salas con contenido avanzado, shift fuera de vista y toda la suite
  acumulada de movimiento, audio, procedural, streaming, iluminación y regresión visual.
- Capturas inspeccionadas a 1280×720: lectura arquitectónica normal, blackout oscuro pero navegable y
  paleta contextual sutil; no se aceptó la regresión que hacía visible una geometría deshabilitada.
- Headless Chromium usa explícitamente su fallback WebGL confiable y espera el handoff inicial antes
  de cronometrar movimiento; el test mantiene más de 50 FPS sin falsos context-loss.
- Bundle principal: 1,144.82 kB JS sin comprimir, 278.95 kB gzip y build en 423 ms; continúa muy por
  debajo del budget de producto y queda para inspección/división segura en Fase 9.

## Fase 8 — Salida controlada y final

- `ExitDirector` lógico y determinista: exige simultáneamente seis minutos y treinta habitaciones,
  evalúa una sola vez cada candidato apto y aplica la curva 2% + tiempo + exploración con tope 16%.
- Garantías por dieciocho minutos, 120 habitaciones o cinco rechazos tardíos fuerzan el siguiente
  candidato seguro hacia delante; `exitNow` usa el mismo camino en desarrollo/QA y no crea una salida
  especial fuera del sistema.
- Validación explícita de superficie, dimensiones, profundidad, visibilidad, aproximación, tags,
  navegación, alcance, agotamiento visual y posición frente al jugador. La salida reservada queda
  protegida contra descarga y layout shifts hasta terminar la experiencia.
- Pared integrada con el mismo papel pintado, respuesta lumínica irregular y cinco discontinuidades
  pixeladas deterministas; no usa neón, material de portal, collider nuevo ni luz dinámica adicional.
- Beacon Web Audio original de trece nodos con `PannerNode` HRTF, capas eléctricas sintetizadas,
  cancelación de fase por proximidad, corte rápido y cola grave al cruzar. Se registra en el budget y
  acompaña correctamente los rebases del origen flotante.
- Cruce por avance físico, sin tecla de uso: el trigger acumula 120 ms de intención válida incluso si
  la pared detiene el desplazamiento real. La transición de 820 ms reduce input, distorsiona textura,
  corta el buzz y funde a oscuro sin flash blanco.
- Pantalla final DOM accesible con título, agradecimiento, tiempo, habitaciones únicas, seed,
  copia de seed, nueva partida, repetición exacta, regreso al título y créditos. Todos los caminos
  reinician streaming, salida, tensión, audio, iluminación y origen sin recargar salvo nueva seed.
- Eventos `exitSpawned`/`exitEntered`, HUD y datasets cubren elegibilidad, probabilidad, garantía,
  reserva, protección, distancia, activación, transición, audio y finalización para QA reproducible.

### Validación

- `npm run validate`: correcto; doce assets reproducibles, TypeScript strict, ESLint, 36 archivos/
  150 tests y build de producción (550 módulos).
- Property sweep de salida: 1,000 simulaciones deterministas verifican que no aparezca prematuramente,
  que nunca elija candidatos inválidos y que reserve como máximo el primer candidato seguro tras la
  garantía; existen tanto finales probabilísticos como forzados.
- Tests focales: 27/27 para curva, garantías, reset, pared, trigger, audio direccional, transición,
  `reducedFlashing`, floating origin, cleanup, duración y parámetros QA.
- `npm run test:e2e`: 19/19 en Chromium serial; cubre spawn/protección, aproximación física, cruce,
  audio activo, fundido, pantalla final, repetición de la misma seed y toda la regresión acumulada.
- Regresiones visuales nuevas a 1280×720 para pared y pantalla final, inspeccionadas manualmente: la
  salida se percibe como papel incorrecto dentro del espacio y el final permanece legible sin flash.
- Bundle principal: 1,192.11 kB JS sin comprimir, 289.88 kB gzip; sigue muy por debajo de 30 MB y su
  partición segura queda como objetivo medido de la optimización final.

## Fase 9 — Optimización, compatibilidad y release QA

- Gate de capacidades previo a Babylon para WebGL2, Pointer Lock, Web Audio, almacenamiento y
  preferencia de movimiento reducido. Un navegador incompatible recibe un `alertdialog` explicativo
  con reintento/recarga; una limitación no esencial queda registrada sin impedir la partida.
- Recuperación real de `webglcontextlost`: pausa render, simulación, input y audio; conserva la sesión;
  espera la reconstrucción interna de Babylon; reaplica pipeline, materiales, luces, tensión y salida;
  y vuelve a una pausa segura que requiere un gesto nuevo para capturar el mouse.
- Monitor de profiling con ring buffers tipados y sin allocations en la ruta de registro, budgets
  versionados para frame time, draw calls, triángulos, meshes, habitaciones, luces, audio y heap, y
  datasets diagnósticos periódicos solo en modo debug.
- Analizador de build que recorre el grafo inicial, calcula raw/gzip, memoria decodificada y source
  maps, diferencia warning de fallo y hace que los presupuestos duros formen parte de `validate`.
- Producción sin source maps públicos, assets hasheados con cache inmutable, assets de nombre estable
  con revalidación corta, CSP/COOP/CORP/anti-framing/Permissions-Policy, MIME y compresión gzip en el
  servidor local equivalente usado para QA.
- Build bajo base path aislada en `dist-static/`, sin sustituir el candidato raíz de `dist/`; el smoke
  verifica subruta, favicon, avisos legales, ausencia de archivos fuente/requests externos y final
  jugable desde HTTP estático.
- Accesibilidad reforzada: `prefers-reduced-motion` activa por defecto la reducción de parpadeo cuando
  no existe una preferencia guardada, Créditos atrapa/restaura foco y expone atribución navegable, y
  los fallbacks gráficos mantienen nombre, estado ARIA y controles por teclado.
- Release `1.0.0` documentada con README, runbook de build/hosting/rollback, checklist de QA manual,
  créditos dentro/fuera del juego, catálogo de assets, MIT para código original, CC0 para assets
  originales y CC BY-SA 3.0 para el contenido adaptado, sin afirmar una frontera jurídica absoluta.
- CI instala Chromium, ejecuta lockfile, assets, TypeScript, lint, formato, unit/procedural, build,
  budgets y smoke E2E. La matriz local adicional cubre Chromium, Firefox y Edge actuales.

### Validación

- `npm run validate`: correcto; 12/12 assets reproducibles, TypeScript strict, ESLint, Prettier,
  42 archivos/180 tests, build de producción de 557 módulos y análisis de bundle.
- `npm run test:e2e`: 25/25 en Chromium serial, sin errores de consola; cubre título, ajustes, audio,
  pointer lock, movimiento, procedural, streaming, iluminación, tensión, recuperación WebGL real,
  accesibilidad, rendimiento, salida, final y reinicio de la misma seed.
- `npm run test:compat`: 6/6; flujo completo y fallback WebGL en Chromium 149.0.7827.55, Firefox
  151.0 y Edge 150.0.4078.65.
- `npm run test:static`: 1/1; build autosuficiente bajo `/threshold/`, headers/cache/MIME correctos,
  cero requests externos y partida terminada desde el artefacto estático.
- Soak de profiling: 1,064 transiciones acumuladas con reinicio; heap post-GC 19,107,808 →
  21,980,808 bytes (+2.74 MiB), 58–60 FPS finales, máximo 97 draw calls, 7,668 triángulos, 265
  meshes de escena, 33 habitaciones materializadas registradas y cero descargas visibles inválidas.
- Bundle final: transferencia inicial 365.11 KiB y total 572.10 KiB; JavaScript 1.81 MiB raw /
  454.71 KiB gzip, entrada 1.16 MiB raw / 288.39 KiB gzip, assets decodificados estimados
  833.13 KiB y 0 bytes de source maps públicos. Todos los budgets duros pasan.
- `npm audit --omit=dev` y `npm audit`: 0 vulnerabilidades; copias distribuidas de licencia/NOTICE de
  Babylon.js verificadas exactamente contra el paquete fijado.

**Estado final:** Fases 0–9 y Definition of Done completadas. La publicación pública permanece fuera
del alcance autorizado; el mismo artefacto fue validado mediante URL HTTP local de raíz y subruta.
