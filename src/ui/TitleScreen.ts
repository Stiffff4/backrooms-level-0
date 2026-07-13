import { SettingsControls } from './PauseMenu';
import type { SettingsStore } from './SettingsStore';

export interface TitleScreenCallbacks {
  onEnter: () => void;
  onCredits?: () => void;
}

export class TitleScreen {
  public readonly element: HTMLElement;

  private readonly enterButton: HTMLButtonElement;
  private readonly loadingProgress: HTMLProgressElement;
  private readonly status: HTMLParagraphElement;
  private readonly settingsControls: SettingsControls;

  public constructor(
    root: HTMLElement,
    settings: SettingsStore,
    private readonly callbacks: TitleScreenCallbacks,
  ) {
    this.element = document.createElement('section');
    this.element.className = 'title-screen ui-overlay';
    this.element.setAttribute('role', 'region');
    this.element.setAttribute('aria-labelledby', 'title-screen-heading');
    this.element.setAttribute('aria-describedby', 'title-screen-introduction');

    const headingGroup = document.createElement('header');
    headingGroup.className = 'title-screen__heading';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'LEVEL 0';

    const heading = document.createElement('h1');
    heading.id = 'title-screen-heading';
    heading.textContent = 'THRESHOLD';

    const introduction = document.createElement('p');
    introduction.id = 'title-screen-introduction';
    introduction.textContent = 'Un espacio ordinario que dejó de obedecer al mundo real.';

    headingGroup.append(eyebrow, heading, introduction);

    const recommendation = document.createElement('p');
    recommendation.className = 'title-screen__recommendation';
    recommendation.textContent = 'Se recomiendan audífonos.';

    const controlsHeading = document.createElement('h2');
    controlsHeading.textContent = 'Controles';

    const controls = document.createElement('ul');
    controls.className = 'title-screen__controls';
    for (const control of ['WASD — caminar', 'Mouse — mirar', 'Shift — correr', 'Esc — pausar']) {
      const item = document.createElement('li');
      item.textContent = control;
      controls.append(item);
    }

    const flashingWarning = document.createElement('p');
    flashingWarning.className = 'title-screen__warning';
    flashingWarning.setAttribute('role', 'note');
    flashingWarning.textContent =
      'Advertencia: la experiencia contiene luces fluorescentes intermitentes. Puedes reducir los parpadeos en Ajustes.';

    const settingsDisclosure = document.createElement('details');
    settingsDisclosure.className = 'title-screen__settings';
    const settingsSummary = document.createElement('summary');
    settingsSummary.textContent = 'Ajustes';
    this.settingsControls = new SettingsControls(settings, 'title', 'Preferencias');
    settingsDisclosure.append(settingsSummary, this.settingsControls.element);

    this.status = document.createElement('p');
    this.status.className = 'title-screen__status';
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');

    this.loadingProgress = document.createElement('progress');
    this.loadingProgress.className = 'title-screen__progress';
    this.loadingProgress.max = 1;
    this.loadingProgress.hidden = true;
    this.loadingProgress.setAttribute('aria-label', 'Carga del juego');

    this.enterButton = document.createElement('button');
    this.enterButton.type = 'button';
    this.enterButton.className = 'title-screen__enter';
    this.enterButton.textContent = 'Entrar';
    this.enterButton.addEventListener('click', () => {
      if (this.enterButton.disabled) {
        return;
      }

      this.setEntering();
      this.callbacks.onEnter();
    });

    const actions = document.createElement('div');
    actions.className = 'title-screen__actions';
    actions.append(this.enterButton);

    const onCredits = this.callbacks.onCredits;
    if (onCredits) {
      const creditsButton = document.createElement('button');
      creditsButton.type = 'button';
      creditsButton.className = 'title-screen__credits';
      creditsButton.textContent = 'Créditos';
      creditsButton.addEventListener('click', onCredits);
      actions.append(creditsButton);
    }

    this.element.append(
      headingGroup,
      recommendation,
      controlsHeading,
      controls,
      flashingWarning,
      settingsDisclosure,
      this.status,
      this.loadingProgress,
      actions,
    );
    root.append(this.element);
    this.setReady();
  }

  public get visible(): boolean {
    return !this.element.hidden;
  }

  public show(focus = true): void {
    this.element.hidden = false;
    this.element.setAttribute('aria-hidden', 'false');

    if (focus && !this.enterButton.disabled) {
      this.enterButton.focus();
    }
  }

  public hide(): void {
    this.element.hidden = true;
    this.element.setAttribute('aria-hidden', 'true');
  }

  public setLoading(message: string, progress: number | null = null): void {
    this.element.setAttribute('aria-busy', 'true');
    this.enterButton.disabled = true;
    this.settingsControls.setDisabled(true);
    this.status.textContent = message;
    this.loadingProgress.hidden = false;

    if (progress === null || !Number.isFinite(progress)) {
      this.loadingProgress.removeAttribute('value');
      return;
    }

    this.loadingProgress.value = Math.min(1, Math.max(0, progress));
  }

  public setReady(message = 'Haz clic para entrar.'): void {
    this.element.removeAttribute('aria-busy');
    this.enterButton.disabled = false;
    this.settingsControls.setDisabled(false);
    this.status.textContent = message;
    this.loadingProgress.hidden = true;
    this.loadingProgress.removeAttribute('value');
  }

  public setEntering(message = 'Entrando…'): void {
    this.element.setAttribute('aria-busy', 'true');
    this.enterButton.disabled = true;
    this.settingsControls.setDisabled(true);
    this.status.textContent = message;
  }

  public dispose(): void {
    this.settingsControls.dispose();
    this.element.remove();
  }
}
