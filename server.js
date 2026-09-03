import { createServer } from './backend/server.js';

const app = createServer();
const PORT = 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`EaseBus ERP server running on http://0.0.0.0:${PORT}`);
});

