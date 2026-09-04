import http from 'http';
import express from 'express';

/**
 * Promisified wrapper around callbacks that follow the node.js
 * `(err) => void` convention (e.g. `server.listen`).
 *
 * Promisify doesn't work right with http callbacks
 *
 * @param {Function} cb     - Function whose last argument will be an error-first callback
 * @param {any[]}   ...args - Arguments to pass to `cb` before the callback
 * @returns {Promise<void>} Resolves when the callback is invoked without an error
 */
const promise = (cb, /** @type {any[]} */ ...args) => {
  return new Promise((res, rej) => {
    args.push((/** @type {Error?} */ err) => {
      if (err == null) {
        res();
        return;
      }
      rej(err);
    });
    cb(...args);
  });
};

/**
 * Create a tiny test HTTP server.
 *
 * This thing just echoes the paths:
 *
 * - `GET /*`     — Responds with `{ path: <request path> }`
 * - `POST /delay` — Responds with `{ delayed: 50 }` after 50ms
 *
 * The returned server is extended with a `_close()` helper that force-ends
 * all open connections before closing (plain `server.close()` waits for
 * keep-alive connections to finish).
 *
 * @param {number} port - Port number to listen on
 * @returns {Promise<http.Server>} The running server (with an added `_close()` method)
 */
export default async function tiny(port) {
  const app = express();
  let connections = [];

  app.get('/*', (req, res) => {
    res.status(200).json({ path: req.path });
  });
  app.post('/delay', (_, res) => {
    setTimeout(() => {
      res.status(200).json({ delayed: 50 });
    }, 50);
  });
  const server = http.createServer(app);
  await promise(server.listen.bind(server), port);

  server.on('connection', (connection) => {
    connections.push(connection);
    connection.on(
      'close',
      () => (connections = connections.filter((i) => i === connection))
    );
  });

  // @ts-ignore
  server._close = () => {
    return new Promise((res, rej) => {
      connections.forEach((connection) => connection.end());
      server.close((error) => {
        if (error) {
          rej(error);
        } else {
          server.unref();
          res();
        }
      });
    });
  };

  return server;
}
