import type { CapabilityStatus, GameCapabilityReport } from '../engine/Capabilities';

export interface IncompatibilityScreenCallbacks {
  readonly onRetry?: () => Readonly<GameCapabilityReport> | Promise<Readonly<GameCapabilityReport>>;
  readonly onCompatible?: (report: Readonly<GameCapabilityReport>) => void;
  readonly onReload?: () => void;
}

export interface CapabilityScreenCopy {
  readonly title: string;
  readonly description: string;
}

export function getCapabilityScreenCopy(status: CapabilityStatus): CapabilityScreenCopy {
  switch (status) {
    case 'compatible':
      return {
        title: 'El navegador es compatible',
        description: 'Las capacidades esenciales están disponibles.',
      };
    case 'degraded':
      return {
        title: 'Compatibilidad limitada',
        description:
          'La experiencia puede continuar, aunque algunas preferencias no estarán disponibles.',
      };
    case 'incompatible':
      return {
        title: 'Este navegador no puede cruzar el umbral',
        description:
          'THRESHOLD necesita las capacidades indicadas para ofrecer una partida completa y segura.',
      };
  }
}

/** Accessible blocking screen for startup capability failures. */
export class IncompatibilityScreen {
  public readonly element: HTMLElement;

  private readonly title: HTMLHeadingElement;
  private readonly description: HTMLParagraphElement;
  private readonly issueList: HTMLUListElement;
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
    private readonly callbacks: IncompatibilityScreenCallbacks = {},
  ) {
    this.element = document.createElement('section');
    this.element.className = 'incompatibility-screen fatal-error ui-overlay';
    this.element.hidden = true;
    this.element.tabIndex = -1;
    this.element.setAttribute('role', 'alertdialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.setAttribute('aria-labelledby', 'incompatibility-screen-title');
    this.element.setAttribute('aria-describedby', 'incompatibility-screen-description');

    this.title = document.createElement('h1');
    this.title.id = 'incompatibility-screen-title';

    this.description = document.createElement('p');
    this.description.id = 'incompatibility-screen-description';

    this.issueList = document.createElement('ul');
    this.issueList.className = 'incompatibility-screen__issues';
    this.issueList.setAttribute('aria-label', 'Problemas de compatibilidad');

    this.status = document.createElement('p');
    this.status.className = 'incompatibility-screen__status';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');

    this.retryButton = document.createElement('button');
    this.retryButton.type = 'button';
    this.retryButton.textContent = 'Volver a comprobar';
    this.retryButton.addEventListener('click', this.handleRetry);

    this.reloadButton = document.createElement('button');
    this.reloadButton.type = 'button';
    this.reloadButton.textContent = 'Recargar';
    this.reloadButton.addEventListener('click', this.handleReload);

    const actions = document.createElement('div');
    actions.className = 'incompatibility-screen__actions';
    actions.append(this.retryButton, this.reloadButton);

    this.element.append(this.title, this.description, this.issueList, this.status, actions);
    this.element.addEventListener('keydown', this.handleKeyDown);
    root.append(this.element);
  }

  public get visible(): boolean {
    return !this.element.hidden;
  }

  public show(report: Readonly<GameCapabilityReport>): void {
    if (this.disposed) {
      return;
    }

    const copy = getCapabilityScreenCopy(report.status);
    this.title.textContent = copy.title;
    this.description.textContent = copy.description;
    this.issueList.replaceChildren();

    for (const issue of report.issues) {
      const item = document.createElement('li');
      const heading = document.createElement('strong');
      heading.textContent = issue.title;
      const detail = document.createElement('span');
      detail.textContent = ` — ${issue.message}`;
      item.dataset.severity = issue.severity;
      item.append(heading, detail);
      this.issueList.append(item);
    }

    this.issueList.hidden = report.issues.length === 0;
    this.status.textContent = '';
    this.setBusy(false);

    if (!this.visible) {
      this.previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    this.element.hidden = false;
    this.element.setAttribute('aria-hidden', 'false');
    this.element.dataset.compatibilityStatus = report.status;
    this.retryButton.focus();
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

    if (!this.callbacks.onRetry) {
      this.handleReload();
      return;
    }

    this.setBusy(true);
    this.status.textContent = 'Comprobando de nuevo…';
    try {
      const report = await this.callbacks.onRetry();
      if (report.status === 'incompatible') {
        this.show(report);
        return;
      }

      this.hide();
      this.callbacks.onCompatible?.(report);
    } catch {
      this.status.textContent =
        'No se pudo completar la comprobación. Puedes recargar para intentarlo de nuevo.';
    } finally {
      if (this.visible) {
        this.setBusy(false);
      }
    }
  }

  private setBusy(busy: boolean): void {
    this.retryButton.disabled = busy;
    if (busy) {
      this.element.setAttribute('aria-busy', 'true');
    } else {
      this.element.removeAttribute('aria-busy');
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
