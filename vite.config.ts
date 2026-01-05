import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Ensure this matches your GitHub Repository Name exactly
  base: "/lenslingua-food-ocr/", 
})