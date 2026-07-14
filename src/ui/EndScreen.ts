export interface EndScreenStats {
  elapsedSeconds: number;
  roomsVisited: number;
  seed: string;
}

export interface EndScreenCallbacks {
  onRestartNewSeed: () => void;
  onRestartSameSeed: () => void;
  onReturnToTitle: () => void;
  onCredits?: () => void;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function formatSessionDuration(elapsedSeconds: number): string {
  const totalSeconds = Math.floor(finiteNonNegative(elapsedSeconds));
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds,
    ).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function createStat(
  labelText: string,
  className: string,
): {
  container: HTMLDivElement;
  value: HTMLElement;
} {
  const container = document.createElement('div');
  container.className = 'end-screen__stat';

  const label = document.createElement('dt');
  label.textContent = labelText;

  const value = document.createElement('dd');
  value.className = className;

  container.append(label, value);
  return { container, value };
}

/** Terminal native-DOM overlay shown after the player crosses the exit wall. */
export class EndScreen {
  public readonly element: HTMLElement;

  private readonly newSeedButton: HTMLButtonElement;
  private readonly elapsedValue: HTMLElement;
  private readonly roomsValue: HTMLElement;
  private readonly seedValue: HTMLElement;
  private readonly copyStatus: HTMLElement;
  private previousFocus: HTMLElement | null = null;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') {
      return;
    }

    const focusable = this.getFocusableElements();
    const first = focusable[0];
    const last = focusable.at(-1);

    if (!first || !last) {
      event.preventDefault();
      this.element.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  public constructor(
    root: HTMLElement,
    private readonly callbacks: EndScreenCallbacks,
  ) {
    this.element = document.createElement('section');
    this.element.className = 'end-screen ui-overlay';
    this.element.hidden = true;
    this.element.tabIndex = -1;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.setAttribute('aria-labelledby', 'end-screen-title');
    this.element.setAttribute('aria-describedby', 'end-screen-thanks end-screen-level-one');

    const header = document.createElement('header');
    header.className = 'end-screen__header';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'LEVEL 0';

    const heading = document.createElement('h1');
    heading.id = 'end-screen-title';
    heading.textContent = 'THRESHOLD';

    const thanks = document.createElement('p');
    thanks.id = 'end-screen-thanks';
    thanks.className = 'end-screen__thanks';
    thanks.textContent = 'Gracias por jugar.';

    const levelOneHint = document.createElement('p');
    levelOneHint.id = 'end-screen-level-one';
    levelOneHint.className = 'end-screen__hint';
    levelOneHint.textContent = 'Más allá del umbral, Level 1 espera.';

    header.append(eyebrow, heading, thanks, levelOneHint);

    const statsHeading = document.createElement('h2');
    statsHeading.id = 'end-screen-stats-title';
    statsHeading.textContent = 'Tu recorrido';

    const stats = document.createElement('dl');
    stats.className = 'end-screen__stats';
    stats.setAttribute('aria-labelledby', statsHeading.id);

    const elapsedStat = createStat('Tiempo', 'end-screen__elapsed');
    const roomsStat = createStat('Habitaciones únicas', 'end-screen__rooms');
    const seedStat = createStat('Semilla', 'end-screen__seed');
    this.elapsedValue = elapsedStat.value;
    this.roomsValue = roomsStat.value;
    this.seedValue = seedStat.value;
    stats.append(elapsedStat.container, roomsStat.container, seedStat.container);

    this.newSeedButton = document.createElement('button');
    this.newSeedButton.type = 'button';
    this.newSeedButton.className = 'end-screen__primary-action';
    this.newSeedButton.textContent = 'Nueva partida';
    this.newSeedButton.addEventListener('click', () => this.callbacks.onRestartNewSeed());

    const restartButton = document.createElement('button');
    restartButton.type = 'button';
    restartButton.textContent = 'Repetir esta semilla';
    restartButton.addEventListener('click', () => this.callbacks.onRestartSameSeed());

    const titleButton = document.createElement('button');
    titleButton.type = 'button';
    titleButton.textContent = 'Volver al título';
    titleButton.addEventListener('click', () => this.callbacks.onReturnToTitle());

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Copiar semilla';
    copyButton.addEventListener('click', () => void this.copySeed());

    const actions = document.createElement('div');
    actions.className = 'end-screen__actions';
    actions.append(this.newSeedButton, restartButton, copyButton, titleButton);

    this.copyStatus = document.createElement('p');
    this.copyStatus.className = 'end-screen__copy-status';
    this.copyStatus.setAttribute('role', 'status');
    this.copyStatus.setAttribute('aria-live', 'polite');

    const onCredits = this.callbacks.onCredits;
    if (onCredits) {
      const creditsButton = document.createElement('button');
      creditsButton.type = 'button';
      creditsButton.textContent = 'Créditos';
      creditsButton.addEventListener('click', onCredits);
      actions.append(creditsButton);
    }

    this.element.append(header, statsHeading, stats, actions, this.copyStatus);
    this.element.addEventListener('keydown', this.handleKeyDown);
    root.append(this.element);
  }

  public get visible(): boolean {
    return !this.element.hidden;
  }

  public show(stats: Readonly<EndScreenStats>): void {
    const seed = stats.seed.trim();
    this.elapsedValue.textContent = formatSessionDuration(stats.elapsedSeconds);
    this.roomsValue.textContent = String(Math.floor(finiteNonNegative(stats.roomsVisited)));
    this.seedValue.textContent = seed || '—';
    this.copyStatus.textContent = '';

    if (!this.visible) {
      this.previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }

    this.element.hidden = false;
    this.element.setAttribute('aria-hidden', 'false');
    this.newSeedButton.focus();
  }

  public hide(restoreFocus = false): void {
    if (!this.visible) {
      return;
    }

    this.element.hidden = true;
    this.element.setAttribute('aria-hidden', 'true');

    if (restoreFocus && this.previousFocus?.isConnected) {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }

  public dispose(): void {
    this.hide();
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.element.remove();
  }

  private getFocusableElements(): HTMLElement[] {
    return Array.from(
      this.element.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('hidden'));
  }

  private async copySeed(): Promise<void> {
    const seed = this.seedValue.textContent?.trim() ?? '';
    if (!seed || seed === '—') {
      this.copyStatus.textContent = 'No hay una semilla disponible.';
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable.');
      }
      await navigator.clipboard.writeText(seed);
      this.copyStatus.textContent = 'Semilla copiada.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(this.seedValue);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      this.copyStatus.textContent = 'Semilla seleccionada para copiar.';
    }
  }
}
