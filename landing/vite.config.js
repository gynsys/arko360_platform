import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Split chunks so Three.js (~1.5MB) is separate from the landing page (~300KB).
    // Browsers can cache each chunk independently, so returning users don't re-download Three.js.
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — tiny, cached forever
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Three.js engine — heavy, only loaded when user enters /arko3d
          'vendor-three': ['three'],
          // React Three Fiber + Drei utilities
          'vendor-r3f': ['@react-three/fiber', '@react-three/drei'],
          // Animation + UI utilities
          'vendor-ui': ['framer-motion', 'zustand', 'axios', 'lucide-react', 'react-hot-toast'],
          // PDF generation
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
        },
      },
    },
  },
  server: {
    port: 5174,
  },
});
