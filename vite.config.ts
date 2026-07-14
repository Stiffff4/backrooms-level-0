import { defineConfig, loadEnv } from 'vite';

function normalizeBasePath(value: string | undefined): string {
  if (!value || value === '/') {
    return '/';
  }

  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),
    build: {
      target: 'es2022',
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 1_250,
    },
  };
});
