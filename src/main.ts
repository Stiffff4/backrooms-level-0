import './style.css';
import { App } from './app/App';
import { detectGameCapabilities, type GameCapabilityReport } from './engine/Capabilities';
import { IncompatibilityScreen } from './ui/IncompatibilityScreen';

const appRoot = document.querySelector<HTMLElement>('#app');
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');

if (!appRoot || !canvas) {
  throw new Error('No se encontraron los elementos esenciales de la aplicación.');
}

const root: HTMLElement = appRoot;
const gameCanvas: HTMLCanvasElement = canvas;
let app: App | null = null;

function syncCapabilitySnapshot(report: Readonly<GameCapabilityReport>): void {
  root.dataset.compatibilityStatus = report.status;
  root.dataset.compatibilityIssues = report.issues.map((issue) => issue.code).join(',');
  root.dataset.capabilityWebgl2 = String(report.probe.webGl2);
  root.dataset.capabilityPointerLock = String(report.probe.pointerLock);
  root.dataset.capabilityWebAudio = String(report.probe.webAudio);
  root.dataset.capabilityStorage = String(report.probe.persistentStorage);
  root.dataset.prefersReducedMotion = String(report.probe.prefersReducedMotion);
}

function probeCapabilities(): Readonly<GameCapabilityReport> {
  const report = detectGameCapabilities(gameCanvas);
  syncCapabilitySnapshot(report);
  return report;
}

function launch(report: Readonly<GameCapabilityReport>): void {
  syncCapabilitySnapshot(report);
  if (report.status === 'incompatible') {
    compatibilityScreen.show(report);
    return;
  }
  compatibilityScreen.hide();
  if (app === null) {
    app = new App(root, gameCanvas);
    void app.start();
  }
}

const compatibilityScreen = new IncompatibilityScreen(root, {
  onRetry: probeCapabilities,
  onCompatible: launch,
});
launch(probeCapabilities());

window.addEventListener(
  'beforeunload',
  () => {
    app?.dispose();
    compatibilityScreen.dispose();
  },
  { once: true },
);
