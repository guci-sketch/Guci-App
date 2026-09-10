import 'dotenv/config';
import { createApp } from './app.js';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const port = Number(process.env.PORT || 3000);
  const app = createApp();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[fieldwork-api] listening on http://localhost:${port}`);
  });
}

startServer();