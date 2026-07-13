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
