// Vercel Serverless Function Entrypoint
// Ini akan menggunakan bundel CJS yang sudah dioptimasi oleh esbuild saat npm run build
const { createApp } = require('../dist/server.cjs');

const app = createApp();
module.exports = app;
