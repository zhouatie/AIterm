import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  build: {
    // Electron apps load from local disk, not over network, so minification
    // provides no benefit. Disabling it avoids esbuild's known issue where
    // it incorrectly mangles variable bindings inside webpack-bundled
    // dependencies (e.g. @xterm/xterm), causing "ReferenceError: n is not
    // defined" at runtime in the packaged app.
    minify: false,
  },
});
