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
    esbuild: {
      // Both tested Oxc minification and esbuild identifier mangling reduce the
      // Babylon scene to its clear/fog buffer in production. Esbuild remains
      // correct when bindings stay stable while syntax/whitespace are minified.
      minifyIdentifiers: false,
      minifySyntax: false,
      minifyWhitespace: false,
    },
    build: {
      target: 'es2022',
      minify: 'esbuild',
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 1_250,
    },
  };
});
