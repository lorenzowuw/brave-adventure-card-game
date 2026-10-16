import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLEFILE=1 时产出可双击打开的单 HTML。
const singleFile = process.env.SINGLEFILE === '1';
const base = singleFile ? './' : (process.env.BASE_PATH || '/');

export default defineConfig({
  base,
  plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
});
