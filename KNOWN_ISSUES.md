# Problemas conocidos

## Convenciones

- **Bloqueante:** impide cumplir la fase actual o ejecutar el juego.
- **No bloqueante:** limitación comprobada que no invalida el producto.
- **Pendiente de QA manual:** requiere percepción humana o hardware no automatizable.

## Estado de release 1.0.0

- El bloqueo reproducible de salida invisible en `threshold-2026-07-14 / room-0137` fue corregido en código y cubierto por regresión; queda pendiente confirmar manualmente el artefacto aplicado antes de cerrar el hotfix.
- No hay tests ignorados, fallos de consola conocidos, assets de procedencia desconocida ni
  vulnerabilidades npm detectadas en el lockfile actual.

## Limitaciones no bloqueantes

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
