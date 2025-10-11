#!/usr/bin/env node

// Render-specific build script to avoid CI/CD conflicts
process.env.CI = 'false';
process.env.SKIP_PREFLIGHT_CHECK = 'true';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.DISABLE_ESLINT_PLUGIN = 'true';

// Import and run Vite build
import { build } from 'vite';
import config from './vite.config.js';

async function buildForRender() {
  try {
    console.log('🚀 Building for Render deployment...');
    
    await build({
      ...config,
      build: {
        ...config.build,
        sourcemap: false,
        minify: 'esbuild',
        target: 'es2015',
        rollupOptions: {
          ...config.build?.rollupOptions,
          external: [],
        }
      }
    });
    
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildForRender();
