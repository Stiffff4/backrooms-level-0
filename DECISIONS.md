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

El entry inicial de Babylon mide aproximadamente 600 kB (141 kB gzip), muy por debajo del budget
de descarga. Un intento de dividir sus módulos internos con el agrupador avanzado de Rolldown
produjo un error de orden de inicialización (`MatrixTrackPrecisionChange`) en Chromium, por lo que
se descartó. El umbral informativo de Vite se fija en 700 kB y el bundle se seguirá midiendo con un
reporte propio en la Fase 9.
