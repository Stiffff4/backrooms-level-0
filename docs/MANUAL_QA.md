# Checklist de QA manual

Esta lista complementa Vitest y Playwright. No marques un resultado si no se observó en la build y
el navegador indicados.

## Registro de sesión

| Campo                         | Valor |
| ----------------------------- | ----- |
| Commit                        |       |
| URL/base path                 |       |
| Fecha                         |       |
| Responsable                   |       |
| SO                            |       |
| CPU/RAM                       |       |
| GPU/driver                    |       |
| Resolución/escala de pantalla |       |
| Navegador y versión           |       |
| Dispositivo de audio          |       |
| Preset                        |       |
| Seed                          |       |

Estados sugeridos: `PASS`, `FAIL`, `BLOCKED`, `N/A`. Para cada fallo registra seed, room ID, minuto,
pasos de reproducción, captura y consola.

## Preparación

```powershell
npm ci
npm run validate:release
Remove-Item Env:VITE_BASE_PATH -ErrorAction SilentlyContinue
npm run build:analyze
npm run serve:dist -- --host 127.0.0.1 --port 4174
```

El smoke de subruta compila de forma aislada en `dist-static/`; no sustituye el artefacto de raíz en
`dist/`. El `build:analyze` posterior garantiza que el artefacto evaluado sea exactamente el candidato
de publicación.

Prueba primero sin extensiones y con aceleración gráfica activa. Repite el smoke de publicación en
la URL estática real y bajo su base path final.

## Matriz mínima

| Navegador             | Build local | URL estática | Resultado |
| --------------------- | ----------- | ------------ | --------- |
| Chromium actual       |             |              |           |
| Microsoft Edge actual |             |              |           |
| Firefox actual        |             |              |           |

Safari y móvil no forman parte del baseline de esta versión.

## 1. Carga, título y accesibilidad

- [ ] La página carga por HTTPS o localhost y no muestra errores de consola.
- [ ] Si WebGL2 no está disponible, aparece una explicación legible y una acción de recarga.
- [ ] Se ven título, introducción, controles, recomendación de audífonos y advertencia de luces.
- [ ] `Tab`, `Shift+Tab`, `Enter`, `Space` y `Esc` permiten operar título, ajustes y créditos.
- [ ] El foco es visible y vuelve al control anterior al cerrar Créditos.
- [ ] Los labels de sliders, selectores y toggles se anuncian de forma comprensible.
- [ ] Texto y controles conservan contraste y no quedan fuera de pantalla a 1280×720.
- [ ] A 200 % de zoom, los menús siguen siendo operables sin solapamientos críticos.
- [ ] Activar reducción de parpadeo antes de entrar reduce claramente flicker y transiciones.

## 2. Entrada, audio y pointer lock

- [ ] Antes de `Entrar` no se reproduce audio.
- [ ] Pulsar `Entrar` reanuda AudioContext y solicita pointer lock mediante el mismo gesto.
- [ ] El fade de entrada no contiene un flash intenso.
- [ ] El buzzing aparece sin click audible ni clipping.
- [ ] Rechazar pointer lock deja una UI recuperable.
- [ ] Pulsar dentro del canvas permite recuperarlo después.
- [ ] `Esc` libera pointer lock, pausa movimiento y reduce audio con fade.
- [ ] Cambiar de pestaña pausa/reduce audio; volver no mueve al jugador hasta reanudar.

## 3. Movimiento y colisiones

- [ ] `WASD` mueve en relación con la cámara y el mouse responde sin aceleración extraña.
- [ ] `Shift` aumenta velocidad sin stamina.
- [ ] Al soltar input hay frenado corto y controlado.
- [ ] No existe salto ni interacción `E`.
- [ ] El jugador no atraviesa paredes ni pilares.
- [ ] Esquinas y uniones no producen vibración, bump persistente o bloqueo.
- [ ] Cambios leves de suelo no causan caída por seams.
- [ ] FOV, sensibilidad, invertir Y y head bob cambian en vivo y persisten tras recargar.

## 4. Generación, streaming y seed

Abre `/?debug=1&seed=manual-streaming`.

- [ ] La misma seed inicia con la misma secuencia lógica y sala inicial.
- [ ] Se observan varias familias de salas, arcos, pilares, pasillos y variación de humedad.
- [ ] No se repite un mismo módulo más allá de los límites perceptibles configurados.
- [ ] Las habitaciones visibles o sus entradas no desaparecen.
- [ ] El streaming no causa pop-in grave en la dirección de avance.
- [ ] El contador de habitaciones activas sube y baja dentro de un rango estable.
- [ ] Tras exploración prolongada, meshes, rooms y audio nodes no crecen sin límite.
- [ ] Un rebase de floating origin no produce salto visual ni cambia posiciones relativas.
- [ ] Volver por un camino visible no altera paredes frente al jugador.

Haz una caminata sostenida de al menos 30 minutos para el gate de memoria y registra valores al
minuto 5, 15 y 30. Usa DevTools Performance/Memory sin mantener snapshots que alteren la medición.

## 5. Dirección visual e iluminación

- [ ] La imagen se lee como pixel art 3D detallado, no como una escena genérica borrosa.
- [ ] Pared, alfombra, techo, zócalos, manchas y luminarias tienen escala coherente.
- [ ] No hay seams graves, UV estiradas ni patrones rotos.
- [ ] Giro lento y strafe no producen shimmer insoportable.
- [ ] Los presets low/default/high cambian resolución y presupuesto sin deformar el canvas.
- [ ] El resize mantiene aspect ratio y UI nativa legible.
- [ ] Muchas luminarias visibles no crean una luz dinámica por fixture.
- [ ] Microflicker y fallos se sienten dirigidos, no random por frame.
- [ ] Reduced flashing suaviza flicker, blackout y salida sin ocultar información esencial.
- [ ] Blackout conserva geometría apenas legible y una ruta de escape.

Compara las seeds visuales y snapshots versionados cuando corresponda: `visual-corridor`,
`visual-pillars`, `visual-arches`, `visual-blackout` y `visual-exit`.

## 6. Audio con audífonos

- [ ] El ambiente contiene capas diferenciables y no revela un loop corto.
- [ ] No hay clicks al iniciar, pausar, cambiar de sala o reanudar.
- [ ] No hay clipping a volumen master máximo ni al sumar eventos.
- [ ] Pasos siguen distancia, alternan y aceleran al correr.
- [ ] Las variaciones húmedas corresponden a la sala.
- [ ] Volumen master, ambiente y pasos se pueden ajustar por separado.
- [ ] Un pop eléctrico coincide con un evento de luminaria.
- [ ] Un evento de silencio baja el buzz gradualmente y deja dominar los pasos.
- [ ] La salida se localiza direccionalmente a distancia razonable, no desde todo el mapa.
- [ ] Al cruzar la salida, el buzz se corta y el tono bajo es corto y no agresivo.

Repite un smoke con parlantes para comprobar que nada depende de una separación estéreo extrema,
pero usa audífonos para la evaluación principal.

## 7. Tensión y límites de contenido

- [ ] Los primeros minutos son estables y no aparece la salida en una partida normal.
- [ ] Las rarezas aumentan gradualmente sin spam.
- [ ] Layout shifts ocurren solo fuera de vista y no rompen conectividad.
- [ ] No aparecen entidades, siluetas, voces, pasos ajenos, persecuciones ni jumpscares.
- [ ] No hay combate, inventario, hambre, crafting, mapa o Level 1 jugable.
- [ ] La tensión procede de arquitectura, luz, sonido, repetición y desorientación.

## 8. Salida, final y reinicio

Para un smoke corto usa:

```text
/?debug=1&exitNow=1&seed=manual-exit
```

`exitNow` reserva el próximo candidato compatible; explora hacia delante hasta encontrarlo.

- [ ] La pared conserva el papel tapiz y presenta irregularidad/flicker sin verse como portal neón.
- [ ] El audio guía al acercarse sin stinger fuerte.
- [ ] No aparece prompt `Presiona E`.
- [ ] Caminar contra la pared durante el intervalo corto activa la transición.
- [ ] La transición reduce input, distorsiona brevemente, corta buzz y hace fade oscuro.
- [ ] No hay flash intenso con reduced flashing activo o desactivado.
- [ ] La pantalla muestra `LEVEL 0 — THRESHOLD`, agradecimiento, tiempo, rooms y seed.
- [ ] Copiar seed funciona o muestra un fallback entendible.
- [ ] `Repetir semilla` vuelve a gameplay con exactamente la misma seed.
- [ ] `Nueva partida` crea otra seed.
- [ ] Volver al menú deja título, audio y pointer lock en estado correcto.

Después del smoke forzado, valida una partida normal completa: no debe existir salida antes de los
mínimos configurados y la garantía debe impedir una sesión indefinida.

## 9. Context loss y recuperación

En DevTools, con una sesión iniciada:

```javascript
const canvas = document.querySelector('#game-canvas');
const gl = canvas?.getContext('webgl2');
gl?.getExtension('WEBGL_lose_context')?.loseContext();
```

- [ ] El juego se pausa y muestra una explicación en vez de quedar negro.
- [ ] La UI ofrece recargar o recuperarse según las capacidades del navegador.
- [ ] No continúa audio/movimiento a ciegas.
- [ ] La consola no entra en un bucle de errores.

La extensión puede no estar expuesta en todos los navegadores; marca `BLOCKED`, no `PASS`, si no se
pudo provocar.

## 10. Rendimiento

Mide en preset default, 1920×1080 de viewport y sin DevTools abierto salvo durante la captura.
Antes del recorrido, ejecuta
`npm run analyze:build` y adjunta el resumen del bundle a la sesión de QA.

| Métrica             |       Objetivo de trabajo | Inicial | 15 min | 30 min |
| ------------------- | ------------------------: | ------: | -----: | -----: |
| FPS                 |               60 objetivo |         |        |        |
| Frame time          |                   estable |         |        |        |
| Draw calls          | ideal <150; habitual <250 |         |        |        |
| Triángulos visibles |            ideal <250 000 |         |        |        |
| Luces dinámicas     |                       4–8 |         |        |        |
| Rooms con geometría |                     25–60 |         |        |        |
| Audio nodes         |           estable/acotado |         |        |        |
| JS heap             |  sin crecimiento continuo |         |        |        |

- [ ] No hay stutter frecuente al cruzar sockets.
- [ ] No hay allocations/GC perceptibles periódicos.
- [ ] Cambiar calidad reduce costo sin romper la sesión.
- [ ] La descarga inicial y total permanecen dentro de los budgets documentados.

## 11. Hosting y cache

- [ ] Root y/o subruta configurada abren directamente.
- [ ] Recargar conserva la query string y no produce 404.
- [ ] Todos los assets se sirven desde el mismo origen.
- [ ] HTML, JS, CSS, JSON, PNG, SVG y TXT tienen Content-Type correcto.
- [ ] `index.html` revalida y los bundles con hash son inmutables.
- [ ] Las texturas de nombre estable no reciben cache inmutable anual.
- [ ] CSP, `nosniff`, anti-framing y Permissions-Policy aparecen en respuestas.
- [ ] `dist/legal/` es accesible.
- [ ] No hay requests a trackers, analytics, fuentes o CDNs externos.

Consulta valores exactos y comandos HEAD en [`STATIC_HOSTING.md`](STATIC_HOSTING.md).

## Cierre

- [ ] Todos los `FAIL` tienen issue/entrada documentada y severidad.
- [ ] No hay `BLOCKED` en un criterio de Definition of Done.
- [ ] Se adjuntaron screenshots, traces o perfiles necesarios.
- [ ] Se registraron commit, seed, navegador, GPU y preset.
- [ ] El artefacto aprobado y su hash coinciden con el que se propone publicar.
