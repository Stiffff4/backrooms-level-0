# Problemas conocidos

## Convenciones

- **Bloqueante:** impide cumplir la fase actual o ejecutar el juego.
- **No bloqueante:** limitación comprobada que no invalida el producto.
- **Pendiente de QA manual:** requiere percepción humana o hardware no automatizable.

## Estado de release 1.0.0

- El bloqueo reproducible de salida invisible en `threshold-2026-07-14 / room-0137` fue corregido y confirmado por QA humano: la pared activa la transición y el recorrido llega a “Gracias por jugar”. La nueva señal visual reforzada requiere una última comprobación perceptiva en la PC objetivo.
- No hay tests ignorados, fallos de consola conocidos, assets de procedencia desconocida ni
  vulnerabilidades npm detectadas en el lockfile actual.

## QA perceptivo pendiente del pulido

- Confirmar en hardware real la nueva cadencia de pisadas al caminar/correr, la diferencia ON/OFF del
  head bob, el tiempo de frenado y la ausencia de eventos residuales al detenerse.
- Confirmar que habitaciones visibles ya no cambian bruscamente de oscuras a iluminadas al cruzar un
  umbral y que el fade del pool no produce bombeo evidente.
- Confirmar que la pared de salida es inequívocamente parpadeante tanto en modo normal como con
  `reducedFlashing`, sin z-fighting ni destellos incómodos.
- Confirmar que las manchas regeneradas se perciben como humedad irregular y que el one-shot eléctrico
  ya no se interpreta como pirotecnia.

## Limitaciones no bloqueantes

- La build segura permanece cerca de sus ceilings raw ajustados: entry ~2.09 MiB frente a 2.25 MiB y JavaScript total ~3.07 MiB frente a 3.25 MiB. El analyzer lo mantiene como warning y las transferencias siguen en ~478 KiB inicial / ~686 KiB total. No se reactivó la minificación que previamente rompía el render.
- `npm audit --omit=dev` informa 0 vulnerabilidades. El audit completo informa una vulnerabilidad baja de desarrollo en `esbuild@0.28.0`; actualizar a 0.28.1 requiere volver a validar visualmente la build de producción porque este repositorio ya tuvo incompatibilidades de render ligadas a la minificación.
- El entry JavaScript mide 1.16 MiB raw / 288.39 KiB gzip y queda a menos de 15 % de sus ceilings de
  1.25 MiB / 320 KiB. Es un warning explícito del analyzer, no un budget excedido; descarga inicial
  completa (365.11 KiB) y total (572.10 KiB) permanecen muy por debajo de 30/80 MiB.
- Los benchmarks automatizados se ejecutaron en Chromium headless con ANGLE/SwiftShader. Demuestran
  límites, estabilidad y ausencia de crecimiento evidente, pero no sustituyen un perfil de frame
  pacing en la GPU física mínima que el distribuidor elija como soporte.
- La percepción de fatiga del buzzing, localización HRTF con distintos audífonos, shimmer/gamma,
  comodidad del flicker y ritmo subjetivo de una partida natural de 10–20 minutos requiere QA humano.
  Señal, curvas, sincronización, regresiones visuales y recorrido completo sí están automatizados.
- Escape está reservado por algunos runners headless. El E2E intenta la tecla real y usa
  `document.exitPointerLock()` como abstracción segura si el runner no la entrega; Chromium, Firefox y
  Edge verificaron la transición estándar de Pointer Lock.
- Safari, navegadores móviles, gamepad y pantallas táctiles están fuera del alcance de la versión 1.0,
  que exige navegador desktop, teclado y mouse.
- La adaptación está atribuida y licenciada de forma conservadora, pero el alcance jurídico de
  Share-Alike debe revisarse antes de monetizar o relicenciar el producto.

## Publicación

- No se realizó deploy público porque el alcance lo prohíbe. La misma build fue probada mediante HTTP
  local desde raíz y `/threshold/`, con headers, cache, MIME, avisos legales y recorrido hasta el final.
  HTTPS, CDN, dominio, invalidación y rollback del proveedor quedan como acciones del operador descritas
  en `docs/RELEASE_RUNBOOK.md`, no como defectos del juego.
