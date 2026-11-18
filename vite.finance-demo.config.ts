import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), {
    name: 'finance-demo-isolation',
    generateBundle(_options, bundle) {
      for (const artifact of Object.values(bundle)) {
        if (artifact.type !== 'chunk') continue;
        for (const id of Object.keys(artifact.modules)) {
          const path = id.replaceAll('\\', '/');
          if (/\/src\/(context|lib)\//.test(path) || /\/node_modules\/axios\//.test(path)
              || /\/src\/App\.tsx/.test(path)) {
            this.error(`Live dependency forbidden in Finance demo: ${path}`);
          }
        }
      }
    },
  }],
  envDir: false,
  envPrefix: 'NAVAPACK_DEMO_PUBLIC_',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  base: '/',
  build: { outDir: 'dist-finance-demo', emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL('./finance-demo.html', import.meta.url)) } },
});
