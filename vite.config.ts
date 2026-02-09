import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const certDir = path.resolve(__dirname, '.certs');
  const keyPath = path.join(certDir, 'localdrop.key');
  const certPath = path.join(certDir, 'localdrop.crt');
  const hasCert = fs.existsSync(keyPath) && fs.existsSync(certPath);

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      https: hasCert
        ? {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
          }
        : undefined
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    }
  };
});
