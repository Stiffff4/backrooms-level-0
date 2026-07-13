export class CreditsDialog {
  public readonly element: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private previousFocus: HTMLElement | null = null;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    }
  };

  public constructor(root: HTMLElement) {
    this.element = document.createElement('section');
    this.element.className = 'credits-dialog ui-overlay';
    this.element.hidden = true;
    this.element.tabIndex = -1;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
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
      'Adaptación de Level 0 de Backrooms Wiki, contenido disponible bajo CC BY-SA 3.0.';

    const note = document.createElement('p');
    note.textContent =
      'La atribución completa, autores, licencias y modificaciones se incluyen con la build.';

    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.textContent = 'Cerrar';
    this.closeButton.addEventListener('click', () => this.hide());

    panel.append(title, project, adaptation, note, this.closeButton);
    this.element.append(panel);
    this.element.addEventListener('keydown', this.handleKeyDown);
    root.append(this.element);
  }

  public show(): void {
    this.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.element.hidden = false;
    this.closeButton.focus();
  }

  public hide(): void {
    if (this.element.hidden) {
      return;
    }
    this.element.hidden = true;
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
}
