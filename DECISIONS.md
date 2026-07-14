# Decisiones técnicas

## D-001 — Babylon.js modular con WebGL2 como baseline

**Estado:** aceptada — Fase 0.

El motor se importa desde rutas modulares de `@babylonjs/core`. El bootstrap exige WebGL2 y
produce un error comprensible cuando no está disponible. WebGPU no forma parte del baseline.

## D-002 — Estado lógico separado del renderer

**Estado:** aceptada — Fase 0.

La máquina de estados no depende de Babylon ni del DOM. Los sistemas procedurales, de balance y
de sesión seguirán esta separación para que puedan simularse con Vitest sin crear un contexto
gráfico.

## D-003 — Node 24 LTS y versiones exactas

**Estado:** aceptada — Fase 0.

El proyecto fija Node 24 en `.nvmrc` y versiones exactas mediante `package-lock.json`. Se usa
TypeScript 6.0.3, la versión estable más reciente dentro del rango soportado por
`typescript-eslint`; TypeScript 7 se descartó tras verificar su conflicto de peer dependencies.

## D-004 — Build estático con base configurable

**Estado:** aceptada — Fase 0.

`VITE_BASE_PATH` se normaliza en `vite.config.ts`. No se necesita runtime externo ni backend.

## D-005 — Chunk estable de Babylon y umbral medido

**Estado:** aceptada — Fase 0.

El entry del vertical slice con Babylon mide aproximadamente 1,009 kB (242 kB gzip), muy por
debajo del budget
de descarga. Un intento de dividir sus módulos internos con el agrupador avanzado de Rolldown
produjo un error de orden de inicialización (`MatrixTrackPrecisionChange`) en Chromium, por lo que
se descartó. El umbral informativo de Vite se fija en 1,100 kB y el bundle se seguirá midiendo con un
reporte propio en la Fase 9.

## D-006 — Collider posicionado por los pies

**Estado:** aceptada — Fase 1.

`spawnPoint` representa la base del collider. La altura de ojos pertenece únicamente a la cámara
hija. Esta convención evita intersecciones con techo y se mantendrá al conectar módulos.

## D-007 — Control cinemático sin motor de físicas

**Estado:** aceptada — Fase 1.

El jugador usa un mesh invisible con elipsoide, velocidad horizontal suavizada, gravedad explícita
y `moveWithCollisions`. No hay salto, stamina ni cuerpo visible. La telemetría de movimiento se
publica por frame para audio, estadísticas y pruebas.

## D-008 — Settings DOM versionados

**Estado:** aceptada — Fase 1.

Los ajustes viven en un store tipado e independiente del renderer. La persistencia incluye versión,
clamping y fallback si storage está corrupto, lleno o denegado. Título y pausa reutilizan controles
DOM nativos accesibles.

## D-009 — Pausa explícita por foco

**Estado:** aceptada — Fase 1.

Además de reaccionar a `pointerlockchange`, la aplicación pausa directamente en `blur` y cuando el
documento queda oculto. Esto evita depender de diferencias de pointer lock entre navegadores.

## D-010 — Web Audio completamente lazy y desacoplado de Babylon

**Estado:** aceptada — Fase 2.

Construir `GameAudioEngine` no crea un `AudioContext`; el grafo y todos los sonidos se materializan
solo dentro del gesto de entrada/reanudación. Los generadores reciben contexto y destinos por
inyección, por lo que no dependen del renderer ni de globals y pueden validarse con runtimes falsos.

## D-011 — Assets de audio originales por síntesis determinista

**Estado:** aceptada — Fase 2.

El lanzamiento no depende de descargas ni licencias de terceros para audio. Hum, buzz, ballast,
pop y cuatro variantes de alfombra se sintetizan localmente a partir de streams sembrados. Los
loops son periódicos, centrados en cero y con límites de amplitud; la misma seed reproduce la misma
variación sin acoplar audio y generación espacial.

## D-012 — Cadencia de pasos por distancia y voces acotadas

**Estado:** aceptada — Fase 2.

Los pasos consumen la distancia horizontal posterior a colisiones, no timers ni velocidad
solicitada. Esto conserva sincronía al chocar, pausar o rebasar el origen. Un límite por frame y un
límite global de ocho voces evitan ráfagas y crecimiento transitorio aun ante deltas anómalos.

## D-013 — El grafo lógico es la autoridad del mundo

**Estado:** aceptada — Fase 3.

`RoomGraphGenerator` produce instancias, transformaciones, sockets y conexiones sin depender de
Babylon. `ModularWorld` solo materializa ese resultado. Esta frontera permite probar centenares de
seeds sin WebGL y permitirá que streaming archive representación visual sin perder estado lógico.

## D-014 — Sockets cardinales y transformaciones discretas

**Estado:** aceptada — Fase 3.

Los módulos se conectan mediante sockets locales con posición, forward, ancho, alto y tags. Solo se
permiten rotaciones de cuarto de vuelta; la transformación candidata se deriva de la pose de ambos
sockets y se acepta después de comprobar compatibilidad, alineación y AABB. Se evita así acumular
error flotante y se conserva una prueba exacta de reciprocidad.

## D-015 — Geometría por habitación con seams físicos separados de los visuales

**Estado:** aceptada — Fase 3.

Los materiales se comparten globalmente y las piezas estáticas se combinan por categoría dentro de
cada habitación. El suelo visible termina en el footprint; un collider invisible sobresale 6 cm por
lado para proteger el cruce, mientras paredes, linteles y zócalos quedan completamente dentro de su
módulo. Así no hay z-fighting en juntas y el streaming puede disponer una habitación como unidad.

## D-016 — Fase 3 finita, preparada para streaming incremental

**Estado:** aceptada — Fase 3.

La integración actual materializa un grafo determinista de 18 habitaciones para validar catálogo,
movimiento y visitas de extremo a extremo. No se presenta como mundo infinito: la Fase 4 sustituirá
la materialización total por generación incremental, ventana activa, archivo lógico y floating origin
sin cambiar el contrato de módulos ya probado.

## D-017 — Horizonte lógico largo con espina profunda

**Estado:** aceptada — Fase 4.

La sesión genera 1,024 `RoomInstance` sin representación Babylon y selecciona la frontera más
profunda en siete de cada ocho expansiones; la octava mantiene ramificaciones. El resultado conserva
la sensación de exploración abierta y ofrece rutas de cientos de módulos sin prometer una profundidad
idéntica para cada seed (458–773 en la auditoría de 128 seeds). Una seguridad lógica de 2,048 limita
el grafo; la experiencia final termina antes de agotar ese horizonte.

## D-018 — Burbuja por distancia de grafo y presupuesto duro

**Estado:** aceptada — Fase 4.

El streamer materializa tres saltos como activos y el cuarto como precarga, con máximo 60. Salas
actuales o protegidas son obligatorias; el preload restante se prioriza determinísticamente. Los swaps
descargan primero y restauran recursos previos si una carga falla, evitando picos y estados parciales.
La sincronización directa del renderer conserva snapshots de vistas activas y pooled para ofrecer el
mismo rollback si Babylon falla al construir una vista entrante.

## D-019 — Visibilidad conservadora limitada por niebla

**Estado:** aceptada — Fase 4.

Solo se inspeccionan las vistas cargadas cuando cambia la sala. Se conservan geometrías dentro del
frustum y antes de `fogEnd`, dentro de una distancia de seguridad, y vecinos detrás de sockets cuya
entrada puede verse. Una verificación posterior convierte cualquier desaparición protegida en error
observable en vez de aceptar pop-in silencioso. Esa verificación consulta las vistas realmente
cargadas por `ModularWorld`, de forma independiente al set pretendido por `ChunkStreamer`.

## D-020 — LRU pequeña para backtracking, materiales compartidos fuera del pool

**Estado:** aceptada — Fase 4.

Hasta ocho vistas descargadas permanecen deshabilitadas y se reutilizan al volver; la novena expulsa
la menos reciente. El pool nunca cuenta como habitación activa y está incluido en los budgets de
recursos de escena. Texturas/materiales procedurales siguen compartidos y se liberan solo con el mundo.

## D-021 — Floating origin conserva el espacio lógico

**Estado:** aceptada — Fase 4.

Al alcanzar 240 m locales, el origen acumula la posición lógica del jugador y devuelve el delta
opuesto para mundo y jugador. El grafo no se modifica. `ModularWorld` conserva ese offset para vistas
pooled y futuras cargas. En `debug` se usa 40 m para cubrir múltiples rebases en E2E; producción
mantiene 240 m. El reset devuelve el delta inverso y pone métricas/offset a cero.

## D-022 — Niebla lineal como frontera de streaming verificable

**Estado:** aceptada — Fase 4.

La escena usa fog lineal del mismo tono que `clearColor`, de 16 a 44 m. Su final es también el límite
de protección por frustum/entradas, por lo que renderer, visibilidad y streaming comparten una frontera
mensurable que podrá ser afinada por el pipeline visual sin cambiar el contrato lógico.

## D-023 — Buffer interno real y UI fuera del pixelado

**Estado:** aceptada — Fase 5.

Cada preset fija la altura del framebuffer Babylon en 240, 360 o 480 píxeles y calcula el ancho por
aspecto. El canvas ocupa el viewport mediante CSS con escalado nearest-neighbor, mientras título,
pausa, ajustes y HUD siguen siendo DOM nativo. Un único owner coalesce resize y cambio de preset para
evitar buffers transitorios o listeners duplicados.

## D-024 — Arte procedural determinista, versionado y CC0

**Estado:** aceptada — Fase 5.

Las texturas raster se generan con una herramienta local determinista y se versionan junto con un
manifiesto de hashes. Se prefieren activos originales pequeños y coherentes a descargas externas; el
catálogo y la licencia CC0-1.0 se documentan en `ASSET_LICENSES.md`. `assets:check` forma parte de la
validación para detectar cualquier asset ausente o desactualizado.

## D-025 — Materiales compartidos con UV en unidades físicas

**Estado:** aceptada — Fase 5.

Las once variantes visuales comparten texturas y materiales por escena. Los builders producen UVs a
escala física, aplican offsets derivados del stream visual de la habitación y los conservan al
combinar geometría. Mipmaps, filtrado trilineal y anisotropía limitada reducen shimmer sin suavizar el
pixel art; los normal maps se deshabilitan en `low`.

## D-026 — Un postproceso espacial estable

**Estado:** aceptada — Fase 5.

Color grade, cuantización, dithering Bayer y grano espacial viven en un solo postproceso. Sus patrones
dependen de la coordenada del píxel interno, no del tiempo, por lo que una cámara inmóvil produce la
misma imagen. `reducedFlashing` elimina grano y `dithering` puede desactivarse sin reconstruir recursos.

## D-027 — Presets como política única de coste visual

**Estado:** aceptada — Fase 5.

`QualityManager` aplica en una transacción resolución, fog, normales, anisotropía y el presupuesto de
luces de la fase siguiente. Los sistemas ya existentes consumen la política inmediatamente; el campo
de luces queda tipado y probado para que `LightPool` lo haga efectivo en Fase 6 sin duplicar tablas de
calidad ni cambiar la persistencia de ajustes.

## D-028 — Emisión por vertex colors dentro de geometría combinada

**Estado:** aceptada — Fase 6.

Cada fixture recibe un slice RGBA no solapado en el buffer de colores de su mesh emisor combinado.
`LightingDirector` actualiza solo los slices cuyo valor cambió y agrupa la subida por mesh. Esto hace
visible cada curva sin recuperar un mesh o material por luminaria y conserva el batching de Fase 3.

## D-029 — Pool físico fijo y presupuesto lógico por calidad

**Estado:** aceptada — Fase 6.

Se crean exactamente ocho `PointLight` al iniciar la escena y se reutilizan por id estable. Los presets
habilitan 4, 6 u 8; visibilidad, sala activa, salida, flicker y distancia determinan una prioridad
reproducible. Ninguna luz proyecta sombras y una sala apagada no invalida proxies asignados a salas
vecinas precargadas.

## D-030 — Curvas absolutas con semillas, nunca azar por frame

**Estado:** aceptada — Fase 6.

Las seis curvas fluorescentes se evalúan a 30 Hz usando tiempo absoluto y seed del fixture. Los fallos
tienen ventanas e ids estables, lo que permite reproducirlos, pausar sin deriva y deduplicar eventos.
`reducedFlashing` transforma esas mismas curvas y limita sus extremos en vez de mantener dos sistemas.

## D-031 — Una muestra para luz, emisión y sonido

**Estado:** aceptada — Fase 6.

`LightingFrameSnapshot` es el único puente hacia Web Audio: determina intensidad global, hasta cuatro
fuentes posicionales y pops de fallo. Las voces se preasignan y se reasignan; no existe un `PannerNode`
por fixture. Los perfiles de habitación son exhaustivos para que iluminación, buzz, ambiente y reverb
no diverjan al añadir módulos.

## D-032 — Playwright serial para escenarios WebGL temporales

**Estado:** aceptada — Fase 6.

Los tests de una aplicación WebGL comparten GPU y temporizadores del host; siete workers simultáneos
introdujeron timeouts y desplazamientos falsos que desaparecieron al repetir cada caso aisladamente.
La suite fija un worker: la cobertura sigue completa y movimiento, streaming, audio y screenshots se
miden sin competencia artificial por el mismo dispositivo gráfico.
