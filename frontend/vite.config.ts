/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import type { ServerResponse } from 'node:http'
import type { Socket } from 'node:net'

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
    plugins: [react(), tailwindcss()],
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
              if (id.includes('react')) return 'react-vendor';
              if (id.includes('lucide-react') || id.includes('recharts')) return 'ui-vendor';
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
