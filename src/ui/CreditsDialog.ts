export class CreditsDialog {
  public readonly element: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private previousFocus: HTMLElement | null = null;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = this.getFocusableElements();
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      this.element.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  public constructor(root: HTMLElement) {
    this.element = document.createElement('section');
    this.element.className = 'credits-dialog ui-overlay';
    this.element.hidden = true;
    this.element.tabIndex = -1;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.setAttribute('aria-labelledby', 'credits-title');

    const panel = document.createElement('div');
    panel.className = 'credits-dialog__panel';

    const title = document.createElement('h1');
    title.id = 'credits-title';
    title.textContent = 'Créditos';

    const project = document.createElement('p');
    project.textContent =
      'THRESHOLD — diseño, código, texturas y audio originales creados para este proyecto.';

    const adaptation = document.createElement('p');
    adaptation.textContent =
      'Adaptación de “Level 0 — Threshold”, por DivineAtlas, DrAkimoto y RobertGoerman, ' +
      'publicado en Backrooms Wiki bajo CC BY-SA 3.0.';

    const source = document.createElement('a');
    source.href = 'https://backrooms-wiki.wikidot.com/level-0';
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = 'Abrir la fuente y atribución de Level 0';

    const note = document.createElement('p');
    note.textContent =
      'La atribución completa, autores, licencias y modificaciones se incluyen con la build.';

    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.textContent = 'Cerrar';
    this.closeButton.addEventListener('click', () => this.hide());

    panel.append(title, project, adaptation, source, note, this.closeButton);
    this.element.append(panel);
    this.element.addEventListener('keydown', this.handleKeyDown);
    root.append(this.element);
  }

  public show(): void {
    this.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.element.hidden = false;
    this.element.setAttribute('aria-hidden', 'false');
    this.closeButton.focus();
  }

  public hide(): void {
    if (this.element.hidden) {
      return;
    }
    this.element.hidden = true;
    this.element.setAttribute('aria-hidden', 'true');
    if (this.previousFocus?.isConnected) {
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
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    );
  }
}
