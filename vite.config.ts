import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'ws-da-ee-dcbc-xfrwtbgtdu.cn-hongkong-vpc.fcapp.run'
    ]
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  }
});