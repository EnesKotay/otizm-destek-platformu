/// <reference types="node" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { ServerResponse } from 'node:http'
import type { Socket } from 'node:net'

// public/sw.js önbellek stratejisi her deploy'da farklı build parçalarının
// aynı Cache Storage içinde karışmasını önlemek için her build'e özgü bir
// isim gerektirir (bkz. sw.js içindeki CACHE_VERSION açıklaması).
function swBuildIdPlugin(): Plugin {
  return {
    name: 'sw-build-id',
    apply: 'build',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js')
      if (!existsSync(swPath)) return
      const buildId = String(Date.now())
      const content = readFileSync(swPath, 'utf-8').replace('__BUILD_ID__', buildId)
      writeFileSync(swPath, content)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const backendUrl = env.BACKEND_URL ?? 'http://localhost:8080';
  const usePolling =
    env.CHOKIDAR_USEPOLLING === 'true' ||
    env.VITE_USE_POLLING === 'true' ||
    env.DOCKER === 'true';
  const hmrHost = env.VITE_HMR_HOST ?? 'localhost';
  const hmrClientPort = Number(env.VITE_HMR_CLIENT_PORT ?? '5173');

  return {
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['sockjs-client', '@stomp/stompjs'],
    },
    plugins: [react(), tailwindcss(), swBuildIdPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'icons-vendor';
              // recharts + d3 bağımlılıkları tek, kararlı bir chunk'ta toplanmalı.
              // Aksi halde her sayfa chunk'ına ayrı kopya gömülüyor ve rolldown'ın
              // modül-init sıralaması bozulup "TypeError: n is not a function"
              // ile çöküyor (özellikle RadarChart/Polar bileşenlerinde).
              if (
                id.includes('/recharts')
                || id.includes('/victory-vendor')
                || id.includes('/d3-')
                || id.includes('/es-toolkit')
                || id.includes('/decimal.js-light')
                || id.includes('/react-smooth')
                || id.includes('/@reduxjs/')
                || id.includes('/react-redux')
                || id.includes('/reselect')
                || id.includes('/immer')
                || id.includes('/use-sync-external-store')
                || id.includes('/eventemitter3')
                || id.includes('/tiny-invariant')
              ) return 'charts-vendor';
              if (
                id.includes('/react/')
                || id.includes('/react-dom/')
                || id.includes('/react-router')
                || id.includes('/react-hook-form/')
              ) return 'react-vendor';
              if (id.includes('zustand') || id.includes('@tanstack')) return 'state-vendor';
            }
          }
        }
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      hmr: {
        host: hmrHost,
        clientPort: hmrClientPort,
        protocol: 'ws',
        overlay: false,
      },
      watch: {
        usePolling: true,
        interval: usePolling ? 1000 : 300,
      },
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          timeout: 10_000,
          proxyTimeout: 10_000,
          configure(proxy) {
            proxy.on('error', (_err, _req, res: ServerResponse | Socket) => {
              if ('writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: false,
                  message: 'Backend sunucusuna ulaşılamıyor. Lütfen servisin çalıştığını kontrol edin.',
                }));
                return;
              }
              res.end();
            });
          },
        },
        '/ws': {
          target: backendUrl,
          ws: true,
          timeout: 10_000,
          proxyTimeout: 10_000,
        },
      },
    },
  };
});
