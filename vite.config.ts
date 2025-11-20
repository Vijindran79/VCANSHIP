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
        react(),
        {
          name: 'copy-json-files',
          closeBundle() {
            // Ensure locales directory exists in dist
            const distLocalesDir = path.resolve(__dirname, 'dist/locales');
            if (!existsSync(distLocalesDir)) {
              mkdirSync(distLocalesDir, { recursive: true });
            }
            
            // Copy JSON files
            const filesToCopy = [
              { src: 'locales/en.json', dest: 'dist/locales/en.json' },
              { src: 'locales.json', dest: 'dist/locales.json' },
              { src: 'languages.json', dest: 'dist/languages.json' },
            ];
            
            filesToCopy.forEach(({ src, dest }) => {
              const srcPath = path.resolve(__dirname, src);
              const destPath = path.resolve(__dirname, dest);
              if (existsSync(srcPath)) {
                try {
                  copyFileSync(srcPath, destPath);
                  console.log(`Copied ${src} to ${dest}`);
                } catch (error) {
                  console.error(`Failed to copy ${src}:`, error);
                }
              }
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            // Ensure JSON files are copied
          }
        }
      }
    };
});
