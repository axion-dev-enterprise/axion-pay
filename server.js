import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Roteamento de APIs
app.all('/api/*', async (req, res) => {
  await handler(req, res);
});

// Catch-all SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[AXION Financeiro] Servidor executando em http://localhost:${PORT}`);
});
