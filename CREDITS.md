# Créditos

## THRESHOLD

Diseño del juego, implementación, geometría procedural, texturas procedurales, interfaz y síntesis
de audio: contribuyentes de este repositorio.

El proyecto no incorpora fotografías, modelos, grabaciones, música ni fuentes descargadas de
Internet. La interfaz utiliza fuentes del sistema y los sonidos se sintetizan en runtime mediante
Web Audio API.

## Adaptación de Backrooms Wiki

Esta obra adapta **“Level 0 — Threshold”** de Backrooms Wiki:

- Fuente: <https://backrooms-wiki.wikidot.com/level-0>
- Autoría acreditada: DivineAtlas, DrAkimoto y RobertGoerman, además de los contribuyentes
  identificados por el historial de revisiones de la página fuente.
- Licencia de la fuente: [Creative Commons Attribution-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/).
- Guía de licencias de la wiki: <https://backrooms-wiki.wikidot.com/licensing-guide>

Se adaptan el nombre y la descripción general de Level 0, sus elementos arquitectónicos y la idea
de una pared parpadeante como salida hacia Level 1. Los cambios y el alcance de la adaptación se
documentan en [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md).

No se copiaron imágenes de la wiki. Backrooms Wiki y sus contribuyentes no patrocinan ni respaldan
este proyecto.

## Software de runtime

| Componente        | Versión fijada | Uso                             | Licencia   | Proyecto                     |
| ----------------- | -------------- | ------------------------------- | ---------- | ---------------------------- |
| `@babylonjs/core` | 9.16.1         | Renderer y capa de motor WebGL2 | Apache-2.0 | <https://www.babylonjs.com/> |

La distribución estática incluye la licencia y el NOTICE suministrados por Babylon.js en
`public/legal/`. Babylon.js conserva sus propios avisos de copyright, patentes, marcas y
atribución.

## Herramientas de desarrollo

Las versiones exactas se fijan en `package-lock.json`.

| Herramienta                       | Licencia declarada por el paquete | Proyecto                                                                    |
| --------------------------------- | --------------------------------- | --------------------------------------------------------------------------- |
| TypeScript                        | Apache-2.0                        | <https://www.typescriptlang.org/>                                           |
| Vite                              | MIT                               | <https://vite.dev/>                                                         |
| Vitest                            | MIT                               | <https://vitest.dev/>                                                       |
| Playwright Test                   | Apache-2.0                        | <https://playwright.dev/>                                                   |
| ESLint y `@eslint/js`             | MIT                               | <https://eslint.org/>                                                       |
| typescript-eslint                 | MIT                               | <https://typescript-eslint.io/>                                             |
| Prettier y eslint-config-prettier | MIT                               | <https://prettier.io/>                                                      |
| fast-check                        | MIT                               | <https://fast-check.dev/>                                                   |
| `@types/node`                     | MIT                               | <https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node> |

Estas herramientas no aportan contenido audiovisual al juego. Sus licencias completas permanecen
en los paquetes instalados por npm.

## Mapa de licencias

- Código original del proyecto: [`LICENSE-CODE.md`](LICENSE-CODE.md).
- Contenido creativo adaptado: [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md).
- Assets originales y artefactos visuales: [`ASSET_LICENSES.md`](ASSET_LICENSES.md).
- Licencias y avisos de terceros incluidos en la build: `public/legal/`.

Esta atribución se basa en el contenido y metadatos verificables del repositorio. No sustituye
asesoría legal.
