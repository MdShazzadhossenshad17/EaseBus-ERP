/**
 * EaseBus ERP — Backend Middleware
 * Security Headers, Response Compression, Static Caching & Error Handling
 */

import compression from 'compression';

/**
 * Configure response compression (Gzip / Deflate)
 */
export const compressionMiddleware = compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
});

/**
 * Security & launch headers middleware
 */
export function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'on');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
}

/**
 * Static file cache control header handler
 */
export function staticCacheHeaders(res, filePath) {
  if (filePath.endsWith('.html')) {
    // Keep HTML entry point fresh
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (filePath.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2|woff|ttf)$/)) {
    // Cache static assets for 1 day with stale-while-revalidate for 7 days
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  }
}

/**
 * Global API Error handler
 */
export function errorHandler(err, req, res, next) {
  console.error('[EaseBus Backend Error]:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
}
