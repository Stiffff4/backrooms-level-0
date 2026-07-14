# Runbook de release

Este procedimiento prepara un artefacto estático reproducible. No autoriza un push ni un
despliegue: esas acciones requieren una instrucción explícita del propietario del proyecto.

## 1. Datos de la release

Registra antes de empezar:

- commit exacto;
- fecha y responsable;
- sistema operativo;
- versiones de Node y npm;
- navegador y GPU usados en QA;
- ruta pública objetivo (`/` o una subruta);
- artefacto anterior que servirá de rollback.

Comandos de inventario:

```powershell
git status --short
git rev-parse HEAD
node --version
npm --version
```

Una release debe salir de un commit intencional, sin cambios locales ajenos y sin reportes de
prueba accidentales. `dist/`, `test-results/`, `playwright-report/` y cualquier reporte temporal no
son fuentes de release.

## 2. Instalación reproducible

Desde un checkout limpio:

```powershell
npm ci
npm run assets:check
```

`npm ci` usa el lockfile y reemplaza `node_modules`; no lo ejecutes en un directorio donde necesites
conservar cambios manuales dentro de dependencias.

## 3. Gates automáticos

```powershell
npm run validate:release
```

No publiques con fallos ignorados. `validate` incluye assets, TypeScript, lint, formato, Vitest,
build y budgets. La suite principal usa Chromium; la configuración de compatibilidad añade Firefox y Edge, y la
configuración estática reconstruye bajo `/threshold/`, sirve con `tools/serve-dist.mjs` y verifica
headers, MIME, cache, ausencia de requests externos y un final jugable. E2E se ejecuta después de
`validate` porque necesita una build de `dist/`. Los comandos individuales siguen disponibles como
`test:e2e`, `test:compat` y `test:static` para aislar un fallo.

Revisión adicional de dependencias:

```powershell
npm audit --omit=dev
```

Evalúa cada hallazgo según si el código vulnerable llega al bundle y según la ruta explotable. No
hagas upgrades mayores durante una release solo para silenciar un reporte.

## 4. QA manual

Completa [`MANUAL_QA.md`](MANUAL_QA.md) en Chromium, Edge y Firefox actuales. Como mínimo, conserva
evidencia de:

- título, navegación por teclado y advertencia de parpadeo;
- gesto de entrada, audio y pointer lock;
- movimiento, sprint, colisión, pausa y pérdida de foco;
- mundo procedural y seed reproducible;
- streaming y rendimiento sostenido;
- salida, final y repetición de seed;
- modo de parpadeo reducido;
- build real desde la ruta pública objetivo.

Playwright automatiza un smoke de Chromium, Edge y Firefox mediante `playwright.compat.config.ts`.
La evaluación sensorial y una partida completa en cada navegador siguen siendo gates manuales.

## 5. Build definitivo

### Dominio raíz

```powershell
Remove-Item Env:VITE_BASE_PATH -ErrorAction SilentlyContinue
npm run build:analyze
```

### Subruta

Para `https://example.com/threshold/`:

```powershell
$env:VITE_BASE_PATH = '/threshold/'
npm run build:analyze
```

No reutilices un `dist/` compilado para otra base. Vite vacía y vuelve a generar el directorio en
cada build.

## 6. Inspección del artefacto

Ejecuta primero el analizador reproducible y sus budgets versionados:

```powershell
npm run analyze:build
```

Para conservar evidencia legible por máquinas:

```powershell
npm run analyze:build -- --report reports/build-performance.json
```

El comando sale con error cuando se supera un budget duro. Los avisos de margen inferior al 15 %
deben revisarse, aunque no bloquean por defecto.

```powershell
Get-ChildItem dist -Recurse -File |
  Sort-Object Length -Descending |
  Select-Object -First 20 FullName, Length

$files = Get-ChildItem dist -Recurse -File
$bytes = ($files | Measure-Object Length -Sum).Sum
[pscustomobject]@{ Files = $files.Count; Bytes = $bytes; MiB = [math]::Round($bytes / 1MB, 2) }
```

Comprueba además:

- `dist/index.html` referencia rutas con la base esperada;
- están los 12 PNG y `manifest.json` en `dist/assets/generated/`;
- existen `dist/legal/NOTICE.txt`, `PROJECT-MIT.txt`, la licencia Apache y el NOTICE de Babylon.js;
- `dist/_headers` está presente para hosts que interpretan ese formato;
- no hay secretos, tokens, `.env`, reportes de Playwright ni assets desconocidos;
- los MIME types serán correctos para HTML, JS, CSS, JSON, PNG, SVG, TXT y sourcemaps si se sirven.

Escaneo orientativo de URLs y APIs de red en fuentes runtime:

```powershell
rg -n "https?://|fetch\(|XMLHttpRequest|WebSocket|EventSource" src public index.html vite.config.ts
```

El namespace `http://www.w3.org/2000/svg` del favicon es metadato XML, no una petición. Cualquier
otra URL inesperada debe investigarse.

## 7. Smoke local del artefacto

```powershell
npm run serve:dist -- --host 127.0.0.1 --port 4174
```

En otra terminal:

```powershell
Invoke-WebRequest -Method Head http://127.0.0.1:4174/ | Select-Object StatusCode, Headers
```

Para una build con base `/threshold/`, inicia
`npm run serve:dist -- --base /threshold/ --host 127.0.0.1 --port 4174` y abre
`http://127.0.0.1:4174/threshold/?debug=1&exitNow=1&noAudio=1&seed=release-smoke`.

`serve:dist` sirve solo para verificar el build; no es el servidor público.

## 8. Empaquetado e integridad

```powershell
$commit = (git rev-parse --short HEAD).Trim()
$artifact = "threshold-$commit.zip"
Compress-Archive -Path dist\* -DestinationPath $artifact -Force
Get-FileHash $artifact -Algorithm SHA256
```

Conserva juntos el ZIP, su SHA-256, el commit y el resultado de QA. Verifica que al extraer el ZIP
`index.html` quede en la raíz del directorio público, no dentro de un segundo `dist/`.

## 9. Despliegue estático

Sigue [`STATIC_HOSTING.md`](STATIC_HOSTING.md). Requisitos no negociables:

- HTTPS;
- subida atómica o release versionada;
- `index.html` con revalidación, no cache largo;
- cache inmutable solo para bundles con hash;
- cache corta/revalidable para `assets/generated/`, cuyos nombres son estables;
- headers de seguridad equivalentes a `public/_headers`;
- no ejecutar `vite preview` en producción;
- no añadir CDN runtime de scripts, modelos, audio, imágenes o fuentes.

## 10. Smoke posterior al despliegue

Prueba la URL pública en una ventana privada:

1. carga sin errores de consola ni red;
2. título y créditos son accesibles;
3. `Entrar` inicia audio y solicita pointer lock;
4. movimiento, pausa y ajustes funcionan;
5. los assets responden 200 desde la base correcta;
6. la URL de QA con seed fija permite llegar a la salida y al final;
7. `Repetir semilla` conserva la semilla;
8. refrescar obtiene el `index.html` actual, no una versión vieja;
9. los headers de seguridad y cache son los esperados.

Ejemplos de inspección:

```powershell
$url = 'https://example.com/threshold/'
$response = Invoke-WebRequest -Method Head $url
$response.StatusCode
$response.Headers
```

Usa la URL real del bundle con hash para confirmar `Cache-Control: public, max-age=31536000,
immutable`. Usa `index.html` para confirmar revalidación.

## 11. Rollback

Precondición: conserva el último artefacto conocido como bueno antes de cambiar tráfico.

1. Detén nuevas promociones del artefacto defectuoso.
2. Reactiva o vuelve a subir **sin reconstruir** el ZIP anterior y verificado.
3. Invalida únicamente `index.html` y los paths estables que hayan cambiado; los bundles con hash
   pueden permanecer en cache.
4. Ejecuta el smoke corto de título, entrada, movimiento y salida.
5. Registra commit defectuoso, síntoma, navegador, seed, hora y decisión de rollback.
6. Corrige en un commit nuevo; no sobrescribas la evidencia del release fallido.

Si el problema es solo un header, vuelve a la configuración anterior conocida y verifica CSP,
cache y MIME antes de restaurar tráfico.

## 12. Diagnóstico rápido

### Pantalla vacía o error WebGL2

- Confirma navegador de escritorio actual y aceleración gráfica activa.
- Revisa `chrome://gpu` o la página equivalente del navegador.
- Evita escritorios remotos que deshabiliten WebGL2.
- La UI debe mostrar una explicación; si solo aparece negro, captura consola y seed.

### Assets 404 en una subruta

- Confirma que `VITE_BASE_PATH` coincidía exactamente con la ruta de publicación al compilar.
- Revisa que se subió el contenido de `dist/` al mismo prefijo.
- No arregles rutas editando el JS minificado; reconstruye con la base correcta.

### El audio no inicia

- Pulsa `Entrar`; el navegador bloquea audio antes del gesto.
- Revisa volumen del sistema, pestaña y buses de ajustes.
- Confirma que la pestaña está visible y que no se usó `noAudio=1`.

### Pointer lock no aparece

- Haz clic dentro de la pestaña y no dentro de un preview embebido o iframe restringido.
- Sirve por HTTPS en producción.
- Revisa políticas del navegador y extensiones.

### CSP bloquea la aplicación

- Identifica la directiva exacta en consola.
- Compara el host con `public/_headers` y [`STATIC_HOSTING.md`](STATIC_HOSTING.md).
- No amplíes la excepción de estilos a scripts ni añadas `unsafe-eval`, scripts remotos o comodines
  globales como solución rápida.

### Versión vieja después del deploy

- Comprueba que `index.html` no tenga cache inmutable.
- Purga solo HTML y assets de nombre estable.
- Los bundles con hash no deben sobrescribirse; una nueva build genera otra URL.

### Bug procedural

Registra URL, commit, seed, room ID, tiempo, dirección de entrada, preset, navegador, GPU y captura.
Reproduce primero con `?debug=1&seed=<semilla>`.
