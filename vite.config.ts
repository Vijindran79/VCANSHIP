import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Copy JSON files to dist after build
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react()
    ],
    define: {
      'process.env.VITE_GEOAPIFY_KEY': JSON.stringify(env.VITE_GEOAPIFY_KEY),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        output: {
          // Ensure proper asset naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/css/i.test(ext)) {
              return `assets/css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js'
        }
      },
      assetsDir: 'assets',
      copyPublicDir: true
    },
    publicDir: 'public'
  };
});
