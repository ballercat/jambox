#!/usr/bin/env node
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import record from './src/record.mjs';
import Tail from 'tail-file';
import * as constants from './src/constants.mjs';

const tail = (cwd) => {
  const logName = `sever.${new Date().toISOString().split('T')[0]}.log`;
  const filepath = path.join(cwd, constants.CACHE_DIR_NAME, logName);

  if (!fs.existsSync(filepath)) {
    console.log(
      `Could not locate ${logName} in the ${constants.CACHE_DIR_NAME}/ cache folder.`
    );
    return;
  }

  console.log(`Tailing ${logName}`);
  new Tail(filepath, console.log);
};

const shutdown = (port = 9000) => {
  return fetch(`http://localhost:${port}/shutdown`);
};

const ping = (port = 9000) => {
  return fetch(`http://localhost:${port}`);
};

const run = async (argv, cwd) => {
  console.log('📻 Jambox 📻');

  const script = process.argv.slice(2);
  if (!script.length) {
    console.log('Nothing to run');
    process.exit(0);
  }

  if (script[0] === 'shutdown') {
    const port = 9000;
    console.log(`Attempt a shutdown at localhost:${port}...`);
    await shutdown(port)
      .then(() => {
        process.exit(0);
      })
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });

    return;
  } else if (script[0] === 'ping') {
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
  } else if (script[0] === 'tail-log') {
    tail(cwd);

    return;
  }

  record({
    script,
    cwd,
    log: console.log,
    env: process.env,
    constants,
  })
    .then((result) => {
      if (result.browser) {
        console.log('Browser launched');
      }

      if (result.process) {
        console.log('Process launched');
      }
    })
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
};

run(process.argv, process.cwd());
