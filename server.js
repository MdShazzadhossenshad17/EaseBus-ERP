import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EaseBus ERP', timestamp: new Date().toISOString() });
});

// Auth Session endpoint
app.get('/api/auth/session', (req, res) => {
  res.status(401).json({ status: 'error', success: false, message: 'Not logged in' });
});

// Serve static files from root
app.use(express.static(__dirname));

// SPA Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`EaseBus ERP server running on http://0.0.0.0:${PORT}`);
});
