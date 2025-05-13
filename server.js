/**
 * Custom Express server for running Next.js API routes without rendering
 */
const express = require('express');
const next = require('next');
const { parse } = require('url');
const { join } = require('path');
const compression = require('compression');

// Determine environment
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Prepare Next.js app
app.prepare().then(() => {
  const server = express();
  const port = process.env.PORT || 3000;

  // Add compression
  server.use(compression());

  // Add JSON body parsing
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  // Handle API routes first
  server.all('/api/*', (req, res) => {
    return handle(req, res);
  });

  // Redirect root to API
  server.get('/', (req, res) => {
    res.redirect('/api');
  });

  // Start server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});