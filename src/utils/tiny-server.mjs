import http from 'http';
import express from 'express';

// Promisify doesn't work right with http callbacks
const promise = (cb, ...args) => {
  return new Promise((res, rej) => {
    args.push((err) => {
      if (err == null) {
        res();
        return;
      }
      rej(err);
    });
    cb(...args);
  });
};

// This thing just echoes the paths
export default async function tiny(port) {
  const app = express();
  let connections = [];

  app.get('/*', (req, res) => {
    res.status(200).json({ path: req.path });
  });
  app.post('/delay', (req, res) => {
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
