# Problemas conocidos

## Convenciones

- **Bloqueante:** impide cumplir la fase actual o ejecutar el juego.
- **No bloqueante:** limitación comprobada que no invalida el producto.
- **Pendiente de QA manual:** requiere percepción humana o hardware no automatizable.

## Activos

- Ningún defecto bloqueante o no bloqueante conocido tras la Fase 0.

## Pendientes de QA manual acumulativos

- El sistema de audio está validado funcionalmente y por análisis de señal, pero la fatiga del
  buzzing, la localización subjetiva con audífonos y la ausencia perceptual de clicks/clipping
  requieren una escucha humana acumulativa antes del cierre de Fase 9.
- La matriz ampliada de navegadores se ejecutará en la Fase 9.
- La superficie de navegador integrada del entorno de automatización no estaba disponible; el
  smoke de navegador se ejecutó con el Chromium administrado por Playwright del propio proyecto.
- Headless Chromium no siempre enruta Escape, una tecla reservada por el navegador, hacia pointer
  lock. El E2E intenta Escape y, si el navegador no lo libera, dispara `exitPointerLock()` para
  verificar la misma transición. El flujo real sigue el API estándar y requiere matriz manual final.
- La sala de Fase 1 usa materiales procedurales simples encapsulados; no se consideran arte final y
  serán sustituidos por las texturas/pipeline de Fase 5.
