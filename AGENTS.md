# Project Instructions

## Source of truth

Read `MASTER_PLAN.md` completely before planning or modifying the project.

`MASTER_PLAN.md` is the authoritative specification for the product,
game design, architecture, visual direction, audio, procedural generation,
testing, optimization, licensing and final definition of done.

## Primary mission

Implement the complete game described in `MASTER_PLAN.md` from beginning to end.

The roadmap phases are internal implementation checkpoints, not approval gates.
Do not stop after completing an individual phase. Validate it, record progress,
and immediately continue with the next phase.

Continue until every applicable phase, acceptance criterion and final
Definition of Done in `MASTER_PLAN.md` has been completed and verified.

## Autonomous execution rules

- Work continuously through the complete roadmap.
- Do not ask for approval between phases.
- Do not stop merely to provide an intermediate report.
- Do not leave the project at scaffold, prototype or vertical-slice level.
- Do not claim completion while required systems remain placeholders.
- When a validation fails, investigate, fix it and run it again.
- When an approach proves inadequate, revise it rather than abandoning the feature.
- Make reasonable technical decisions independently when the specification
  leaves implementation details open.
- Ask the user only when genuinely blocked by an irreversible external decision,
  unavailable credentials, paid services, or missing information that cannot
  be safely substituted.
- Prefer a safe local implementation over stopping for a minor ambiguity.
- Do not wait for the user to manually test every phase before continuing.
- Perform your own automated validations and browser checks.
- Keep the project runnable after every major milestone.

## Mandatory technology

- Babylon.js
- TypeScript in strict mode
- Vite
- HTML
- CSS
- DOM APIs
- Web Audio API

Do not replace Babylon.js with Three.js.

Do not add:

- React
- Vue
- Angular
- Next.js
- a backend
- a database
- authentication
- multiplayer
- a general-purpose physics engine

## Product boundaries

- The game represents only Level 0.
- It is first-person.
- It runs in a desktop web browser.
- There are no entities.
- There is no combat.
- There is no inventory.
- There is no hunger, thirst or crafting.
- Horror must come from architecture, sound, lighting, repetition,
  procedural variation and spatial disorientation.
- The experience ends after the player crosses the flickering exit wall.

## Quality requirements

- Prioritize perceptible game quality over code volume.
- Do not treat a generic low-resolution 3D scene as finished pixel art.
- Create coherent original procedural textures and visual assets.
- Create or synthesize functional original audio where external licensed
  assets are unavailable.
- Do not use assets with unknown licenses.
- Do not download arbitrary images, models or sounds from the Internet.
- Do not use placeholder assets in the final build unless they are explicitly
  documented as a limitation and no reasonable original substitute can be made.
- Optimize for stable browser performance.
- Test actual gameplay, not only compilation.

## Progress persistence

Create and continuously maintain:

- `PROGRESS.md`
- `DECISIONS.md`
- `KNOWN_ISSUES.md`

After every roadmap phase:

1. Update `PROGRESS.md`.
2. Record important architectural decisions in `DECISIONS.md`.
3. Record remaining defects in `KNOWN_ISSUES.md`.
4. Run all applicable validations.
5. Fix blocking failures.
6. Create a local Git commit as a checkpoint.
7. Continue automatically to the next phase.

Use clear local commit messages such as:

- `chore: initialize babylon game foundation`
- `feat: implement first person movement`
- `feat: add procedural room generation`
- `feat: add streamed infinite world`
- `feat: implement pixel rendering pipeline`
- `feat: add environmental audio system`
- `feat: implement tension and anomalies`
- `feat: add controlled exit sequence`
- `perf: optimize browser rendering`
- `chore: finalize level zero release`

Local commits are authorized.

Do not:

- create a remote repository;
- push;
- deploy publicly;
- purchase services;
- use paid APIs.

## Validation requirements

Continuously run the relevant commands, including:

- TypeScript type checking
- lint
- unit tests
- procedural generation tests
- integration tests
- production build
- Playwright browser tests
- bundle and performance inspection

Do not ignore failing tests.

For procedural systems, test many deterministic seeds and verify:

- no invalid socket connections;
- no unreachable exit;
- no premature exit;
- exit appears before the maximum limit;
- no unbounded active-room growth;
- no visible room is unloaded;
- no repeated module exceeds configured limits;
- floating-origin rebasing preserves relative positions.

## Browser verification

Use automated browser testing and screenshots where possible.

Verify at minimum:

- title screen loads;
- game begins after user interaction;
- audio initialization is handled correctly;
- pointer lock flow works or has a test-safe abstraction;
- player movement works;
- procedural rooms generate;
- world streaming works;
- pause and settings work;
- exit can spawn;
- crossing the exit reaches the end screen;
- restarting with the same seed works;
- production build runs from static hosting.

## Completion standard

Do not stop until the complete game is:

- feature-complete;
- playable from beginning to end;
- visually coherent;
- audible and atmospheric;
- procedurally generated;
- performance-conscious;
- tested;
- documented;
- built for production;
- compliant with the final Definition of Done in `MASTER_PLAN.md`.

At final completion, provide one final report containing:

- implemented systems;
- final project structure;
- important design decisions;
- assets created;
- commands and validations executed;
- test results;
- performance observations;
- known non-blocking limitations;
- exact local run instructions;
- exact production build instructions;
- final Git status and commit history summary.

Do not present an intermediate milestone report as the final result.