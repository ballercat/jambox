#!/usr/bin/env node
import record from './src/record.mjs';
import * as constants from './src/constants.mjs';

const run = (argv, cwd) => {
  console.log('📻 Jambox 📻');

  const script = process.argv.slice(2);
  if (!script.length) {
    console.log('Nothing to run');
    process.exit(0);
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
