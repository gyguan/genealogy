import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_DEV_PORT || 5179);
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port,
      strictPort: false,
      allowedHosts: true,
      cors: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              proxyReq.removeHeader('origin');
            });
          }
        }
      }
    }
  };
});