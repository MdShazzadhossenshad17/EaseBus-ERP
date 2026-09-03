# EaseBus ERP — Backend Architecture

The backend of EaseBus ERP is built with Node.js and Express, designed for high throughput, sub-millisecond response times, and robust security.

## Directory Structure
- `server.js`: Express application initialization, middleware registration, and static file streaming.
- `routes.js`: Modular REST API router for `/api/health`, `/api/auth`, `/api/orders`, `/api/inventory`, and `/api/config`.
- `middleware.js`: Security headers (Strict-Origin, Nosniff, Frame-Options), Gzip/Deflate compression, immutable cache-control headers, and global exception handling.

## Key Features
1. **Response Compression**: Gzip/Deflate compression with configurable payload size thresholds.
2. **Security Headers**: Standard enterprise headers preventing MIME-sniffing, clickjacking, and open referrer leaks.
3. **Static Asset Streaming**: High-performance HTTP caching headers for static assets with cache-busting version parameters.
4. **Health & Monitoring**: Automated health check endpoint for Cloud Run container lifecycle management.
