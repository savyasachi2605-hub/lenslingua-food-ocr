import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // This line fixes the "Cannot find name 'env'" error
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // This line allows your app to work on GitHub Pages
    base: "/lenslingua-food-ocr/",
    define: {
      'process.env': env
    }
  }
})