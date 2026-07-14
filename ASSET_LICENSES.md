# Licencias y procedencia de assets

## Assets de producción

Todos los assets visuales de runtime son trabajo original generado o dibujado localmente para este
repositorio. No se descargaron imágenes, texturas, modelos, fuentes ni sonidos externos.

Las texturas PNG se generan de forma determinista mediante
`tools/generate-assets/generate.ts`. `public/assets/generated/manifest.json` registra versión del
generador, semilla, dimensiones, función, SHA-256 y licencia SPDX de cada salida.

| Archivo                                        | Autor/procedencia                             | URL de origen | Licencia | Modificaciones                                 | Descarga  |
| ---------------------------------------------- | --------------------------------------------- | ------------- | -------- | ---------------------------------------------- | --------- |
| `public/assets/generated/wall-paper.png`       | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Receta original de albedo de papel tapiz       | No aplica |
| `public/assets/generated/wall-stained.png`     | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Variante original con manchas y humedad        | No aplica |
| `public/assets/generated/wall-normal.png`      | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Normal map derivado de la receta original      | No aplica |
| `public/assets/generated/carpet.png`           | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Albedo original de alfombra seca               | No aplica |
| `public/assets/generated/carpet-wet.png`       | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Alias uniforme compatible con slots históricos | No aplica |
| `public/assets/generated/carpet-normal.png`    | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Normal map derivado de la receta original      | No aplica |
| `public/assets/generated/ceiling-tile.png`     | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Albedo original de panel de techo              | No aplica |
| `public/assets/generated/trim.png`             | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Albedo original de zócalo                      | No aplica |
| `public/assets/generated/fixture-housing.png`  | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Carcasa original de luminaria                  | No aplica |
| `public/assets/generated/fixture-tube.png`     | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Emissive original de tubo encendido            | No aplica |
| `public/assets/generated/fixture-tube-off.png` | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Variante original de tubo apagado              | No aplica |
| `public/assets/generated/column.png`           | Contribuyentes del proyecto; generación local | No aplica     | CC0-1.0  | Albedo original de pilares                     | No aplica |
| `public/favicon.svg`                           | Contribuyentes del proyecto; SVG local        | No aplica     | CC0-1.0  | Marca geométrica “T” creada para THRESHOLD     | No aplica |

La dedicación CC0 se refiere a esos archivos originales. No relicencia el contenido adaptado
descrito en [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md).

## Audio

No existen archivos de audio descargados o pregrabados. Los sonidos se sintetizan en runtime con
Web Audio API a partir de recetas originales en:

- `src/audio/AmbientDirector.ts` y `src/audio/FluorescentHum.ts` (capas de ambiente);
- `src/audio/ProceduralAudioBank.ts` y `src/audio/FootstepSystem.ts` (pasos y texturas húmedas);
- `src/audio/LightingAudioBridge.ts` (eventos eléctricos);
- `src/exit/ExitAudioBeacon.ts` (señal direccional y transición final).

Las salidas sonoras producidas exclusivamente por esas recetas originales se ofrecen bajo
CC0-1.0. El código que implementa las recetas se rige por [`LICENSE-CODE.md`](LICENSE-CODE.md).

## Geometría y materiales

Las habitaciones, colliders, luminarias y anomalías se construyen en runtime desde datos y código
del repositorio; no hay archivos de modelos 3D. Los materiales combinan únicamente las texturas
enumeradas arriba con parámetros Babylon.js.

## Capturas de regresión

| Archivos                                   | Procedencia                                | Licencia     | Uso                                   |
| ------------------------------------------ | ------------------------------------------ | ------------ | ------------------------------------- |
| `tests/e2e/visual.spec.ts-snapshots/*.png` | Render local de seeds fijas                | CC BY-SA 3.0 | Referencia visual de Level 0 adaptado |
| `tests/e2e/exit.spec.ts-snapshots/*.png`   | Render local de la salida y pantalla final | CC BY-SA 3.0 | Referencia visual y de UI             |

Estas capturas son fixtures de prueba y no se cargan en runtime. Se mantienen bajo CC BY-SA 3.0
por cautela, ya que representan visualmente el contenido adaptado.

## Exclusiones

Directorios temporales como `dist/`, `test-results/`, `playwright-report/` y otros reportes locales
de Playwright no son fuentes de assets ni forman parte del artefacto versionado. Los iconos y
fuentes internos que Playwright incluya en sus reportes conservan las licencias de Playwright y no
se redistribuyen con el juego.

La lista de software de terceros y sus avisos se encuentra en [`CREDITS.md`](CREDITS.md) y
`public/legal/`.
