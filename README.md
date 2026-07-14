# LEVEL 0 — THRESHOLD

Experiencia first-person de horror liminal para navegador. Está construida con Babylon.js,
TypeScript estricto, Vite, DOM y Web Audio API, y representa únicamente Level 0: no contiene
entidades, combate, inventario, backend ni telemetría.

El recorrido es procedural y reproducible por semilla, mantiene una burbuja de mundo con memoria
acotada y termina al atravesar una pared de salida parpadeante. El audio, las texturas y la
geometría se crean localmente desde recetas originales del repositorio.

## Requisitos

- Node.js 24 LTS (`.nvmrc` fija la línea usada por el proyecto).
- npm 10 o posterior.
- Navegador de escritorio actual con WebGL2 y aceleración gráfica activa.
- Teclado y mouse. Se recomiendan audífonos.

## Desarrollo local

En PowerShell, desde la raíz del repositorio:

```powershell
npm ci
npm run assets:check
npm run dev
```

Abre la URL que muestre Vite. El audio y el pointer lock solo se solicitan después de pulsar
`Entrar`, porque ambos dependen de un gesto del usuario.

Controles:

- `WASD`: caminar.
- Mouse: mirar.
- `Shift`: correr.
- `Esc`: liberar el pointer lock y pausar.

## Semillas y opciones de QA

La semilla puede fijarse en la URL:

```text
?seed=threshold-001
```

Opciones útiles para diagnóstico local:

```text
?debug=1&seed=threshold-001
?debug=1&quality=low
?debug=1&exitNow=1&noAudio=1&seed=release-smoke
```

`exitNow=1` solo se acepta en desarrollo o cuando también se declara `debug=1`. Estas opciones son
para QA; no cambian la ruta normal de una partida.

## Validación completa

```powershell
npm run validate:release
```

`validate` es el gate rápido de trabajo: assets, TypeScript, lint, formato, tests
unitarios/procedurales, build y budgets. `validate:release` lo ejecuta y añade la suite principal de
Playwright, el smoke Chromium/Firefox/Edge y una build autosuficiente bajo `/threshold/` con headers
de producción. La cobertura incluye inicio, audio, movimiento, streaming, iluminación, tensión,
accesibilidad, rendimiento, salida, final y repetición de semilla.

Para regenerar deliberadamente las texturas deterministas:

```powershell
npm run assets:generate
npm run assets:check
```

Los cambios de assets deben acompañarse de la actualización de su manifiesto y de
[`ASSET_LICENSES.md`](ASSET_LICENSES.md).

## Build de producción

Build para la raíz de un dominio:

```powershell
Remove-Item Env:VITE_BASE_PATH -ErrorAction SilentlyContinue
npm run build:analyze
```

Build para una subruta, por ejemplo `https://example.com/threshold/`:

```powershell
$env:VITE_BASE_PATH = '/threshold/'
npm run build:analyze
```

El artefacto publicable es el **contenido** de `dist/`. Para un smoke local con headers, MIME, cache
y compresión equivalentes al baseline:

```powershell
npm run serve:dist -- --host 127.0.0.1 --port 4174
```

Para el build de ejemplo bajo `/threshold/`, añade `--base /threshold/` al comando.

`serve:dist` y `vite preview` son herramientas locales de QA; ninguno es un servidor público de
producción.

Consulta el procedimiento completo, headers, verificación, rollback y diagnóstico en
[`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md). La prueba sensorial y de navegadores está en
[`docs/MANUAL_QA.md`](docs/MANUAL_QA.md).

## Estructura principal

```text
src/app/         ciclo de vida, estados y eventos
src/engine/      arranque Babylon, capacidades y recuperación WebGL
src/player/      input y controlador cinemático first-person
src/rooms/       catálogo modular, builders y materiales
src/world/       grafo, streaming, visibilidad y floating origin
src/rendering/   pipeline pixelado, calidad e iluminación
src/audio/       síntesis Web Audio, ambiente y pasos
src/tension/     curva ambiental y anomalías
src/exit/        elegibilidad, presentación y transición final
src/performance/ budgets y monitor de profiling acotado
src/ui/          título, pausa, ajustes, créditos y final
tests/           unitarios, procedurales, integración y E2E
tools/           generación y validación determinista de assets
public/          assets estáticos, headers y avisos legales del build
docs/            operación, release y QA manual
```

## Privacidad y dependencias de runtime

La aplicación no necesita backend, cuentas, cookies, analytics ni trackers. No carga imágenes,
audio, modelos, fuentes o scripts desde terceros en runtime. La única dependencia de runtime de npm
es `@babylonjs/core`; las demás dependencias directas son herramientas de desarrollo y validación.

## Créditos y licencias

- [`CREDITS.md`](CREDITS.md): atribución de la adaptación y software utilizado.
- [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md): contenido adaptado de Backrooms Wiki y CC BY-SA 3.0.
- [`ASSET_LICENSES.md`](ASSET_LICENSES.md): procedencia y licencia de cada familia de assets.
- [`LICENSE-CODE.md`](LICENSE-CODE.md): licencia del código original del proyecto.

Los avisos que deben acompañar al artefacto estático también se copian bajo `dist/legal/` desde
`public/legal/`. La separación documental de código, contenido y assets no pretende resolver por sí
sola el alcance jurídico de Share-Alike; revisa [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md) antes de
una publicación comercial.

## Fuente de verdad

[`MASTER_PLAN.md`](MASTER_PLAN.md) es la especificación autoritativa. Los registros verificables de
implementación son [`PROGRESS.md`](PROGRESS.md), [`DECISIONS.md`](DECISIONS.md) y
[`KNOWN_ISSUES.md`](KNOWN_ISSUES.md).
