import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifestJson from './manifest.json'
import type { ManifestV3Export } from '@crxjs/vite-plugin'

const manifest = manifestJson as ManifestV3Export

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})
