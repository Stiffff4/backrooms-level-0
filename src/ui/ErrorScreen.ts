export function renderErrorScreen(root: HTMLElement, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Error desconocido al iniciar.';
  const section = document.createElement('section');
  section.className = 'fatal-error';
  section.setAttribute('role', 'alert');

  const title = document.createElement('h1');
  title.textContent = 'No se pudo cruzar el umbral';

  const detail = document.createElement('p');
  detail.textContent = message;

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.textContent = 'Recargar';
  reload.addEventListener('click', () => window.location.reload());

  section.append(title, detail, reload);
  root.replaceChildren(section);
}
