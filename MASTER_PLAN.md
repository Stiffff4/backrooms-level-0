# MASTER PLAN — BACKROOMS: LEVEL 0 “THRESHOLD”
## Especificación de producto, diseño, arte, audio y arquitectura para una experiencia first-person en navegador

**Destinatario principal:** Sol 5.6 Ultra  
**Naturaleza del documento:** plan maestro de implementación; no es un resumen, una lluvia de ideas ni una invitación a improvisar el alcance.  
**Plataforma objetivo:** navegador de escritorio moderno.  
**Tecnología seleccionada:** Babylon.js + TypeScript + Vite + HTML/CSS/DOM + Web Audio API.  
**Modelo de distribución:** aplicación web estática, sin backend obligatorio.  
**Estado:** preproducción aprobada para comenzar por fases.  
**Canon de referencia:** Level 0 — “Threshold”, Backrooms Wiki.  
**Objetivo del primer lanzamiento:** una experiencia completa, breve, rejugable y altamente atmosférica que representa únicamente el Nivel 0 y termina al atravesar una pared parpadeante.

---

# 0. INSTRUCCIONES EJECUTIVAS PARA SOL 5.6 ULTRA

Lee este documento completo antes de modificar o crear archivos. No comiences intentando producir todo el juego en una sola ejecución. El proyecto debe crecer mediante hitos verificables y verticales, manteniendo siempre una versión ejecutable.

Las decisiones principales ya están tomadas:

1. Se usará **Babylon.js**, no una combinación de Babylon.js y Three.js.
2. El runtime será **web puro**: TypeScript, HTML, CSS, DOM y Web APIs.
3. No se utilizará React, Vue, Angular, Next.js ni otro framework de interfaz.
4. No habrá backend, base de datos, autenticación, multijugador ni servicios externos en el MVP.
5. No se instalará un motor de físicas. El movimiento utilizará colisión cinemática ligera.
6. El juego será first-person y estará orientado inicialmente a teclado y mouse.
7. Level 0 no tendrá entidades, combate, persecuciones ni jumpscares baratos.
8. El miedo debe surgir de la arquitectura, la desorientación, la repetición, el sonido y la ausencia.
9. El mundo será procedural e infinito en apariencia, pero con memoria y costo computacional acotados.
10. La salida dependerá de azar controlado, nunca de RNG puro sin límites.
11. La estética será 3D estilizada con render interno de baja resolución, texturas pixeladas detalladas y composición final nítida.
12. El audio es una prioridad de producto, no un detalle para el final.
13. La primera implementación debe ser modular, reproducible mediante semillas y fácil de depurar.
14. Todo asset externo debe tener una licencia comprobable. No descargar imágenes, texturas o sonidos aleatorios de Internet.
15. No copiar las imágenes de referencia de la wiki. Crear recursos originales o utilizar recursos compatibles y documentados.
16. No realizar commit, push ni despliegue salvo autorización explícita del propietario del proyecto.
17. No declarar una fase terminada si sus criterios de aceptación no han sido comprobados.
18. Los placeholders deben quedar claramente identificados; no presentarlos como arte o audio final.
19. Antes de una decisión técnica grande que contradiga este documento, documentar el motivo, las alternativas y el impacto.
20. Priorizar una experiencia precisa y pulida sobre una acumulación de features.

La implementación debe comenzar por un vertical slice pequeño pero completo:

- inicio;
- pointer lock;
- movimiento;
- un conjunto reducido de habitaciones;
- generación procedural;
- iluminación;
- zumbido;
- pasos;
- pared de salida;
- transición final;
- build estático.

Después se aumenta el detalle visual, sonoro y espacial.

---

# 1. VISIÓN DEL PRODUCTO

## 1.1 Premisa

El jugador despierta solo en un laberinto de oficinas abandonadas: papel tapiz amarillo enfermizo, alfombra húmeda, techo modular y tubos fluorescentes cuyo zumbido nunca termina. No hay enemigos visibles. No hay instrucciones extensas. No hay armas. No hay inventario. No existe un mapa confiable.

La única tarea real es caminar, resistir la monotonía, reconocer anomalías y sobrevivir el tiempo suficiente para encontrar una pared cuyo material y luz parpadean de una manera imposible. Al atravesarla, el jugador escapa de Level 0 y la experiencia termina con una pantalla de agradecimiento y una alusión mínima a Level 1.

La experiencia debe parecer sencilla desde fuera, pero estar construida con una dirección extremadamente deliberada.

## 1.2 Fantasía central

> “Estoy atrapado en un lugar infinito que parece ordinario, pero cuya arquitectura ha dejado de obedecer al mundo real.”

No es la fantasía de derrotar criaturas. No es la fantasía de administrar recursos. No es una historia de poder. Es una experiencia de vulnerabilidad espacial.

## 1.3 Promesa al jugador

- Cada recorrido debe sentirse familiar, pero no idéntico.
- El espacio debe parecer mucho mayor que lo realmente cargado en memoria.
- El juego debe generar incomodidad aun cuando no sucede nada explícito.
- El audio debe permitir “sentir” la estructura del lugar.
- La salida debe ser rara y emocionante, pero no injusta.
- Una partida completa debe poder terminarse.
- No debe existir una posibilidad real de vagar indefinidamente por mala suerte.
- La ausencia de entidades debe respetarse.
- El juego debe funcionar directamente desde una URL en un navegador compatible.

## 1.4 Duración objetivo

### Primera partida

- Duración deseada: **10 a 20 minutos**.
- Mediana deseada después de balancear: **13 a 16 minutos**.
- Nunca debería aparecer la salida durante los primeros minutos, salvo modo debug.
- Debe existir una garantía dura de salida antes de que la experiencia se vuelva agotadora.

### Partidas posteriores

- Duración aproximada: 8 a 18 minutos.
- Las semillas, anomalías y distribución de módulos deben justificar varias partidas.
- No se pretende crear una campaña de horas dentro de Level 0.

## 1.5 Público objetivo

- Jugadores interesados en horror liminal.
- Personas que conocen Backrooms, pero también jugadores sin conocimiento previo.
- Usuarios de PC que pueden usar teclado, mouse y audífonos.
- Creadores de contenido que valoran experiencias cortas, visuales y reproducibles.
- Jugadores que prefieren atmósfera a combate.

---

# 2. PILARES DE DISEÑO

Toda feature debe justificar su existencia mediante al menos uno de estos pilares.

## 2.1 Soledad absoluta

Level 0 debe sentirse deshabitado. Se prohíben:

- NPC;
- voces humanas;
- mensajes de radio;
- sombras humanoides;
- criaturas;
- persecuciones;
- cadáveres explícitos;
- pasos de “otra persona”;
- respiraciones ajenas;
- sustos que impliquen que alguien está siguiendo al jugador.

Puede haber sonidos arquitectónicos o eléctricos ambiguos, pero no deben sugerir de manera directa la presencia confirmada de una entidad.

## 2.2 Monotonía con variación controlada

La repetición es parte del horror. Sin embargo, una repetición informática obvia arruina la ilusión. La arquitectura debe alternar:

- similitud;
- pequeñas variaciones;
- espacios memorables;
- anomalías poco frecuentes;
- pausas largas entre sucesos.

## 2.3 Desorientación justa

El jugador puede perder la orientación, pero no debe sentir que el sistema hizo trampa frente a sus ojos.

Regla fundamental:

> El mundo puede cambiar fuera de la vista, detrás de distancia suficiente o después de una transición espacial creíble. No debe mover paredes visibles, cerrar una puerta frente al jugador ni teletransportarlo sin cobertura visual.

## 2.4 Horror sin agresión directa

La experiencia no necesita salud, daño o enemigos para producir tensión. El juego debe explotar:

- distancia;
- escala;
- ecos;
- silencios;
- repetición;
- geometría imposible;
- cambios sutiles de color;
- pérdida de referencias;
- ruido fluorescente;
- la sospecha de que el camino de regreso ya no existe.

## 2.5 Calidad sensorial

El movimiento, la luz, las texturas y el sonido deben sentirse coherentes entre sí. Es preferible tener ocho módulos excelentes que cuarenta módulos pobres.

## 2.6 Rendimiento como parte del diseño

Un juego de navegador que se ve bien pero tiene stutter constante no está terminado. El render pixelado no debe utilizarse como excusa para cargar geometría y efectos sin límites.

---

# 3. ALCANCE DEL MVP

## 3.1 Contenido obligatorio

El MVP debe contener:

- pantalla inicial;
- precarga de assets;
- desbloqueo del AudioContext mediante gesto del usuario;
- pointer lock;
- controlador first-person;
- caminar y correr;
- colisión con paredes;
- gravedad simple y adaptación a pequeños desniveles;
- generación procedural por módulos;
- mundo con streaming y memoria acotada;
- semilla reproducible;
- papel tapiz amarillo;
- alfombra húmeda;
- techo modular;
- luminarias fluorescentes;
- buzzing ambiental;
- pasos sincronizados con movimiento;
- variación de salas y pasillos;
- niebla o atenuación atmosférica;
- render pixelado detallado;
- una pared de salida parpadeante;
- transición al final;
- pantalla “Gracias por jugar”;
- menú de pausa;
- controles básicos de volumen, sensibilidad, FOV y reducción de parpadeo;
- build de producción estático;
- compatibilidad con despliegue en hosting de archivos estáticos.

## 3.2 Contenido recomendable para la versión 1.0 del prototipo

- salas con arcos;
- salas con pilares;
- pasillos largos;
- intersecciones desplazadas;
- cambios de altura leves;
- zonas de alfombra especialmente húmeda;
- bancos de luces que fallan;
- un tipo controlado de blackout zone;
- repeticiones espaciales intencionales;
- layout shifts fuera de la vista;
- semillas compartibles mediante query string;
- debug HUD;
- presets gráficos;
- modo de parpadeo reducido;
- soporte inicial de gamepad, únicamente si no retrasa el núcleo.

## 3.3 Fuera del alcance

No implementar en esta versión:

- Level 1 jugable;
- entidades;
- combate;
- armas;
- inventario;
- hambre;
- sed;
- crafting;
- construcción;
- stamina punitiva;
- salto;
- crouch, salvo que un diseño posterior lo justifique;
- coleccionables como requisito de progreso;
- narrativa con diálogos;
- cinemáticas complejas;
- multijugador;
- cuentas;
- rankings;
- telemetría remota obligatoria;
- tienda;
- microtransacciones;
- soporte móvil completo;
- realidad virtual;
- backend;
- guardado de progreso de campaña;
- ray tracing;
- físicas dinámicas generales;
- destrucción del entorno.

## 3.4 Definición de “web puro”

La aplicación puede usar paquetes de npm y Babylon.js. “Web puro” significa:

- corre en el navegador;
- no depende de Unity, Unreal o Godot;
- no necesita un ejecutable nativo;
- usa TypeScript/JavaScript, HTML, CSS, WebGL/WebGPU opcional, Web Audio y APIs del navegador;
- se construye a archivos estáticos;
- puede servirse desde CDN o static hosting.

---

# 4. ELECCIÓN DEL MOTOR Y DEL STACK

## 4.1 Decisión: Babylon.js

Se selecciona Babylon.js como renderer y capa de motor.

No se deben instalar Babylon.js y Three.js a la vez. Mezclar ambos produce:

- dos scene graphs;
- dos ciclos de render;
- duplicación de matemáticas;
- carga adicional;
- integración de audio, materiales y cámaras innecesariamente difícil;
- mayor superficie de bugs.

## 4.2 Razones para elegir Babylon.js

Para este proyecto, Babylon.js ofrece una base más cercana a un motor de juego:

- escena, cámara y lifecycle integrados;
- colisiones y movimiento de malla sin requerir un motor físico completo;
- materiales y postprocesos;
- carga de glTF si se incorporan assets externos;
- herramientas de inspección;
- soporte de WebGL y camino opcional hacia WebGPU;
- clases de optimización e instancing;
- TypeScript como experiencia principal.

Three.js sería una excelente alternativa para un renderer altamente personalizado, pero exigiría construir más infraestructura de juego. El objetivo aquí no es demostrar cuánto código base se puede escribir; es llegar a una experiencia pulida.

## 4.3 Stack obligatorio

### Runtime

- TypeScript en modo estricto.
- Babylon.js mediante paquetes modulares:
  - `@babylonjs/core`
  - `@babylonjs/loaders`, únicamente si se cargan glTF.
- DOM para overlays, menú, pantalla inicial y ajustes.
- Web Audio API para el subsistema de audio.
- CSS normal, sin framework.
- Vite como dev server y bundler.

### Desarrollo

- Node.js en versión LTS activa al iniciar el proyecto.
- npm con `package-lock.json`.
- ESLint.
- Prettier.
- Vitest.
- Playwright para E2E.
- `fast-check` u otra herramienta de property testing solamente si aporta valor claro al generador procedural.

### No instalar inicialmente

- React.
- Redux.
- ECS de terceros.
- motores de físicas.
- librerías de UI.
- paquetes de generación procedural gigantes.
- loaders de formatos no utilizados.
- postprocesos de terceros antes de medir si hacen falta.

## 4.4 Política de versiones

- Verificar las versiones estables actuales al iniciar.
- Fijar versiones exactas en el lockfile.
- No usar tags `next`, `beta` o `canary`.
- No hacer upgrade mayor durante una fase de pulido.
- Registrar la versión de Node en `.nvmrc` o equivalente.
- Documentar requisitos en `README.md`.

## 4.5 WebGL y WebGPU

### Baseline de producción

**WebGL2** debe ser el baseline de compatibilidad y calidad.

### WebGPU

Puede añadirse como backend experimental o como ruta opcional después de que WebGL2 sea estable. No hacer depender el proyecto de WebGPU porque:

- la compatibilidad entre navegadores sigue variando;
- la experiencia no necesita cómputo gráfico avanzado;
- el estilo de baja resolución reduce la necesidad de throughput extremo;
- mantener dos rutas desde el primer día complica QA.

El bootstrap debe aislar la creación del engine para permitir una ruta WebGPU futura sin reescribir el juego.

---

# 5. EXPERIENCIA DEL JUGADOR

## 5.1 Flujo completo

1. El usuario abre la URL.
2. Aparece una pantalla sobria con el título.
3. Se indica:
   - “Haz clic para entrar”.
   - “Se recomiendan audífonos”.
   - controles básicos.
4. El usuario hace clic.
5. Se reanuda el AudioContext.
6. Se solicita pointer lock.
7. La pantalla se desvanece desde negro.
8. La cámara comienza cerca del suelo y sube sutilmente, simulando que el jugador se incorpora.
9. Inicia el buzzing.
10. El jugador explora.
11. La arquitectura aumenta poco a poco su extrañeza.
12. El sistema habilita candidatos de salida después de un mínimo de tiempo y exploración.
13. Aparece una pared parpadeante en una sala válida.
14. La pared puede detectarse visual y auditivamente.
15. El jugador camina o corre hacia ella.
16. La colisión cede, la imagen se distorsiona mínimamente y el audio se corta.
17. Fade a negro o amarillo pálido.
18. Texto:
    - `LEVEL 0 — THRESHOLD`
    - `Gracias por jugar.`
19. Opción:
    - jugar otra vez con nueva semilla;
    - repetir semilla;
    - volver al menú.

## 5.2 Ausencia de tutorial intrusivo

No mostrar una lista de objetivos permanente.

Los controles pueden aparecer en la pantalla inicial y desaparecer. Durante el juego, no se necesita HUD.

## 5.3 Movimiento

### Controles base

- WASD: movimiento.
- Mouse: cámara.
- Shift: correr.
- Esc: liberar pointer lock y pausar.
- F: opcional para pantalla completa, solo si no interfiere con navegador.
- No salto.
- No interacción genérica.
- No mapa.

### Valores iniciales recomendados

- velocidad caminando: 2.4–2.8 m/s;
- velocidad corriendo: 4.2–4.8 m/s;
- aceleración: suficiente para evitar movimiento robótico;
- desaceleración: corta, pero no instantánea;
- altura de ojos: 1.65–1.75 m;
- FOV por defecto: 78–82 grados;
- rango configurable: 65–100;
- bob vertical: muy bajo;
- bob horizontal: casi imperceptible;
- inclinación por strafe: opcional y mínima.

### Reglas

- No hacer al jugador excesivamente lento.
- No usar una stamina que lo obligue a detenerse.
- No simular mareo con cámara agresiva.
- No añadir motion blur.
- No bloquear al jugador en esquinas por un collider mal ajustado.
- La respuesta del mouse debe sentirse limpia.

## 5.4 El jugador no necesita cuerpo visible

Para el MVP:

- no renderizar brazos;
- no renderizar piernas;
- no renderizar sombra del cuerpo;
- no crear animaciones first-person.

Esto evita una gran cantidad de arte y problemas visuales. La presencia física se comunica mediante pasos, movimiento, altura y contacto con el suelo.

---

# 6. ESTRUCTURA DRAMÁTICA DE UNA PARTIDA

La partida necesita una curva, aunque el jugador no vea objetivos.

## 6.1 Fase A — Despertar y orientación

**Duración:** 0–2 minutos.

Características:

- arquitectura relativamente estable;
- habitaciones simples;
- iluminación consistente;
- buzzing estable;
- sin anomalías grandes;
- no existe salida;
- el jugador aprende el movimiento.

Objetivo emocional:

> “Esto es extraño, pero entiendo el espacio.”

## 6.2 Fase B — Monotonía

**Duración:** 2–6 minutos.

Características:

- repetición;
- primeras salas amplias;
- ligeras diferencias de humedad;
- luces con fluctuaciones pequeñas;
- una repetición de habitación puede ocurrir;
- todavía no hay salida.

Objetivo emocional:

> “Llevo demasiado tiempo viendo lo mismo.”

## 6.3 Fase C — Pérdida de referencias

**Duración:** 6–10 minutos.

Características:

- el generador habilita módulos especiales;
- aparecen arcos y pilares;
- un camino de regreso puede cambiar una vez fuera de streaming;
- variaciones de tono;
- un tramo de luces puede apagarse;
- la salida se vuelve elegible con probabilidad baja.

Objetivo emocional:

> “Creo que el lugar está cambiando.”

## 6.4 Fase D — Extrañeza creciente

**Duración:** 10–16 minutos.

Características:

- mayor probabilidad de anomalías;
- pequeñas zonas de silencio;
- geometría más difícil de recordar;
- espacios muy largos o muy abiertos;
- posibilidad creciente de salida;
- tensión sin persecución.

Objetivo emocional:

> “Necesito salir.”

## 6.5 Fase E — Resolución forzada

**Duración:** 16–20 minutos como máximo.

Características:

- el sistema eleva la probabilidad de candidatos;
- si se alcanza el límite duro, la próxima sala compatible debe contener la salida;
- no seguir prolongando la partida para “ser más misterioso”.

Objetivo emocional:

> “Por fin encontré algo distinto.”

---

# 7. ARQUITECTURA PROCEDURAL

## 7.1 Principio general

No generar un mapa infinito completo. Generar una burbuja de mundo alrededor del jugador.

El sistema debe ofrecer:

- continuidad local;
- memoria acotada;
- variedad;
- reproducibilidad;
- reglas de diseño;
- capacidad de cambiar topología fuera de la vista;
- salida garantizada.

## 7.2 Modelo recomendado: grafo de módulos con embedding local

Cada habitación o segmento es un `RoomInstance`. Las conexiones forman un grafo. Cada instancia posee una transformación local para renderizarse en el espacio euclidiano activo.

La verdad lógica es el grafo. La geometría renderizada es una representación local.

Conceptos:

```ts
type RoomId = string;
type SocketId = string;

interface RoomSocket {
  id: SocketId;
  localPosition: Vector3Like;
  localForward: Vector3Like;
  width: number;
  height: number;
  tags: string[];
}

interface RoomDefinition {
  id: string;
  category: RoomCategory;
  footprint: GridFootprint;
  sockets: RoomSocket[];
  weight: number;
  minDepth: number;
  maxConsecutive: number;
  tags: string[];
  geometryRecipe: GeometryRecipe;
  lightingProfile: string;
  audioProfile: string;
  anomalySlots: AnomalySlot[];
  exitCompatibleSurfaces: ExitSurfaceDefinition[];
}

interface RoomInstance {
  id: RoomId;
  definitionId: string;
  seed: number;
  depth: number;
  worldTransform: TransformData;
  connections: Record<SocketId, RoomConnection | null>;
  visitState: VisitState;
  spawnedAt: number;
}
```

No es obligatorio usar exactamente estos tipos, pero la separación conceptual sí lo es.

## 7.3 No usar random sin semilla

Todo contenido procedural debe depender de una semilla de sesión.

Requisitos:

- misma semilla + misma versión de reglas = misma secuencia lógica, en lo posible;
- permitir `?seed=valor`;
- mostrar la semilla al final;
- permitir copiarla;
- registrar la semilla en errores;
- separar RNG de mundo, RNG de audio y RNG visual para evitar que un cambio cosmético modifique todo el mapa.

Ejemplo:

- `worldRng`
- `visualRng`
- `audioRng`
- `tensionRng`

Derivar subsemillas mediante hash estable.

## 7.4 Módulos, no celdas uniformes visibles

No construir todo como un grid idéntico de paredes. El jugador detectará patrones artificiales.

Cada módulo puede estar internamente basado en grid, pero debe variar:

- ancho;
- largo;
- altura;
- número de entradas;
- ubicación de luminarias;
- patrón de papel;
- manchas;
- zócalos;
- profundidad de alfombra;
- distribución de columnas.

## 7.5 Catálogo inicial de módulos

### Núcleo obligatorio

1. `corridor_straight_narrow`
2. `corridor_straight_wide`
3. `corridor_long`
4. `corner_90`
5. `corner_offset`
6. `junction_t`
7. `junction_cross`
8. `room_small_rect`
9. `room_medium_rect`
10. `room_large_open`
11. `room_dead_end`
12. `room_double_offset`

### Variaciones avanzadas

13. `arch_gallery_short`
14. `arch_gallery_long`
15. `pillar_grid_small`
16. `pillar_grid_large`
17. `low_ceiling_section`
18. `high_ceiling_section`
19. `damp_depression`
20. `light_failure_corridor`
21. `blackout_edge`
22. `repetition_room`
23. `false_loop`
24. `impossible_return`

No todos deben existir en la primera semana. El vertical slice puede comenzar con 8–10.

## 7.6 Sockets

Cada módulo expone sockets compatibles.

Reglas:

- puertas y pasillos deben alinear posición, ancho y altura;
- un socket puede requerir tags;
- no conectar un corredor ancho a un hueco estrecho sin pieza de transición;
- generar piezas de cierre para sockets no utilizados;
- las paredes de cierre pueden ser candidatas de salida si están marcadas.

## 7.7 Selección ponderada con restricciones

No usar únicamente una lista de pesos. La selección debe considerar:

- profundidad de exploración;
- tiempo de sesión;
- módulo anterior;
- últimas N categorías;
- número de intersecciones recientes;
- cooldown de anomalías;
- presupuesto de complejidad;
- probabilidad de salida;
- colisiones con la geometría local activa;
- necesidad de mantener rutas.

Pseudocódigo:

```ts
function chooseNextDefinition(context: GenerationContext): RoomDefinition {
  const candidates = definitions
    .filter(def => matchesSocket(def, context.socket))
    .filter(def => satisfiesDepth(def, context.depth))
    .filter(def => !violatesRepetition(def, context.history))
    .filter(def => !violatesAnomalyCooldown(def, context))
    .filter(def => fitsLocalEmbedding(def, context))
    .map(def => ({
      def,
      score: calculateWeight(def, context),
    }));

  return weightedPick(candidates, context.worldRng);
}
```

## 7.8 Reglas anti-repetición

- No repetir el mismo `definitionId` más de dos veces seguidas.
- No producir más de tres corredores rectos simples consecutivos, excepto en un evento deliberado de corredor largo.
- Después de una sala especial, insertar 2–5 módulos comunes.
- No generar dos blackout zones consecutivas.
- No generar una sala de pilares grande cerca del inicio.
- No colocar una salida en el primer dead end que el jugador encuentra.
- No usar rarezas con una frecuencia que las convierta en normalidad.

## 7.9 Streaming

### Objetivo

Mantener cargado solamente lo necesario.

### Estrategia

- radio lógico activo: 3–4 saltos de grafo alrededor de la sala actual;
- radio de precarga: un salto adicional;
- historial lógico compacto para las habitaciones visitadas;
- geometría descargable para habitaciones lejanas;
- pool de meshes cuando sea rentable;
- liberación de texturas no necesaria si son compartidas.

### Estado de habitaciones lejanas

Una habitación descargada puede conservar:

- ID;
- semilla;
- definición;
- conexiones relevantes;
- estado visitado;
- si ya fue candidata de salida;
- flags de anomalía.

No conservar:

- meshes;
- luces;
- nodos de audio;
- colliders completos.

## 7.10 Evitar pop-in

Ocultar generación y descarga mediante:

- esquinas;
- paredes;
- niebla;
- distancia;
- puertas abiertas angostas;
- cambios de dirección;
- ausencia de líneas visuales infinitas no controladas.

No descargar una habitación que:

- está dentro del frustum;
- tiene una entrada visible;
- contiene la salida;
- está a menos de una distancia de seguridad;
- fue abandonada hace pocos segundos.

## 7.11 Floating origin

Aunque la burbuja sea acotada, el jugador puede recorrer distancias largas.

Implementar rebase de origen cuando el jugador se aleje una cantidad significativa, por ejemplo 200–300 metros del origen local.

Al hacer rebase:

- mover todos los nodos del mundo activo por el delta opuesto;
- mantener el grafo lógico intacto;
- no alterar audio percibido;
- no producir un frame visible de salto;
- registrar el evento en debug.

---

# 8. ILUSIÓN NO EUCLIDIANA

## 8.1 Objetivo

No se necesita resolver geometría matemática imposible a escala global. Se necesita que el jugador sienta que el espacio no puede memorizarse.

## 8.2 Técnicas seguras para el MVP

### A. Cambios fuera de streaming

Cuando un camino queda lo suficientemente lejos y deja de estar visible, su continuación puede regenerarse de otra manera.

### B. Conexión topológica mutable

Una puerta lejana puede apuntar a una habitación distinta cuando el jugador regresa, siempre que:

- la transición no sea visible;
- no rompa la habitación actual;
- no elimine la salida;
- no atrape al jugador.

### C. Repetición casi exacta

Repetir una habitación visitada, pero cambiar:

- una luz;
- una mancha;
- una apertura;
- el largo de un pasillo;
- la posición de un pilar.

### D. Corredores con longitud imposible

Un corredor puede ser mucho más largo de lo que parecía desde otra sala. La niebla y los ángulos evitan comparaciones directas.

### E. Loop topológico

Una secuencia de tres o cuatro habitaciones puede regresar a una versión alterada de la primera.

## 8.3 Técnicas avanzadas, posteriores al MVP

### Portales de reubicación invisible

Al cruzar un umbral completamente ocluido por paredes, reubicar la burbuja local y mantener velocidad, orientación y audio.

Requisitos:

- no debe haber una discontinuidad de cámara;
- no debe romper la colisión;
- debe preservar el control;
- debe funcionar a 60 FPS;
- debe tener pruebas específicas.

No implementar esta técnica antes de que la generación normal sea sólida.

## 8.4 Principio de estabilidad local

La sala actual y todas las superficies visibles son inmutables.

El jugador debe poder confiar en lo que está viendo, aunque no pueda confiar en lo que dejó atrás.

---

# 9. SISTEMA DE SALIDA

## 9.1 Problema que debe evitarse

Una probabilidad fija por habitación produce extremos malos:

- salida en dos minutos;
- ausencia de salida durante cuarenta minutos.

La salida debe sentirse aleatoria, pero su distribución debe estar diseñada.

## 9.2 Elegibilidad

La salida no puede aparecer hasta cumplir ambos criterios:

- tiempo mínimo;
- exploración mínima.

Valores iniciales para tuning:

- `minimumElapsedMinutes = 6`
- `minimumUniqueRooms = 30`

No usar estos números como verdad eterna. Deben vivir en configuración.

## 9.3 Habitaciones candidatas

Una habitación es candidata si:

- tiene una superficie `exitCompatible`;
- la pared es visible desde una distancia razonable;
- existe suficiente espacio para acercarse;
- no está en una blackout zone;
- no está inmediatamente junto al spawn;
- no está detrás de geometría imposible de alcanzar;
- no es una sala que el jugador ya agotó visualmente;
- el módulo no está marcado como peligroso;
- el camino hasta ella es navegable.

## 9.4 Probabilidad ascendente

Evaluar probabilidad solamente al crear o revelar una **habitación candidata**, nunca por frame.

Fórmula inicial sugerida:

```ts
const minutesAfterEligibility = Math.max(0, elapsedMinutes - 6);
const explorationSteps = Math.max(0, Math.floor((uniqueRooms - 30) / 10));

const probability = clamp(
  0.02 +
    minutesAfterEligibility * 0.007 +
    explorationSteps * 0.003,
  0.02,
  0.16
);
```

Interpretación:

- 2% al comenzar la elegibilidad;
- incremento gradual;
- máximo de 16% por candidato;
- no se evalúa en cada habitación, solamente en superficies compatibles.

## 9.5 Garantía dura

La salida debe forzarse cuando se cumpla cualquiera:

- 18 minutos;
- 120 habitaciones únicas;
- cinco candidatos aptos rechazados después de los 15 minutos;
- configuración de accesibilidad o modo corto.

Al forzarse:

- no materializarla detrás del jugador;
- marcar el próximo candidato compatible;
- mantenerlo cargado;
- no reemplazarlo por un layout shift.

## 9.6 Presentación visual

La pared debe:

- compartir el mismo papel tapiz general;
- tener una irregularidad perceptible;
- alternar su respuesta a la luz;
- producir parpadeo no perfectamente periódico;
- tener pequeñas discontinuidades de píxeles;
- no convertirse en un portal brillante genérico;
- no usar colores neón.

## 9.7 Presentación sonora

Debe existir un audio diferenciable:

- buzzing con modulación irregular;
- componente eléctrica más aguda;
- ligera cancelación de fase al acercarse;
- aumento direccional;
- ausencia de stinger fuerte.

El jugador debe poder localizarla con audífonos sin que se convierta en un beacon obvio desde demasiado lejos.

## 9.8 Interacción

No mostrar `Presiona E`.

La salida se activa al:

- caminar o correr contra la pared;
- superar un plano de transición;
- mantener la aproximación por un tiempo mínimo muy corto para evitar activación accidental lateral.

## 9.9 Transición final

Secuencia aproximada:

1. collider de salida acepta el cruce;
2. input se reduce durante 150–300 ms;
3. distorsión de textura breve;
4. buzzing se corta;
5. sonido de baja frecuencia muy corto;
6. fade;
7. pantalla final.

No usar un flash intenso. Incluir modo de reducción de parpadeo.

---

# 10. DIRECTOR DE TENSIÓN

## 10.1 Responsabilidad

El `TensionDirector` controla la frecuencia de eventos ambientales. No controla entidades, porque no existen.

Debe considerar:

- tiempo;
- habitaciones únicas;
- velocidad del jugador;
- cuánto tiempo lleva sin encontrar variación;
- eventos recientes;
- nivel de calidad;
- accesibilidad;
- cercanía de salida.

## 10.2 Eventos permitidos

- una luminaria tarda en encender;
- un banco de luces baja su intensidad;
- un tubo fluorescente hace un pop;
- el buzzing cambia de frecuencia;
- un pasillo entra en silencio durante pocos segundos;
- la alfombra cambia de humedad;
- aparece un salón de escala anormal;
- una habitación se repite;
- el camino de retorno cambia fuera de vista;
- una zona adopta un tono ligeramente más verde o pálido;
- el techo baja;
- una sala tiene demasiadas luminarias;
- una pared vibra visualmente de forma mínima;
- el jugador vuelve a una sala similar, pero no idéntica.

## 10.3 Eventos prohibidos

- gritos;
- growls;
- pasos ajenos;
- una silueta que cruza;
- texto “corre”;
- golpes violentos en una puerta;
- cara repentina;
- jumpscare de volumen;
- persecución falsa;
- respiración de monstruo;
- ojos en la oscuridad;
- mensajes de amenaza.

## 10.4 Cooldowns

Cada familia de eventos debe tener cooldown.

Ejemplo:

- flicker leve: 20–45 s;
- silencio: 90–180 s;
- módulo especial: 3–6 salas;
- repetición espacial: máximo una cada 5 minutos;
- blackout: máximo una por partida antes de la salida.

No lanzar eventos simplemente porque el timer lo permite. Deben ocurrir en contextos válidos.

---

# 11. DISEÑO VISUAL

## 11.1 Interpretación de “pixel art detallado”

No se intenta imitar literalmente un sidescroller 2D como Blasphemous. La referencia se toma en:

- densidad de detalle;
- elección deliberada de píxeles;
- siluetas legibles;
- paleta;
- acabado artesanal;
- ausencia de filtros baratos.

La solución técnica es:

> mundo 3D real + materiales de baja resolución bien diseñados + render interno reducido + upscale nítido + postproceso muy controlado.

## 11.2 Qué no hacer

- aplicar un filtro pixelate a una escena genérica y llamarlo pixel art;
- usar texturas fotográficas sin procesar;
- usar VHS overlay fuerte;
- cubrir todo con ruido;
- usar aberración cromática constante;
- abusar de glitch;
- hacer el amarillo tan saturado que canse;
- usar bloom excesivo;
- usar motion blur;
- usar assets con escalas inconsistentes;
- convertir el juego en un boomer shooter visual.

## 11.3 Paleta

Paleta base aproximada:

- amarillo papel envejecido;
- beige nicotina;
- crema enfermo;
- marrón húmedo;
- gris verdoso;
- blanco fluorescente con leve tinte verde;
- sombras marrones/grises, no negro puro.

Los tonos rojos deben reservarse para contenido futuro o anomalías extremadamente sutiles. No convertir Level 0 en un entorno rojo.

## 11.4 Resolución interna

Presets recomendados:

### Detailed Pixel — default

- altura interna objetivo: 360 px;
- ancho basado en aspect ratio;
- excelente equilibrio entre pixelación y detalle.

### Fine Pixel

- altura interna: 480 px;
- para monitores grandes y usuarios que quieran un acabado menos grueso.

### Coarse Pixel

- altura interna: 240 px;
- rendimiento o estética más retro.

La UI DOM se renderiza a resolución nativa, no pixelada, excepto si la dirección visual decide lo contrario.

## 11.5 Upscaling

Opción simple y robusta:

- canvas con tamaño de buffer interno reducido;
- CSS escala el canvas a viewport;
- `image-rendering: pixelated`;
- preservar aspect ratio;
- usar letterboxing si evita deformación;
- actualizar tamaño con debounce al hacer resize.

No confiar en un postproceso de pixelación si el resultado no conserva una cuadrícula estable.

## 11.6 Cámara y pixel shimmer

Una cámara 3D en baja resolución puede producir shimmer.

Mitigaciones:

- texturas con mipmaps apropiados;
- limitar patrones de un píxel con contraste extremo;
- usar atlas con padding;
- evitar líneas diagonales demasiado finas;
- mantener resolución interna suficiente;
- no hacer snapping de cámara agresivo;
- probar movimiento lateral y giro lento.

## 11.7 Materiales

### Pared

Capas visuales:

- base amarilla;
- patrón repetitivo de papel;
- variación de tono por panel;
- costuras;
- manchas pequeñas;
- zonas de humedad;
- zócalo;
- roughness alta;
- normal map muy sutil o geometría mínima.

### Alfombra

Capas:

- patrón fibroso de baja resolución;
- manchas grandes de humedad;
- variación por habitación;
- brillo mínimo en zonas mojadas;
- color no uniforme;
- bordes oscuros junto a paredes.

### Techo

- paneles rectangulares;
- variación leve;
- juntas;
- luminarias;
- manchas ocasionales;
- altura variable por módulo.

### Luminarias

- carcasa simple;
- panel emissive;
- textura de tubo;
- material que soporte flicker;
- no crear una luz dinámica por cada tubo.

## 11.8 Assets procedurales reproducibles

El proyecto puede generar texturas originales mediante scripts.

Estrategia:

- scripts en `tools/generate-assets`;
- generación determinista de PNG;
- outputs versionados en `public/assets/generated`;
- manifest con semilla, tamaño y licencia;
- texturas base de 128, 256 o 512 px según uso;
- no generar assets distintos en cada carga salvo microvariaciones.

Herramientas posibles:

- `pngjs` para PNG desde Node;
- scripts TypeScript;
- SVG para patrones simples;
- Canvas/OffscreenCanvas para prototipos.

La generación en runtime debe limitarse a variaciones pequeñas, no a toda la librería si empeora el arranque.

## 11.9 Reemplazo futuro por arte externo

La arquitectura debe permitir que un artista reemplace una receta procedural por glTF sin cambiar el generador.

`RoomDefinition` no debe asumir que toda geometría se construye de una única forma.

---

# 12. ILUMINACIÓN

## 12.1 Objetivo

La escena debe parecer iluminada por cientos de fluorescentes sin pagar el costo de cientos de luces dinámicas.

## 12.2 Estrategia híbrida

- material emissive en cada luminaria visible;
- una luz ambiental global débil;
- 4–8 luces proxy activas cerca del jugador;
- luces proxy reasignadas según habitación;
- iluminación base simulada en materiales;
- AO horneado o aproximado en geometría;
- niebla para integrar distancia.

## 12.3 Light pooling

No crear y destruir luces constantemente.

Implementar un pool:

```ts
interface FluorescentLightProxy {
  light: PointLightLike;
  assignedFixtureId: string | null;
  priority: number;
}
```

Asignar luces a fixtures:

- cercanos;
- visibles;
- importantes;
- parpadeantes;
- relacionados con salida.

## 12.4 Sombras

No se necesitan sombras dinámicas generales porque:

- no hay entidades;
- no hay cuerpo visible;
- el entorno es estático;
- el costo no aporta suficiente valor.

Opciones:

- AO en vértices;
- textura de AO;
- sombra geométrica simple bajo zócalos;
- SSAO opcional en presets altos, después de medir.

## 12.5 Flicker

Cada luminaria debe poseer un estado lógico, pero no todas deben animarse.

Perfiles:

- estable;
- microflicker imperceptible;
- fluctuación lenta;
- fallo intermitente;
- apagada;
- salida.

Usar curvas predefinidas y seeds, no `Math.random()` cada frame.

## 12.6 Blackout zones

En el MVP, una blackout zone debe ser corta y opcional.

Características:

- ausencia de buzzing local;
- luz lejana visible como objetivo;
- paredes todavía apenas legibles;
- piso que puede reflejar un brillo mínimo;
- no colocar la salida dentro;
- no obligar a un laberinto negro largo;
- ofrecer ruta de escape clara mediante audio o luz.

Una oscuridad completamente negra sin herramienta de iluminación no es tensión; es falta de información.

---

# 13. PIPELINE DE RENDER

## 13.1 Orden conceptual

1. render 3D a resolución interna;
2. color grading;
3. dithering suave, opcional;
4. ruido temporal muy leve;
5. efectos contextuales de anomalía;
6. upscale nítido;
7. UI DOM a resolución nativa.

## 13.2 Color grading

Objetivos:

- amarillos enfermizos sin clipping;
- luces blancas ligeramente verdes;
- negros levantados;
- contraste moderado;
- mantener detalle en paredes;
- evitar look cinematográfico genérico.

## 13.3 Dithering

Puede utilizarse una matriz Bayer o ruido azul de baja intensidad.

Reglas:

- no hacer visible el patrón a primera vista;
- no usarlo en UI;
- desactivable;
- no introducir parpadeo temporal molesto.

## 13.4 Grain

El grain debe ser casi subliminal.

No utilizar:

- scanlines fuertes;
- VHS tracking;
- timecode;
- suciedad de cinta;
- distorsión CRT permanente.

Level 0 no necesita verse como una cinta encontrada.

## 13.5 Efectos de salida

Solamente durante proximidad y transición:

- offset UV mínimo;
- cuantización de color;
- línea de discontinuidad;
- leve deformación de perspectiva;
- caída de exposición.

Todo debe durar poco.

## 13.6 Pipeline configurable

```ts
interface PixelPipelineConfig {
  internalHeight: 240 | 360 | 480;
  dithering: boolean;
  grainStrength: number;
  colorGradePreset: "threshold";
  anomalyEffects: boolean;
  reducedFlashing: boolean;
}
```

---

# 14. AUDIO

## 14.1 Prioridad

El audio no es “fase final”. El vertical slice debe incluir sonido desde temprano porque la experiencia no se puede evaluar sin él.

## 14.2 Restricción del navegador

Los navegadores requieren interacción del usuario para iniciar audio. La pantalla “Haz clic para entrar” debe:

- resumir controles;
- llamar a `audioContext.resume()`;
- cargar o activar buses;
- solicitar pointer lock;
- iniciar el juego.

## 14.3 Arquitectura

Crear un subsistema independiente:

```ts
class GameAudioEngine {
  context: AudioContext;
  masterBus: GainNode;
  ambienceBus: GainNode;
  lightsBus: GainNode;
  footstepsBus: GainNode;
  eventsBus: GainNode;
  uiBus: GainNode;
}
```

Añadir:

- limitador suave en master;
- volumen individual persistido;
- mute cuando pestaña pierde visibilidad, configurable;
- fade al pausar;
- manejo de suspensión/reanudación.

## 14.4 Buzzing fluorescente

No utilizar un solo MP3 en loop.

Construir el ambiente mediante capas:

1. hum grave de red eléctrica;
2. buzz medio;
3. componente aguda;
4. ruido de ballast;
5. variaciones locales;
6. pops ocasionales.

Puede combinar:

- loops grabados;
- osciladores;
- ruido filtrado;
- modulación lenta;
- crossfade entre buffers.

El loop no debe revelar un punto de repetición corto.

## 14.5 Espacialización

No crear un `PannerNode` por cada luminaria.

Usar:

- ambiente global no posicional;
- 2–4 fuentes posicionales reasignables;
- una fuente específica para salida;
- una fuente para eventos relevantes;
- mezcla basada en habitación actual.

La posición del listener sigue a la cámara.

## 14.6 Perfiles por sala

```ts
interface RoomAudioProfile {
  ambienceGain: number;
  buzzBrightness: number;
  humFrequencyOffset: number;
  reverbPreset: string;
  wetness: number;
  silenceFactor: number;
}
```

## 14.7 Reverb

Evitar reverberación exagerada de catedral.

Perfiles:

- corredor estrecho;
- oficina mediana;
- sala amplia;
- pillar hall;
- blackout húmedo.

Puede usarse:

- ConvolverNode con impulsos cortos;
- delay filtrado;
- crossfade por sala.

Medir CPU y número de convolvers.

## 14.8 Footsteps

### Requisitos

- sincronizados con distancia recorrida, no con timer fijo;
- frecuencia distinta al correr;
- alternancia izquierda/derecha;
- pequeñas variaciones de tono y volumen;
- mezcla de impacto, fibra y humedad;
- transición por nivel de mojado;
- sonido de detenerse después de sprint opcional;
- no sonar como botas sobre cemento.

### Lógica

Acumular distancia horizontal:

```ts
distanceAccumulator += horizontalDistanceMoved;

if (distanceAccumulator >= strideLength) {
  playFootstep(currentSurface, speedNormalized, footSide);
  distanceAccumulator = 0;
  footSide = footSide === "left" ? "right" : "left";
}
```

### Superficie

En la primera versión existe una familia principal:

- `wet_carpet`.

Variaciones:

- normal;
- húmeda;
- saturada;
- depresión con agua.

## 14.9 Sonido de movimiento

Opcional y muy sutil:

- roce de ropa al correr;
- respiración únicamente después de sprint prolongado, sin convertirla en barra de stamina;
- desplazamiento de aire en corredores.

No añadir respiración constante irritante.

## 14.10 Silencio

El silencio debe diseñarse.

Al entrar a una zona silenciosa:

- bajar buzzing gradualmente;
- mantener un noise floor casi imperceptible;
- permitir que los pasos dominen;
- no introducir entidad;
- restaurar el buzzing al salir, generando alivio.

## 14.11 Assets y licencias

Preferencia:

1. grabaciones propias;
2. CC0;
3. recursos con licencia compatible y atribución clara;
4. síntesis original.

Crear `ASSET_LICENSES.md` con:

- archivo;
- autor;
- URL de origen;
- licencia;
- modificaciones;
- fecha de descarga.

No usar bibliotecas con licencia ambigua.

## 14.12 Formatos

Preparar:

- formato comprimido principal compatible;
- fallback si se necesita;
- clips cortos sin silencios innecesarios;
- normalización consistente;
- loops con cortes exactos.

No cargar decenas de WAV grandes en producción.

---

# 15. PLAYER CONTROLLER Y COLISIONES

## 15.1 Enfoque

Usar un controlador cinemático, no un motor de físicas.

Opciones en Babylon:

- malla collider invisible;
- `moveWithCollisions`;
- gravedad controlada;
- raycast al suelo;
- step offset manual.

## 15.2 Collider

- cápsula o elipsoide;
- radio aproximado de 0.3–0.4 m;
- altura coherente;
- cámara separada del collider;
- margen para evitar quedarse pegado.

## 15.3 Grounding

El sistema debe detectar:

- suelo;
- desnivel pequeño;
- caída;
- pendiente no transitable;
- depresión de alfombra.

No permitir:

- subir paredes;
- vibrar en esquinas;
- atravesar uniones de módulos;
- caer por seams.

## 15.4 No jump

No implementar salto porque:

- no es necesario;
- rompe la escala;
- permite mirar o atravesar zonas no diseñadas;
- aumenta pruebas de colisión;
- hace que el jugador “bunny hop” y destruya el ritmo.

## 15.5 Sprint

- ilimitado;
- no demasiado rápido;
- más head bob;
- pasos más intensos;
- posibilidad de una respiración corta al soltar;
- no introducir stamina.

## 15.6 Pointer lock

Estados:

- no adquirido;
- activo;
- liberado por Esc;
- perdido por cambio de pestaña.

Al perderse:

- pausar movimiento;
- mostrar overlay;
- reducir audio;
- permitir reanudar con clic.

---

# 16. UI Y UX

## 16.1 Filosofía

El HUD durante gameplay debe ser inexistente.

## 16.2 Pantalla inicial

Elementos:

- título;
- botón “Entrar”;
- “Audífonos recomendados”;
- controles;
- ajustes;
- créditos;
- advertencia de parpadeo;
- indicador de carga.

No incluir lore largo.

## 16.3 Pausa

- reanudar;
- sensibilidad;
- volumen master;
- volumen ambience;
- volumen pasos;
- FOV;
- head bob;
- reducción de parpadeo;
- calidad visual;
- reiniciar semilla;
- salir al menú.

## 16.4 Final

Mostrar:

- `LEVEL 0 — THRESHOLD`;
- `Gracias por jugar`;
- tiempo;
- habitaciones únicas;
- semilla;
- nueva partida;
- repetir semilla;
- créditos.

No convertirlo en una pantalla de puntuación competitiva.

## 16.5 Persistencia

Guardar en `localStorage`:

- volumen;
- sensibilidad;
- FOV;
- calidad;
- head bob;
- reduced flashing;
- fullscreen preference si aplica.

No guardar datos personales.

## 16.6 Accesibilidad

Mínimo:

- sensibilidad configurable;
- invert Y;
- FOV;
- head bob toggle;
- reducción de parpadeo;
- volumen por categorías;
- subtítulos para eventos esenciales, opcionales;
- contraste legible en menús;
- navegación por teclado en UI;
- pausa automática al perder foco.

Los subtítulos pueden mostrar:

- `[zumbido eléctrico irregular]`
- `[las luces se apagan]`

No deben revelar “la salida está cerca” si el audio pretende ser parte del descubrimiento, salvo modo de accesibilidad específico.

---

# 17. ARQUITECTURA DE CÓDIGO

## 17.1 Principios

- composición sobre herencia profunda;
- responsabilidades pequeñas;
- configuración fuera de clases cuando sea posible;
- eventos tipados;
- nada de singleton global incontrolable;
- sistemas testeables sin renderer cuando sea razonable;
- separación entre estado lógico y nodos Babylon;
- ningún archivo central de miles de líneas.

## 17.2 Estructura recomendada

```text
/
├─ public/
│  ├─ assets/
│  │  ├─ audio/
│  │  ├─ textures/
│  │  ├─ models/
│  │  └─ generated/
│  └─ favicon/
├─ src/
│  ├─ app/
│  │  ├─ App.ts
│  │  ├─ AppState.ts
│  │  └─ GameStateMachine.ts
│  ├─ engine/
│  │  ├─ EngineBootstrap.ts
│  │  ├─ SceneFactory.ts
│  │  ├─ RenderLoop.ts
│  │  └─ Capabilities.ts
│  ├─ game/
│  │  ├─ GameSession.ts
│  │  ├─ GameClock.ts
│  │  └─ SessionStats.ts
│  ├─ player/
│  │  ├─ PlayerController.ts
│  │  ├─ PlayerInput.ts
│  │  ├─ PlayerCamera.ts
│  │  └─ GroundingSystem.ts
│  ├─ world/
│  │  ├─ WorldManager.ts
│  │  ├─ RoomGraph.ts
│  │  ├─ RoomInstance.ts
│  │  ├─ RoomRegistry.ts
│  │  ├─ ChunkStreamer.ts
│  │  ├─ FloatingOrigin.ts
│  │  └─ SpatialEmbedding.ts
│  ├─ generation/
│  │  ├─ SeededRandom.ts
│  │  ├─ RoomGenerator.ts
│  │  ├─ CandidateScoring.ts
│  │  ├─ GenerationRules.ts
│  │  ├─ ExitDirector.ts
│  │  └─ TensionDirector.ts
│  ├─ rooms/
│  │  ├─ definitions/
│  │  ├─ builders/
│  │  ├─ sockets/
│  │  └─ geometry/
│  ├─ rendering/
│  │  ├─ PixelRenderPipeline.ts
│  │  ├─ MaterialLibrary.ts
│  │  ├─ TextureLibrary.ts
│  │  ├─ LightPool.ts
│  │  ├─ FogController.ts
│  │  └─ QualityManager.ts
│  ├─ audio/
│  │  ├─ GameAudioEngine.ts
│  │  ├─ AudioBus.ts
│  │  ├─ AmbientDirector.ts
│  │  ├─ FluorescentHum.ts
│  │  ├─ FootstepSystem.ts
│  │  └─ ReverbManager.ts
│  ├─ ui/
│  │  ├─ TitleScreen.ts
│  │  ├─ PauseMenu.ts
│  │  ├─ EndScreen.ts
│  │  ├─ SettingsStore.ts
│  │  └─ styles/
│  ├─ debug/
│  │  ├─ DebugHud.ts
│  │  ├─ SeedControls.ts
│  │  └─ WorldGraphOverlay.ts
│  ├─ config/
│  │  ├─ game.config.ts
│  │  ├─ generation.config.ts
│  │  ├─ rendering.config.ts
│  │  └─ audio.config.ts
│  ├─ utils/
│  ├─ main.ts
│  └─ style.css
├─ tests/
│  ├─ unit/
│  ├─ procedural/
│  ├─ integration/
│  └─ e2e/
├─ tools/
│  ├─ generate-assets/
│  └─ validate-assets/
├─ docs/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ README.md
├─ CREDITS.md
├─ ASSET_LICENSES.md
└─ LICENSE-CONTENT.md
```

No crear todas las carpetas vacías desde el primer minuto. La estructura representa el destino arquitectónico.

## 17.3 State machine

Estados recomendados:

```ts
type GameState =
  | "boot"
  | "loading"
  | "title"
  | "entering"
  | "playing"
  | "paused"
  | "exitTransition"
  | "ended"
  | "fatalError";
```

Toda transición debe ser explícita.

## 17.4 Event bus

Eventos útiles:

- `sessionStarted`
- `roomEntered`
- `roomExited`
- `uniqueRoomDiscovered`
- `tensionChanged`
- `exitSpawned`
- `exitEntered`
- `pointerLockChanged`
- `qualityChanged`
- `originRebased`
- `fatalError`

Mantener tipos y evitar strings libres dispersos.

## 17.5 Configuración

Los valores de balance no deben estar escondidos en clases.

Ejemplo:

```ts
export const generationConfig = {
  initialSafeRooms: 8,
  activeGraphRadius: 3,
  preloadGraphRadius: 4,
  anomalyCooldownRooms: 4,
  exit: {
    minMinutes: 6,
    minUniqueRooms: 30,
    forceMinutes: 18,
    forceUniqueRooms: 120,
    maxChancePerCandidate: 0.16,
  },
} as const;
```

---

# 18. CONTENIDO DE HABITACIONES

## 18.1 RoomDefinition como dato

Las habitaciones deben definirse mediante datos y builders.

Ejemplo conceptual:

```ts
const mediumRectRoom: RoomDefinition = {
  id: "room_medium_rect",
  category: "room",
  footprint: { width: 12, depth: 10, height: 2.7 },
  sockets: [
    /* ... */
  ],
  weight: 1.0,
  minDepth: 0,
  maxConsecutive: 2,
  tags: ["stable", "exit-candidate"],
  geometryRecipe: {
    kind: "rectangular-room",
    wallSegments: /* ... */,
    ceilingGrid: /* ... */,
  },
  lightingProfile: "standard-medium",
  audioProfile: "medium-office",
  anomalySlots: [],
  exitCompatibleSurfaces: [
    /* ... */
  ],
};
```

## 18.2 Variación por instancia

Cada instancia puede variar:

- wallpaper tint;
- stain mask;
- fixture count;
- uno o dos tubos apagados;
- wetness;
- zócalo;
- ceiling panel color;
- ancho de un segmento dentro de límites.

No variar dimensiones críticas que rompan sockets.

## 18.3 Geometría

Para módulos generados en código:

- crear paredes por segmentos;
- compartir materiales;
- fusionar geometría estática por habitación;
- congelar matrices cuando sea seguro;
- evitar un mesh por panel de pared;
- usar thin instances para fixtures repetidos;
- colliders más simples que visuales.

## 18.4 UV

- densidad consistente;
- patrón alineado;
- evitar estiramiento;
- atlas con padding;
- no repetir una mancha exactamente en cada pared;
- usar una máscara secundaria por instancia.

## 18.5 Collision mesh

Separar:

- mesh visual;
- mesh collider;
- triggers;
- sockets.

El collider puede ser invisible y mucho más simple.

---

# 19. RENDIMIENTO

## 19.1 Objetivo

- 60 FPS en una PC media moderna.
- frame pacing estable.
- degradación elegante en hardware inferior.
- tiempo de carga razonable.
- memoria acotada.

## 19.2 Budgets iniciales

En el preset default:

- altura interna: 360 px;
- draw calls: ideal < 150, máximo habitual < 250;
- triángulos visibles: ideal < 250,000;
- luces dinámicas activas: 4–8;
- habitaciones con geometría activa: 25–60 según tamaño;
- audio nodes activos: controlados, sin cientos de panners;
- memoria de assets inicial: objetivo < 250 MB;
- descarga inicial: objetivo < 30 MB;
- descarga total: objetivo < 80 MB para primera versión.

Estos son presupuestos de trabajo, no garantías finales.

## 19.3 Técnicas

- mesh merging;
- thin instances;
- materiales compartidos;
- frustum culling;
- fog;
- pools;
- matrices congeladas;
- carga diferida;
- assets comprimidos;
- no usar sombras generales;
- no usar física;
- limitar postprocesos;
- evitar allocations por frame;
- arrays reutilizables;
- no recalcular el grafo completo cada frame.

## 19.4 QualityManager

Presets:

### Low

- 240p;
- sin SSAO;
- 4 luces proxy;
- distancia reducida;
- menor densidad de props.

### Default

- 360p;
- 6 luces proxy;
- efectos completos moderados;
- distancia normal.

### High

- 480p;
- 8 luces proxy;
- AO opcional;
- más distancia;
- mayor detalle de materiales.

## 19.5 Calidad dinámica

Puede añadirse después:

- medir frame time;
- si promedio permanece bajo por varios segundos, bajar resolución interna;
- no cambiar de calidad continuamente;
- respetar selección manual;
- registrar el cambio.

## 19.6 Context lost

Manejar pérdida de contexto WebGL:

- pausar;
- mostrar mensaje;
- intentar reconstruir recursos;
- ofrecer recargar;
- no dejar pantalla vacía sin explicación.

---

# 20. CARGA Y ASSETS

## 20.1 Loading strategy

### Boot mínimo

- HTML;
- CSS;
- JS base;
- fuente de UI si existe.

### Preload antes de jugar

- texturas comunes;
- loops base;
- pasos;
- materiales;
- módulos iniciales.

### Lazy load

- assets de anomalías;
- audio raro;
- módulos avanzados;
- credits imagery si existe.

## 20.2 Pantalla de carga

Mostrar progreso real cuando sea posible.

No fingir un porcentaje si no representa tareas.

## 20.3 Fallos

Si un asset falla:

- registrar;
- usar fallback;
- no bloquear toda la partida por una mancha opcional;
- sí bloquear si faltan assets esenciales del motor o del audio base;
- mostrar error entendible.

## 20.4 No runtime CDN para assets

El build de producción debe ser autosuficiente.

No cargar:

- texturas desde URLs de terceros;
- audio desde enlaces externos;
- modelos desde repositorios temporales.

Esto evita CORS, roturas y problemas de licencia.

---

# 21. DEBUG Y HERRAMIENTAS

## 21.1 Query params

Soportar:

```text
?seed=threshold-001
?debug=1
?quality=default
?exitNow=1
?noAudio=1
```

Las opciones peligrosas como `exitNow` solo en desarrollo o debug.

## 21.2 Debug HUD

Mostrar:

- FPS;
- frame time;
- draw calls;
- triangles;
- active meshes;
- active rooms;
- room ID;
- definition ID;
- seed;
- elapsed time;
- unique rooms;
- exit eligibility;
- exit probability;
- audio node count;
- floating origin offset.

## 21.3 Visualización de grafo

En debug:

- habitaciones activas;
- conexiones;
- sala actual;
- sockets abiertos;
- habitación de salida;
- habitaciones pendientes de descarga.

## 21.4 Seed repro

Todo bug procedural debe reportarse con:

- seed;
- versión;
- habitación;
- tiempo;
- dirección de entrada;
- screenshot;
- navegador;
- preset.

---

# 22. TESTING

## 22.1 Unit tests

- PRNG determinista;
- hash de subsemillas;
- cálculo de probabilidad;
- cooldowns;
- settings;
- state machine;
- session stats;
- configuración.

## 22.2 Tests del generador

Propiedades:

- todo socket conectado coincide;
- no existen conexiones a null cuando deberían cerrarse;
- no se solapa geometría dentro de la burbuja activa;
- cada habitación cargada es alcanzable desde la actual;
- la salida nunca aparece antes del mínimo;
- la salida siempre aparece antes del máximo;
- la misma semilla produce secuencia estable;
- no se repite un módulo más del límite;
- ninguna blackout contiene salida;
- no se descarga una habitación visible;
- floating origin preserva posiciones relativas.

Ejecutar simulaciones de cientos o miles de seeds sin renderer.

## 22.3 Integration tests

- iniciar sesión;
- crear mundo;
- entrar a habitaciones;
- stream in/out;
- rebase;
- spawn de salida;
- final;
- reinicio.

## 22.4 E2E con Playwright

Escenarios:

1. carga y muestra título;
2. ajustes persisten;
3. iniciar crea canvas;
4. modo debug permite movimiento simulado;
5. `exitNow` muestra salida;
6. atravesar salida llega a end screen;
7. repetir seed conserva semilla;
8. build funciona bajo ruta base no raíz;
9. error de WebGL muestra fallback.

Pointer lock puede ser difícil en automatización; crear hooks de test que no existan en producción normal.

## 22.5 Visual regression

Seeds fijas:

- `visual-corridor`;
- `visual-pillars`;
- `visual-arches`;
- `visual-blackout`;
- `visual-exit`.

Capturar cámaras fijas para detectar:

- materiales rotos;
- luces faltantes;
- UV incorrectos;
- cambios accidentales de color.

## 22.6 Audio QA manual

Checklist:

- no hay clicks en loops;
- no hay clipping;
- pasos corresponden a velocidad;
- al pausar, audio baja;
- al perder foco, audio se comporta correctamente;
- salida es localizable;
- buzzing no cansa de manera insoportable;
- blackout tiene silencio perceptible;
- volúmenes individuales funcionan.

## 22.7 Navegadores

Probar al menos:

- Chromium actual;
- Firefox actual;
- Edge actual;
- Safari solo después, si el alcance lo permite.

No prometer compatibilidad universal sin probar.

---

# 23. CI Y BUILD

## 23.1 Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "validate": "npm run lint && npm run test && npm run build"
  }
}
```

Adaptar a la configuración real.

## 23.2 Pipeline

En cada PR o ejecución de CI:

1. instalar con lockfile;
2. typecheck;
3. lint;
4. unit tests;
5. procedural tests;
6. build;
7. E2E smoke;
8. reportar tamaño de bundle.

## 23.3 Static deployment

El build debe funcionar en:

- raíz de dominio;
- subruta configurable;
- hosting estático.

Configurar `base` en Vite cuando sea necesario.

No usar `vite preview` como servidor de producción.

## 23.4 Headers recomendados

En hosting:

- cache largo para assets hasheados;
- no cache agresivo para `index.html`;
- Content-Type correcto;
- CSP razonable;
- HTTPS obligatorio para ciertas APIs y buena práctica general.

---

# 24. SEGURIDAD Y PRIVACIDAD

- no incluir secretos en variables `VITE_*`;
- no enviar datos personales;
- no analytics por defecto;
- no trackers;
- no cargar scripts remotos;
- sanitizar cualquier seed reflejada en DOM;
- limitar tamaño de query params;
- no evaluar código de usuario;
- usar dependencias mínimas;
- ejecutar auditoría de dependencias sin perseguir falsos positivos irrelevantes.

---

# 25. LICENCIAS Y ATRIBUCIÓN

## 25.1 Contenido de la wiki

La Backrooms Wiki utiliza CC BY-SA 3.0 para su contenido salvo indicación específica. Este juego adapta explícitamente:

- Level 0;
- su nombre;
- su descripción;
- la idea de la pared parpadeante como salida hacia Level 1;
- elementos estructurales descritos por la página.

Por tanto:

- incluir atribución;
- conservar referencias de autores;
- documentar la licencia;
- no asumir que una adaptación comercial queda libre de Share-Alike;
- buscar revisión legal antes de monetizar o publicar comercialmente;
- separar claramente licencias de código, contenido y assets, sin afirmar una separación legal que no haya sido verificada.

## 25.2 Imágenes

No copiar imágenes de la wiki por defecto.

Cada imagen puede tener su propia licencia y atribución. Crear arte original es la ruta más segura y coherente con la dirección visual.

## 25.3 Archivos legales

Crear:

- `CREDITS.md`
- `ASSET_LICENSES.md`
- `LICENSE-CONTENT.md`
- licencia del código, elegida conscientemente;
- créditos dentro del juego.

## 25.4 Fuentes base

- Level 0: `https://backrooms-wiki.wikidot.com/level-0`
- Licensing Guide: `https://backrooms-wiki.wikidot.com/licensing-guide`
- Babylon.js documentation: `https://doc.babylonjs.com/`
- Vite documentation: `https://vite.dev/guide/`

Este documento no sustituye asesoría legal.

---

# 26. ROADMAP DE IMPLEMENTACIÓN

No saltar directamente a “pulido final”. Cada fase debe dejar una build ejecutable.

---

## FASE 0 — REPOSITORIO Y FUNDACIÓN

### Objetivo

Crear una base mínima, limpia y verificable.

### Tareas

- inicializar Vite vanilla TypeScript;
- instalar Babylon.js modular;
- configurar TypeScript strict;
- configurar ESLint y Prettier;
- agregar Vitest;
- crear canvas;
- crear bootstrap de engine;
- crear escena vacía;
- resize correcto;
- state machine;
- pantalla de error;
- README inicial;
- `.nvmrc`;
- scripts;
- configuración de base path;
- CI mínimo.

### Criterios de aceptación

- `npm install` funciona;
- `npm run dev` muestra canvas;
- `npm run build` pasa;
- `npm run test` pasa;
- resize no distorsiona;
- no hay dependencias innecesarias;
- no hay warnings graves en consola.

### No hacer todavía

- procedural generation;
- audio complejo;
- arte final;
- postprocesos.

---

## FASE 1 — VERTICAL SLICE DE MOVIMIENTO

### Objetivo

Sentir correctamente caminar dentro de una sala de Level 0.

### Tareas

- cámara first-person;
- pointer lock;
- input;
- aceleración y frenado;
- sprint;
- colisión;
- gravedad;
- una sala simple;
- paredes, suelo y techo;
- una luz;
- material placeholder;
- pausa;
- settings de sensibilidad y FOV;
- stats básicos.

### Criterios de aceptación

- movimiento fluido;
- no atraviesa paredes;
- no tiembla en esquinas;
- no se cae por seams;
- Esc pausa;
- reanudación funciona;
- FOV y sensibilidad persisten;
- 60 FPS en escena simple.

### Gate

No continuar si mover la cámara y caminar no se siente bien.

---

## FASE 2 — AUDIO VERTICAL

### Objetivo

Probar que la escena produce atmósfera aun con arte limitado.

### Tareas

- pantalla “Haz clic para entrar”;
- AudioContext;
- buses;
- buzzing por capas;
- footstep system por distancia;
- caminar/correr;
- pausa y focus;
- control de volumen;
- un pop fluorescente;
- debug de audio nodes.

### Criterios de aceptación

- audio inicia únicamente después del gesto;
- loops no hacen click;
- pasos coinciden con movimiento;
- no hay clipping;
- pausa hace fade;
- el ambiente funciona con audífonos;
- la escena vacía ya resulta incómoda.

---

## FASE 3 — SISTEMA DE MÓDULOS

### Objetivo

Crear un laberinto finito pequeño con módulos reutilizables.

### Tareas

- `RoomDefinition`;
- sockets;
- 8–10 módulos;
- builders;
- colliders;
- materiales compartidos;
- lights anchors;
- triggers de habitación;
- grafo;
- conexión de módulos;
- prueba determinista.

### Criterios de aceptación

- módulos alinean;
- no hay agujeros;
- player cruza uniones sin bump;
- misma seed produce mismo pequeño layout;
- no hay repetición extrema;
- tests de sockets pasan.

---

## FASE 4 — STREAMING E INFINITO APARENTE

### Objetivo

Permitir caminar indefinidamente con memoria estable.

### Tareas

- ChunkStreamer;
- radio activo;
- precarga;
- descarga;
- historial lógico;
- pooling;
- fog;
- floating origin;
- métricas;
- simulaciones de recorrido largo.

### Criterios de aceptación

- caminar 30 minutos sin crecimiento continuo de memoria;
- no hay pop-in visible grave;
- no hay stutter frecuente;
- rebase no se percibe;
- habitaciones visibles no desaparecen;
- seed reproducible.

---

## FASE 5 — DIRECCIÓN VISUAL PIXELADA

### Objetivo

Conseguir la identidad gráfica real.

### Tareas

- resolución interna;
- CSS upscaling;
- texturas de pared;
- alfombra;
- techo;
- fixtures;
- zócalos;
- stains;
- wetness;
- palette;
- color grading;
- dithering;
- fog;
- presets de calidad;
- capturas de regresión.

### Criterios de aceptación

- se ve estilizado, no como escena 3D genérica;
- píxeles son estables;
- patrones no hacen shimmer insoportable;
- materiales se leen a distancia;
- no parece un filtro barato;
- default mantiene rendimiento.

---

## FASE 6 — ILUMINACIÓN Y FLICKER

### Objetivo

Hacer creíbles las luces fluorescentes.

### Tareas

- emissive fixtures;
- LightPool;
- perfiles;
- microflicker;
- fallos;
- transición por sala;
- salida reservada;
- reduced flashing;
- audio sync.

### Criterios de aceptación

- muchas luminarias visibles sin muchas luces reales;
- flicker no parece aleatorio por frame;
- buzzing corresponde;
- no hay parpadeo agresivo;
- rendimiento estable.

---

## FASE 7 — TENSION DIRECTOR Y ANOMALÍAS

### Objetivo

Crear una partida con curva.

### Tareas

- GameClock;
- fases de tensión;
- cooldowns;
- arcos;
- pilares;
- repetición;
- silence event;
- blackout corto;
- layout shifts fuera de vista;
- anti-repetition;
- configuración.

### Criterios de aceptación

- primeros minutos son estables;
- rarezas aumentan gradualmente;
- no hay spam;
- no existen cues de entidades;
- anomalías no rompen conectividad;
- una partida sin salida todavía es interesante durante 10+ minutos.

---

## FASE 8 — EXIT DIRECTOR Y FINAL

### Objetivo

Completar el juego.

### Tareas

- elegibilidad;
- probabilidad;
- candidatos;
- garantía;
- visual;
- audio posicional;
- collider de transición;
- ending;
- stats;
- repeat seed;
- tests.

### Criterios de aceptación

- nunca sale demasiado pronto;
- nunca tarda más del máximo;
- es alcanzable;
- se detecta sin HUD;
- transición funciona;
- end screen permite reiniciar;
- 1,000 simulaciones cumplen invariantes.

---

## FASE 9 — OPTIMIZACIÓN Y QA

### Objetivo

Preparar una build pública.

### Tareas

- profiling;
- reducir draw calls;
- medir memoria;
- comprimir assets;
- browser QA;
- context loss;
- errores;
- bundle analysis;
- accessibility;
- créditos;
- licencias;
- static deploy smoke.

### Criterios de aceptación

- build limpia;
- sin errores en consola;
- 60 FPS objetivo;
- controles y audio consistentes;
- no hay assets sin licencia;
- credits accesibles;
- partida completa probada;
- deploy funciona desde URL real.

---

# 27. MATRIZ DE CONTENIDO POR HITO

| Elemento | Vertical slice | MVP | 1.0 pulida |
|---|---:|---:|---:|
| Módulos comunes | 1 | 10–12 | 16–24 |
| Arcos | No | 1 | 2–3 variaciones |
| Pilares | No | 1 | 2 variaciones |
| Blackout | No | Opcional | Sí, controlado |
| Layout shifts | No | Básicos | Avanzados |
| Salida | Debug | Sí | Sí, pulida |
| Texturas finales | No | Parciales | Sí |
| Buzzing por capas | Básico | Sí | Pulido |
| Pasos húmedos | Básicos | Sí | Variaciones |
| Presets gráficos | No | 2 | 3 |
| Browser QA | Chromium | Chromium/Firefox | Matriz ampliada |

---

# 28. RIESGOS Y MITIGACIONES

## 28.1 “Procedural” pero aburrido

**Riesgo:** el mapa funciona técnicamente, pero todas las salas se sienten iguales.

**Mitigación:**

- módulos diseñados a mano;
- gramática;
- rarezas;
- pacing;
- tests de secuencia;
- playtests;
- menos módulos, mejor acabados.

## 28.2 Pixel art que parece filtro

**Riesgo:** renderizar bajo y aplicar nearest no produce dirección artística.

**Mitigación:**

- assets creados para baja resolución;
- paleta;
- geometría;
- iluminación;
- texturas originales;
- revisión artística específica.

## 28.3 Audio repetitivo

**Riesgo:** el buzz en loop revela su repetición y molesta.

**Mitigación:**

- capas;
- loops largos;
- modulación;
- crossfades;
- perfiles por sala;
- silencios;
- control de volumen.

## 28.4 Salida frustrante

**Riesgo:** RNG puro.

**Mitigación:**

- mínimo;
- probabilidad creciente;
- garantía;
- candidato válido;
- simulación estadística.

## 28.5 Scope creep

**Riesgo:** empezar a añadir Level 1, entidades o inventario.

**Mitigación:**

- non-goals;
- fases;
- gates;
- backlog separado;
- no implementar ideas nuevas sin revisar impacto.

## 28.6 Rendimiento

**Riesgo:** una luz por fixture, demasiados meshes o audio nodes.

**Mitigación:**

- budgets;
- pooling;
- merging;
- lights proxy;
- streaming;
- profiling temprano.

## 28.7 Colisiones pobres

**Riesgo:** uniones, esquinas y desniveles molestos.

**Mitigación:**

- collider simplificado;
- pruebas;
- no jump;
- step offset;
- fixtures sin collider innecesario.

## 28.8 Navegadores

**Riesgo:** comportamiento distinto de pointer lock y audio.

**Mitigación:**

- capability detection;
- fallback;
- pruebas;
- pantalla de incompatibilidad;
- baseline WebGL2.

## 28.9 Dependencia excesiva de IA

**Riesgo:** código voluminoso que compila, pero no produce una buena experiencia.

**Mitigación:**

- fases pequeñas;
- playtest humano;
- perfiles;
- criterios sensoriales;
- no aceptar “terminado” por cantidad de archivos.

## 28.10 Licencia

**Riesgo:** publicar assets o contenido sin atribución correcta.

**Mitigación:**

- manifiesto;
- créditos;
- no copiar imágenes;
- arte original;
- revisión legal previa a monetización.

---

# 29. DEFINITION OF DONE DEL PROYECTO

El prototipo no está terminado simplemente porque se puede caminar.

Se considera terminado cuando:

## Funcional

- abre desde URL;
- carga;
- audio desbloquea;
- pointer lock funciona;
- el jugador puede caminar y correr;
- mundo continúa generándose;
- memoria se mantiene acotada;
- salida aparece;
- salida termina el juego;
- reinicio funciona.

## Diseño

- la partida dura en el rango previsto;
- no hay entidades;
- no hay jumpscares;
- la monotonía no se convierte en aburrimiento inmediato;
- la salida parece descubierta, no entregada;
- cambios espaciales son sutiles y justos.

## Visual

- look pixelado detallado coherente;
- materiales originales;
- luminarias creíbles;
- no hay seams graves;
- no hay pop-in obvio;
- no hay shimmer insoportable;
- UI legible.

## Audio

- buzzing por capas;
- pasos convincentes;
- no hay clicks;
- no hay clipping;
- salida localizable;
- pausa y focus correctos;
- volúmenes configurables.

## Técnico

- TypeScript sin errores;
- lint;
- tests;
- build;
- E2E smoke;
- no memory leak evidente;
- no errores de consola;
- static deploy probado;
- debug reproducible por seed.

## Legal

- créditos;
- licencias;
- ningún asset desconocido;
- adaptación documentada.

---

# 30. ESTIMACIÓN DE ESFUERZO

La IA puede acelerar scaffolding, implementación y pruebas, pero no reemplaza el playtesting ni el juicio artístico.

Estimación orientativa para una persona técnica con asistencia fuerte de Sol 5.6 Ultra:

| Área | Esfuerzo aproximado |
|---|---:|
| Fundación y movimiento | 2–4 días |
| Módulos y generador | 5–10 días |
| Streaming y non-euclidean básico | 4–8 días |
| Render pixelado y materiales | 7–15 días |
| Audio base y pulido | 5–12 días |
| Tensión, salida y final | 3–6 días |
| QA, rendimiento y deploy | 5–10 días |
| Total realista de MVP pulido | 4–8 semanas full-time |

Un vertical slice funcional puede existir antes. Una experiencia realmente convincente requiere iteración.

No prometer “gráficos al nivel de un estudio” únicamente por utilizar Ultra. El modelo puede construir la infraestructura y generar arte procedural, pero el acabado depende de evaluación y refinamiento.

---

# 31. BACKLOG POSTERIOR, NO PARTE DEL MVP

Ideas para una fase futura:

- Level 0.1 como expansión;
- portal teaser hacia Level 1;
- más familias de módulos;
- true portal topology;
- compartir seed con link;
- daily seed;
- photo mode;
- gamepad;
- PWA/offline;
- más presets;
- glTF authored rooms;
- audio binaural avanzado;
- modo de exploración sin salida;
- speedrun mode;
- integración de Level 1.

Estas ideas no deben contaminar la arquitectura central, pero tampoco deben implementarse antes de cerrar Level 0.

---

# 32. PRIMERA ORDEN DE EJECUCIÓN PARA SOL

Al recibir este documento y un repositorio:

1. Inspeccionar el estado real del repositorio.
2. Resumir brevemente:
   - stack existente;
   - archivos;
   - dependencias;
   - riesgos;
   - divergencias con este plan.
3. Proponer la implementación de **Fase 0 y Fase 1 solamente**.
4. No comenzar fases posteriores sin tener movimiento y colisión validados.
5. Implementar con TypeScript estricto.
6. Ejecutar:
   - typecheck;
   - lint;
   - tests;
   - build.
7. Entregar:
   - lista de archivos cambiados;
   - decisiones;
   - validaciones;
   - limitaciones;
   - siguientes pasos.
8. No commit/push/deploy sin autorización.
9. No sustituir Babylon.js por Three.js.
10. No añadir un framework UI.

---

# 33. CHECKLIST DE REVISIÓN POR FASE

Antes de cerrar cualquier fase:

- [ ] ¿La build abre?
- [ ] ¿Hay errores en consola?
- [ ] ¿La fase puede probarse sin editar código?
- [ ] ¿Los valores de tuning están configurados, no hardcodeados?
- [ ] ¿Existe una seed reproducible?
- [ ] ¿El cambio mantiene el rendimiento?
- [ ] ¿Hay tests para lógica crítica?
- [ ] ¿El código mantiene separación entre lógica y Babylon?
- [ ] ¿Se añadieron dependencias innecesarias?
- [ ] ¿Se introdujo contenido fuera de alcance?
- [ ] ¿Los assets tienen licencia?
- [ ] ¿La experiencia sigue sin entidades?
- [ ] ¿El audio fue probado con audífonos?
- [ ] ¿El efecto visual respeta reduced flashing?
- [ ] ¿El resultado es realmente mejor o solo más complejo?

---

# 34. PRINCIPIOS FINALES

1. **Level 0 no necesita monstruos para dar miedo.**
2. **La ausencia es contenido.**
3. **El buzzing es parte del mundo, no música de fondo.**
4. **El procedural debe estar dirigido por diseño.**
5. **La salida debe parecer azar y funcionar como sistema.**
6. **La arquitectura local debe ser estable; la global puede mentir.**
7. **El pixel art nace de assets y paleta, no de un filtro.**
8. **El navegador impone restricciones que deben aceptarse, no ignorarse.**
9. **Un vertical slice excelente vale más que veinte features incompletas.**
10. **No avanzar por cantidad de código; avanzar por calidad perceptible.**

---

# 35. RESUMEN OPERATIVO DEFINITIVO

Construir una aplicación estática first-person en Babylon.js, TypeScript y Vite. El jugador despierta en Level 0, explora un laberinto procedural con streaming y seed, escucha buzzing fluorescente y pasos sobre alfombra húmeda, observa arquitectura amarilla pixelada y detallada, experimenta cambios espaciales fuera de la vista y finalmente encuentra una pared parpadeante generada mediante azar controlado. Al atravesarla, termina la experiencia.

No hay entidades, combate, inventario, backend ni multijugador.

La prioridad de implementación es:

1. movimiento;
2. audio;
3. módulos;
4. streaming;
5. dirección visual;
6. iluminación;
7. tensión;
8. salida;
9. optimización;
10. publicación.

El resultado esperado no es una demo tecnológica genérica. Debe ser una pieza corta, precisa y atmosférica en la que cada decisión refuerce la sensación de estar atrapado en un espacio infinito, ordinario e imposible.
