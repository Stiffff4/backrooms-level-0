# Problemas conocidos

## Convenciones

- **Bloqueante:** impide cumplir la fase actual o ejecutar el juego.
- **No bloqueante:** limitación comprobada que no invalida el producto.
- **Pendiente de QA manual:** requiere percepción humana o hardware no automatizable.

## Activos

- Ningún defecto bloqueante conocido tras la Fase 7.
- **No bloqueante:** el chunk principal alcanzó 1,144.82 kB sin comprimir y activa el aviso informativo
  configurado en 1,100 kB. Su tamaño gzip es 278.95 kB y está muy por debajo del budget de 30 MB; la
  inspección y posible división segura quedan registradas para la Fase 9.

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
- La regresión visual automatizada confirma píxeles inmóviles estables, presets y ausencia de blur;
  la percepción subjetiva de shimmer durante giros lentos, legibilidad en monitores con gamma distinta
  y comodidad de la paleta durante una sesión larga quedan para la pasada manual acumulativa de Fase 9.
- Curvas, sincronización visual/sonora, budgets y `reducedFlashing` están cubiertos automáticamente;
  la comodidad subjetiva del microflicker y la localización de cuatro voces con audífonos permanece en
  la escucha humana acumulativa de Fase 9.
- La curva de tensión se simuló durante 20 minutos y se recorrieron 180 módulos en navegador; el ritmo
  subjetivo de silencios, repetición, blackout y desorientación durante una sesión real de 10–20
  minutos, especialmente en monitores con gamma distinta, queda para la pasada humana de Fase 9.
- Aunque las capturas E2E verifican ambos lados de una conexión, la percepción subjetiva de bumps,
  seams o z-fighting en todas las combinaciones de módulos queda en la pasada manual acumulativa de
  Fase 9.
- La estabilidad equivalente a 30 minutos se cubre con simulación lógica acelerada y un recorrido
  WebGL de 180 entradas. El soak de navegador a tiempo real y la percepción humana de pop-in/rebase
  permanecen en la pasada acumulativa de rendimiento de Fase 9.
