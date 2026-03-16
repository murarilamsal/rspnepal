import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    // This tells Vite to create the 'build' folder inside your backend 'app' folder
    outDir: '../app/build',
    emptyOutDir: true, 
  },
})