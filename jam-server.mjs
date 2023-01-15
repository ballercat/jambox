#!/usr/bin/env node
// Entrypoint
import arg from 'arg';
import server from './src/server/index.mjs';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import Tail from 'tail-file';
import * as constants from './src/constants.mjs';

const tail = async (port = 9000) => {
  const config = await (
    await fetch(`http://localhost:${port}/api/config`)
  ).json();

  if (!fs.existsSync(config.logLocation)) {
    console.log(`Could not locate ${config.logLocation}.`);
    return;
  }

  console.log(`Tailing ${config.logLocation}`);
  new Tail(config.logLocation, console.log);
};

const shutdown = (port = 9000) => {
  return fetch(`http://localhost:${port}/shutdown`).then((res) => res.text());
};

const ping = (port = 9000) => {
  return fetch(`http://localhost:${port}`);
};

const run = async (argv) => {
  console.log('📻 Jambox Server 📻');

  const [subCommand] = argv.slice(2);

  if (subCommand === 'shutdown') {
    const port = 9000;
    console.log(`Attempt a shutdown at localhost:${port}...`);
    await shutdown(port)
      .then((res) => {
        console.log(res);
        process.exit(0);
      })
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });

    return;
  } else if (subCommand === 'ping') {
    const port = 9000;
    console.log(`Attempt a ping to localhost:${port}...`);
    await ping(port)
      .then(() => {
        console.log('pong');
        process.exit(0);
      })
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });

    return;
  } else if (subCommand === 'tail') {
    await tail(9000)
      .then()
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });

    return;
  }

  const options = arg(
    {
      '--port': Number,
      '-p': '--port',
    },
    argv
  );

  server({
    port: options['--port'] || 9000,
  })
    .then()
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
};

run(process.argv);
