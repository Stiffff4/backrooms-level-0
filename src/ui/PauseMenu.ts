import {
  SETTINGS_LIMITS,
  type GameSettings,
  type QualityPreset,
  type SettingsStore,
} from './SettingsStore';

export interface PauseMenuCallbacks {
  onResume: () => void;
  onRestartSeed: () => void;
  onExitToMenu: () => void;
}

interface RangeControl {
  container: HTMLDivElement;
  input: HTMLInputElement;
  output: HTMLOutputElement;
}

interface CheckboxControl {
  container: HTMLDivElement;
  input: HTMLInputElement;
}

interface SelectControl {
  container: HTMLDivElement;
  select: HTMLSelectElement;
}

const QUALITY_OPTIONS: readonly Readonly<{ value: QualityPreset; label: string }>[] = [
  { value: 'low', label: 'Baja — 240p' },
  { value: 'default', label: 'Detallada — 360p' },
  { value: 'high', label: 'Alta — 480p' },
];

function createRangeControl(
  id: string,
  labelText: string,
  minimum: number,
  maximum: number,
  step: number,
): RangeControl {
  const container = document.createElement('div');
  container.className = 'settings-control settings-control--range';

  const labelRow = document.createElement('div');
  labelRow.className = 'settings-control__label-row';

  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;

  const output = document.createElement('output');
  output.setAttribute('for', id);
  output.className = 'settings-control__value';

  const input = document.createElement('input');
  input.id = id;
  input.name = id;
  input.type = 'range';
  input.min = String(minimum);
  input.max = String(maximum);
  input.step = String(step);

  labelRow.append(label, output);
  container.append(labelRow, input);
  return { container, input, output };
}

function createCheckboxControl(id: string, labelText: string): CheckboxControl {
  const container = document.createElement('div');
  container.className = 'settings-control settings-control--checkbox';

  const input = document.createElement('input');
  input.id = id;
  input.name = id;
  input.type = 'checkbox';

  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;

  container.append(input, label);
  return { container, input };
}

function createQualityControl(id: string): SelectControl {
  const container = document.createElement('div');
  container.className = 'settings-control settings-control--select';

  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = 'Calidad visual';

  const select = document.createElement('select');
  select.id = id;
  select.name = id;

  for (const quality of QUALITY_OPTIONS) {
    const option = document.createElement('option');
    option.value = quality.value;
    option.textContent = quality.label;
    select.append(option);
  }

  container.append(label, select);
  return { container, select };
}

function isQualityPreset(value: string): value is QualityPreset {
  return value === 'low' || value === 'default' || value === 'high';
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)} %`;
}

/** Shared native-DOM settings panel used by the title and pause overlays. */
export class SettingsControls {
  public readonly element: HTMLFieldSetElement;

  private readonly sensitivity: RangeControl;
  private readonly fov: RangeControl;
  private readonly masterVolume: RangeControl;
  private readonly ambienceVolume: RangeControl;
  private readonly footstepsVolume: RangeControl;
  private readonly headBob: CheckboxControl;
  private readonly invertY: CheckboxControl;
  private readonly reducedFlashing: CheckboxControl;
  private readonly quality: SelectControl;
  private readonly unsubscribe: () => void;

  public constructor(
    private readonly store: SettingsStore,
    idPrefix: string,
    legendText = 'Ajustes',
  ) {
    this.element = document.createElement('fieldset');
    this.element.className = 'settings-panel';

    const legend = document.createElement('legend');
    legend.textContent = legendText;

    this.sensitivity = createRangeControl(
      `${idPrefix}-sensitivity`,
      'Sensibilidad del mouse',
      SETTINGS_LIMITS.sensitivity.min,
      SETTINGS_LIMITS.sensitivity.max,
      SETTINGS_LIMITS.sensitivity.step,
    );
    this.fov = createRangeControl(
      `${idPrefix}-fov`,
      'Campo de visión',
      SETTINGS_LIMITS.fov.min,
      SETTINGS_LIMITS.fov.max,
      SETTINGS_LIMITS.fov.step,
    );
    this.masterVolume = createRangeControl(
      `${idPrefix}-master-volume`,
      'Volumen general',
      SETTINGS_LIMITS.volume.min,
      SETTINGS_LIMITS.volume.max,
      SETTINGS_LIMITS.volume.step,
    );
    this.ambienceVolume = createRangeControl(
      `${idPrefix}-ambience-volume`,
      'Volumen de ambiente',
      SETTINGS_LIMITS.volume.min,
      SETTINGS_LIMITS.volume.max,
      SETTINGS_LIMITS.volume.step,
    );
    this.footstepsVolume = createRangeControl(
      `${idPrefix}-footsteps-volume`,
      'Volumen de pasos',
      SETTINGS_LIMITS.volume.min,
      SETTINGS_LIMITS.volume.max,
      SETTINGS_LIMITS.volume.step,
    );
    this.quality = createQualityControl(`${idPrefix}-quality`);
    this.headBob = createCheckboxControl(`${idPrefix}-head-bob`, 'Movimiento de cámara al caminar');
    this.invertY = createCheckboxControl(`${idPrefix}-invert-y`, 'Invertir eje vertical');
    this.reducedFlashing = createCheckboxControl(
      `${idPrefix}-reduced-flashing`,
      'Reducir parpadeos y destellos',
    );

    this.element.append(
      legend,
      this.sensitivity.container,
      this.fov.container,
      this.masterVolume.container,
      this.ambienceVolume.container,
      this.footstepsVolume.container,
      this.quality.container,
      this.headBob.container,
      this.invertY.container,
      this.reducedFlashing.container,
    );

    this.sensitivity.input.addEventListener('input', () => {
      this.store.set('sensitivity', Number(this.sensitivity.input.value));
    });
    this.fov.input.addEventListener('input', () => {
      this.store.set('fov', Number(this.fov.input.value));
    });
    this.masterVolume.input.addEventListener('input', () => {
      this.store.set('masterVolume', Number(this.masterVolume.input.value));
    });
    this.ambienceVolume.input.addEventListener('input', () => {
      this.store.set('ambienceVolume', Number(this.ambienceVolume.input.value));
    });
    this.footstepsVolume.input.addEventListener('input', () => {
      this.store.set('footstepsVolume', Number(this.footstepsVolume.input.value));
    });
    this.quality.select.addEventListener('change', () => {
      if (isQualityPreset(this.quality.select.value)) {
        this.store.set('quality', this.quality.select.value);
      }
    });
    this.headBob.input.addEventListener('change', () => {
      this.store.set('headBob', this.headBob.input.checked);
    });
    this.invertY.input.addEventListener('change', () => {
      this.store.set('invertY', this.invertY.input.checked);
    });
    this.reducedFlashing.input.addEventListener('change', () => {
      this.store.set('reducedFlashing', this.reducedFlashing.input.checked);
    });

    this.unsubscribe = this.store.subscribe(({ current }) => this.render(current));
    this.render(this.store.value);
  }

  public setDisabled(disabled: boolean): void {
    this.element.disabled = disabled;
  }

  public dispose(): void {
    this.unsubscribe();
    this.element.remove();
  }

  private render(settings: Readonly<GameSettings>): void {
    this.sensitivity.input.value = String(settings.sensitivity);
    this.sensitivity.output.value = settings.sensitivity.toFixed(2);
    this.fov.input.value = String(settings.fov);
    this.fov.output.value = `${Math.round(settings.fov)}°`;
    this.masterVolume.input.value = String(settings.masterVolume);
    this.masterVolume.output.value = formatPercent(settings.masterVolume);
    this.ambienceVolume.input.value = String(settings.ambienceVolume);
    this.ambienceVolume.output.value = formatPercent(settings.ambienceVolume);
    this.footstepsVolume.input.value = String(settings.footstepsVolume);
    this.footstepsVolume.output.value = formatPercent(settings.footstepsVolume);
    this.quality.select.value = settings.quality;
    this.headBob.input.checked = settings.headBob;
    this.invertY.input.checked = settings.invertY;
    this.reducedFlashing.input.checked = settings.reducedFlashing;
  }
}

export class PauseMenu {
  public readonly element: HTMLElement;

  private readonly settingsControls: SettingsControls;
  private readonly resumeButton: HTMLButtonElement;
  private previousFocus: HTMLElement | null = null;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.callbacks.onResume();
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
    settings: SettingsStore,
    private readonly callbacks: PauseMenuCallbacks,
  ) {
    this.element = document.createElement('section');
    this.element.className = 'pause-menu ui-overlay';
    this.element.hidden = true;
    this.element.tabIndex = -1;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.setAttribute('aria-labelledby', 'pause-menu-title');
    this.element.setAttribute('aria-describedby', 'pause-menu-description');

    const heading = document.createElement('h1');
    heading.id = 'pause-menu-title';
    heading.textContent = 'Pausa';

    const description = document.createElement('p');
    description.id = 'pause-menu-description';
    description.textContent = 'El juego está detenido. Los ajustes se guardan automáticamente.';

    this.resumeButton = document.createElement('button');
    this.resumeButton.type = 'button';
    this.resumeButton.className = 'pause-menu__primary-action';
    this.resumeButton.textContent = 'Reanudar';
    this.resumeButton.addEventListener('click', () => this.callbacks.onResume());

    this.settingsControls = new SettingsControls(settings, 'pause', 'Ajustes de la partida');

    const restartButton = document.createElement('button');
    restartButton.type = 'button';
    restartButton.textContent = 'Reiniciar semilla';
    restartButton.addEventListener('click', () => this.callbacks.onRestartSeed());

    const exitButton = document.createElement('button');
    exitButton.type = 'button';
    exitButton.textContent = 'Volver al menú';
    exitButton.addEventListener('click', () => this.callbacks.onExitToMenu());

    const actions = document.createElement('div');
    actions.className = 'pause-menu__actions';
    actions.append(this.resumeButton, restartButton, exitButton);

    this.element.append(heading, description, actions, this.settingsControls.element);
    this.element.addEventListener('keydown', this.handleKeyDown);
    root.append(this.element);
  }

  public get visible(): boolean {
    return !this.element.hidden;
  }

  public show(): void {
    if (this.visible) {
      this.resumeButton.focus();
      return;
    }

    this.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.element.hidden = false;
    this.element.setAttribute('aria-hidden', 'false');
    this.resumeButton.focus();
  }

  public hide(): void {
    if (!this.visible) {
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
    this.settingsControls.dispose();
    this.element.remove();
  }

  private getFocusableElements(): HTMLElement[] {
    return Array.from(
      this.element.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('hidden'));
  }
}
