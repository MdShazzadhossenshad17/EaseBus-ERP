/**
 * EaseBus ERP — Backend Server
 * Express application configuration, middleware wiring, and static asset streaming
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes.js';
import {
  compressionMiddleware,
  securityHeadersMiddleware,
  staticCacheHeaders,
  errorHandler
} from './middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export function createServer() {
  const app = express();

  // Middleware pipeline
  app.use(compressionMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(securityHeadersMiddleware);

  // Backend API Subsystem
  app.use('/api', apiRouter);

  // Static Asset Serving
  app.use(express.static(ROOT_DIR, {
    maxAge: '1h',
    etag: true,
    lastModified: true,
    setHeaders: staticCacheHeaders
  }));

  // SPA Fallback
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export default createServer;
