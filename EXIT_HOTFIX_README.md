# THRESHOLD — Hotfix de salida invisible

## Qué corrige

Con la seed `threshold-2026-07-14`, el HUD podía asignar `room-0137` como salida,
pero la pared especial quedaba oculta dentro de la pared normal. La causa era una
diferencia de coordenadas:

- las superficies de salida del catálogo están en el límite lógico de la sala;
- las paredes renderizadas ocupan 0.2 m hacia el interior de ese límite;
- el overlay de salida se construía en el límite y quedaba enterrado.

El hotfix desplaza visual, trigger y beacon a la cara interior renderizada, añade
separación visual suficiente para evitar oclusión y cubre la seed reportada tras
16 rebases de floating origin.

## Archivos incluidos

- `src/app/App.ts`
- `src/exit/ExitPlacement.ts`
- `src/exit/exit.presentation.config.ts`
- `src/rooms/builders/ModularRoomBuilder.ts`
- `tests/e2e/exit.spec.ts`
- `tests/unit/ExitPlacement.test.ts`
- `tests/unit/ExitRoomRegression.test.ts`
- `PROGRESS.md`
- `DECISIONS.md`
- `KNOWN_ISSUES.md`

## Aplicación recomendada

1. Cierra el servidor de desarrollo.
2. Haz una copia o commit local del estado actual.
3. Extrae el ZIP directamente en la raíz del repositorio, aceptando reemplazar
   los archivos existentes.
4. Ejecuta:

```powershell
npm run typecheck
npm run test -- --testTimeout=60000
npm run build
npm run dev
```

5. Prueba una partida o usa modo debug con:

```text
?debug=1&seed=threshold-2026-07-14
```

La pared debe verse claramente distinta cuando la salida se active y empujar
hacia ella debe iniciar la pantalla final.

## Aplicación alternativa con Git

Desde la raíz del repositorio:

```powershell
git apply --check .\threshold-exit-hotfix.patch
git apply .\threshold-exit-hotfix.patch
```

Si el parche no aplica porque Claude/Codex modificó alguno de los mismos
archivos después de crear el ZIP, usa el paquete de archivos como referencia y
revisa el diff manualmente; no fuerces un reset.

## Validación realizada

- TypeScript strict: PASS.
- Build de producción: PASS, 557 módulos.
- Suite unitaria: PASS, 45 archivos y 184 tests.
- Regresión específica `threshold-2026-07-14 / room-0137`: PASS.
- La regresión verifica que la salida queda delante de la pared normal, que el
  trigger funciona y que ambos siguen alineados después de 16 rebases.
- ESLint y Prettier sobre los archivos modificados: PASS.

No fue posible ejecutar Playwright contra localhost dentro del entorno de
reparación porque el navegador automatizado está bloqueado por política. La
comprobación visual final debe hacerse en tu PC.
