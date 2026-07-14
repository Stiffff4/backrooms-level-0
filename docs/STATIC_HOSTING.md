# Hosting estático y headers

THRESHOLD es una aplicación de una sola página sin backend ni rutas de aplicación. El host solo
debe servir los archivos generados en `dist/`; los query params de seed y debug no requieren
rewrites.

## Base path

La base se fija **en tiempo de build**:

```powershell
# https://example.com/
Remove-Item Env:VITE_BASE_PATH -ErrorAction SilentlyContinue
npm run build

# https://example.com/threshold/
$env:VITE_BASE_PATH = '/threshold/'
npm run build
```

La variable debe comenzar y terminar en `/`. `vite.config.ts` normaliza el valor, pero usar la forma
canónica evita confusiones operativas.

No hace falta fallback a `index.html` para rutas arbitrarias porque el juego no usa un router. Sí
debe preservarse la query string, por ejemplo `?seed=threshold-001`.

## Artefacto

Publica el contenido de `dist/` de modo que `index.html` quede en la raíz o subruta configurada. El
build es autosuficiente: no necesita npm, Node, Vite, una API ni un CDN externo en runtime.

Requisitos del servidor:

- HTTPS;
- HTTP/2 o HTTP/3 recomendado, no obligatorio;
- compresión Brotli o gzip para HTML, JS, CSS, JSON, SVG, TXT y sourcemaps;
- byte ranges no son necesarios para los assets actuales;
- MIME types correctos;
- query strings preservadas;
- sin transformación de PNG ni minificación adicional del JS.

## Política de cache

| Ruta                    | Política recomendada                    | Motivo                               |
| ----------------------- | --------------------------------------- | ------------------------------------ |
| `index.html`            | `no-cache, max-age=0, must-revalidate`  | Debe descubrir bundles nuevos        |
| `assets/*.{js,css,map}` | `public, max-age=31536000, immutable`   | Vite añade hash a los bundles        |
| `assets/generated/*`    | `public, max-age=3600, must-revalidate` | Los nombres de texturas son estables |
| `legal/*`, `_headers`   | `public, max-age=3600, must-revalidate` | Avisos estables pero corregibles     |

No apliques `immutable` a todo `/assets/`: los chunks JS/CSS de Vite llevan hash, pero las texturas
procedurales conservan nombres estables entre releases. Verifica que el formato de reglas de tu
plataforma interprete los patrones por extensión de `public/_headers`; si necesita regex, tradúcelos
a archivos de primer nivel con hash y excluye `assets/generated/`.

## Headers de seguridad

`public/_headers` se copia a `dist/_headers` y es interpretado por hosts compatibles como Netlify y
Cloudflare Pages. Sus reglas específicas de cache están listas para una publicación en la raíz del
host. Si el artefacto se monta bajo una subruta, añade ese prefijo a las reglas de `index.html`,
`assets/` y `legal/` en la configuración de la plataforma. La regla global `/*` de seguridad sí
cubre cualquier profundidad. Otros hosts deben traducir las mismas políticas:

| Header                         | Valor baseline                                              |
| ------------------------------ | ----------------------------------------------------------- |
| `Content-Security-Policy`      | Solo origen propio; sin scripts remotos, objetos ni framing |
| `Cross-Origin-Opener-Policy`   | `same-origin`                                               |
| `Referrer-Policy`              | `strict-origin-when-cross-origin`                           |
| `X-Content-Type-Options`       | `nosniff`                                                   |
| `X-Frame-Options`              | `DENY`                                                      |
| `Cross-Origin-Resource-Policy` | `same-origin`                                               |
| `Permissions-Policy`           | Deshabilita cámara, micrófono y geolocalización             |

La CSP permite `data:` solo para imágenes. Mantiene una excepción `style-src 'unsafe-inline'`
porque la UI y las transiciones actuales actualizan propiedades CSS en elementos DOM; esa excepción
no se extiende a scripts. No permite `unsafe-eval`, scripts inline, `http:`, `https:` genérico, blob
workers ni CDNs. Si una plataforma añade analytics o scripts por inyección, desactívalos en lugar
de ampliar la CSP sin revisión.

HSTS puede añadirse únicamente cuando **todo el origen** y, si se usa `includeSubDomains`, todos sus
subdominios funcionan permanentemente por HTTPS. No se incluye por defecto porque una configuración
incorrecta es difícil de revertir.

## Netlify o Cloudflare Pages

Configuración de build:

```text
Build command: npm run build
Publish/output directory: dist
Node version: 24
Environment: VITE_BASE_PATH=/        # o /threshold/
```

El archivo `dist/_headers` debe conservarse. No configures una función, un adapter SSR ni un rewrite
SPA global. Mantén desactivada cualquier inyección de analytics no requerida.

## GitHub Pages

GitHub Pages no procesa `_headers`. Para un repositorio publicado como `/nombre-repo/`, compila con:

```powershell
$env:VITE_BASE_PATH = '/nombre-repo/'
npm run build
```

Publica el contenido de `dist/` mediante el mecanismo autorizado. Los headers de seguridad y cache
quedan limitados por Pages; no declares paridad con la configuración recomendada sin verificar las
respuestas reales.

## Object storage y CDN

1. Crea un origin privado o de solo lectura pública según la plataforma.
2. Sube `dist/` preservando rutas y Content-Type.
3. Aplica cache por patrón según la tabla anterior.
4. Configura HTTPS y los headers de seguridad en el CDN.
5. No habilites fallback a otra aplicación ni a un backend.
6. Promueve el release atómicamente y conserva el origin/artifact anterior para rollback.

## Nginx, ejemplo conceptual

Ajusta dominio y prefijo antes de usarlo:

```nginx
location = /threshold/index.html {
    add_header Cache-Control "no-cache, max-age=0, must-revalidate" always;
}

location ~ ^/threshold/assets/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css|map)$ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
}

location ^~ /threshold/assets/generated/ {
    add_header Cache-Control "public, max-age=3600, must-revalidate" always;
}

location /threshold/ {
    try_files $uri $uri/ =404;
}
```

Añade los headers de seguridad a nivel `server` o replica el contenido de `public/_headers` con
`add_header ... always`. Recuerda que redefinir `add_header` dentro de un `location` puede impedir
la herencia de headers del nivel superior; verifica la respuesta final, no solo la configuración.

## Verificación desde PowerShell

```powershell
$base = 'https://example.com/threshold/'
$index = Invoke-WebRequest -Method Head $base
$index.StatusCode
$index.Headers['Cache-Control']
$index.Headers['Content-Security-Policy']
$index.Headers['X-Content-Type-Options']
```

Obtén del HTML o del panel de red la ruta real `assets/index-<hash>.js` y comprueba:

```powershell
$bundle = Invoke-WebRequest -Method Head "${base}assets/index-<hash>.js"
$bundle.Headers['Content-Type']
$bundle.Headers['Cache-Control']
```

La prueba final siempre se hace sobre la URL pública autorizada y en ventana privada. Consulta el
smoke y rollback en [`RELEASE_RUNBOOK.md`](RELEASE_RUNBOOK.md).
