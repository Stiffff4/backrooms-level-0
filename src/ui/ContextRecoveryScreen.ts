import type { WebGlRecoveryPhase, WebGlRecoverySnapshot } from '../engine/WebGlContextRecovery';

export interface ContextRecoveryScreenCallbacks {
  readonly onRetry: () => boolean | Promise<boolean>;
  readonly onReload?: () => void;
}

export interface ContextRecoveryCopy {
  readonly title: string;
  readonly description: string;
  readonly busy: boolean;
}

export function getContextRecoveryCopy(
  phase: WebGlRecoveryPhase,
  lastError: string | null = null,
): ContextRecoveryCopy {
  switch (phase) {
    case 'ready':
      return {
        title: 'Imagen recuperada',
        description: 'Los recursos gráficos están listos de nuevo.',
        busy: false,
      };
    case 'lost':
      return {
        title: 'La imagen se ha interrumpido',
        description:
          'El navegador perdió el contexto gráfico. La partida está pausada y su estado se conserva.',
        busy: false,
      };
    case 'restoring':
      return {
        title: 'Recuperando la imagen',
        description: 'Se están reconstruyendo los recursos gráficos. No cierres la página.',
        busy: true,
      };
    case 'failed':
      return {
        title: 'No se pudo recuperar la imagen',
        description:
          lastError ??
          'La reconstrucción de los recursos gráficos falló. Puedes volver a intentarlo o recargar.',
        busy: false,
      };
    case 'disposed':
      return {
        title: 'Recuperación detenida',
        description: 'El sistema gráfico se ha cerrado.',
        busy: false,
      };
  }
}

/** Accessible overlay driven by WebGlContextRecovery snapshots. */
export class ContextRecoveryScreen {
  public readonly element: HTMLElement;

  private readonly title: HTMLHeadingElement;
  private readonly description: HTMLParagraphElement;
  private readonly status: HTMLParagraphElement;
  private readonly retryButton: HTMLButtonElement;
  private readonly reloadButton: HTMLButtonElement;
  private previousFocus: HTMLElement | null = null;
  private disposed = false;

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

  private readonly handleRetry = (): void => {
    void this.retry();
  };

  private readonly handleReload = (): void => {
    if (this.callbacks.onReload) {
      this.callbacks.onReload();
      return;
    }
    window.location.reload();
  };

  public constructor(
    root: HTMLElement,
    private readonly callbacks: ContextRecoveryScreenCallbacks,
  ) {
    this.element = document.createElement('section');
    this.element.className = 'context-recovery-screen fatal-error ui-overlay';
    this.element.hidden = true;
    this.element.tabIndex = -1;
    this.element.setAttribute('role', 'alertdialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.setAttribute('aria-labelledby', 'context-recovery-title');
    this.element.setAttribute('aria-describedby', 'context-recovery-description');

    this.title = document.createElement('h1');
    this.title.id = 'context-recovery-title';

    this.description = document.createElement('p');
    this.description.id = 'context-recovery-description';

    this.status = document.createElement('p');
    this.status.className = 'context-recovery-screen__status';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'assertive');

    this.retryButton = document.createElement('button');
    this.retryButton.type = 'button';
    this.retryButton.textContent = 'Intentar recuperar';
    this.retryButton.addEventListener('click', this.handleRetry);

    this.reloadButton = document.createElement('button');
    this.reloadButton.type = 'button';
    this.reloadButton.textContent = 'Recargar';
    this.reloadButton.addEventListener('click', this.handleReload);

    const actions = document.createElement('div');
    actions.className = 'context-recovery-screen__actions';
    actions.append(this.retryButton, this.reloadButton);

    this.element.append(this.title, this.description, this.status, actions);
    this.element.addEventListener('keydown', this.handleKeyDown);
    root.append(this.element);
  }

  public get visible(): boolean {
    return !this.element.hidden;
  }

  public update(snapshot: Readonly<WebGlRecoverySnapshot>): void {
    if (this.disposed) {
      return;
    }

    if (snapshot.phase === 'ready' || snapshot.phase === 'disposed') {
      this.hide(snapshot.phase === 'ready');
      return;
    }

    const copy = getContextRecoveryCopy(snapshot.phase, snapshot.lastError);
    this.title.textContent = copy.title;
    this.description.textContent = copy.description;
    this.status.textContent =
      snapshot.phase === 'lost'
        ? 'La simulación, el movimiento y el audio están pausados.'
        : snapshot.phase === 'restoring'
          ? 'Reconstrucción en curso…'
          : 'La partida sigue pausada.';
    this.retryButton.disabled = copy.busy;
    this.element.dataset.contextRecoveryPhase = snapshot.phase;
    this.element.setAttribute('aria-busy', String(copy.busy));

    if (!this.visible) {
      this.previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.element.hidden = false;
      this.element.setAttribute('aria-hidden', 'false');
    }

    if (copy.busy) {
      this.reloadButton.focus();
    } else {
      this.retryButton.focus();
    }
  }

  public hide(restoreFocus = false): void {
    if (!this.visible) {
      return;
    }

    this.element.hidden = true;
    this.element.setAttribute('aria-hidden', 'true');
    this.element.removeAttribute('aria-busy');
    if (restoreFocus && this.previousFocus?.isConnected) {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.hide();
    this.retryButton.removeEventListener('click', this.handleRetry);
    this.reloadButton.removeEventListener('click', this.handleReload);
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.element.remove();
  }

  private async retry(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.retryButton.disabled = true;
    this.element.setAttribute('aria-busy', 'true');
    this.status.textContent = 'Solicitando recuperación…';
    try {
      const accepted = await this.callbacks.onRetry();
      if (!accepted && this.visible) {
        this.status.textContent =
          'La recuperación no está disponible. Recarga para reconstruir la partida.';
      }
    } catch {
      if (this.visible) {
        this.status.textContent = 'La recuperación falló. Puedes volver a intentarlo o recargar.';
      }
    } finally {
      if (this.visible && this.element.dataset.contextRecoveryPhase !== 'restoring') {
        this.retryButton.disabled = false;
        this.element.removeAttribute('aria-busy');
      }
    }
  }

  private getFocusableElements(): HTMLElement[] {
    return Array.from(
      this.element.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('hidden'));
  }
}
