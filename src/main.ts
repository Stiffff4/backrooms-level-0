import './style.css';
import { App } from './app/App';

const appRoot = document.querySelector<HTMLElement>('#app');
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');

if (!appRoot || !canvas) {
  throw new Error('No se encontraron los elementos esenciales de la aplicación.');
}

const app = new App(appRoot, canvas);
void app.start();

window.addEventListener('beforeunload', () => app.dispose(), { once: true });
