import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// When deployed to GitHub Pages the base will be /repo-name/
// Set VITE_BASE_PATH as a GitHub secret or leave empty for custom domain
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
