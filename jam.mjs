#!/usr/bin/env node
import entrypoint from './src/entrypoint.mjs';
import * as constants from './src/constants.mjs';
import { enable as enableDiagnostics } from './src/diagnostics.js';

enableDiagnostics();

const run = async (argv, cwd) => {
  console.log('📻 Jambox 📻');

  const script = process.argv.slice(2);
  if (!script.length) {
    console.log('Nothing to run');
    process.exit(0);
  }

  entrypoint({
    script,
    cwd,
    log: console.log,
    env: process.env,
    constants,
  })
    .then((result) => {
      if (result.browser) {
        console.log('Browser launched');
        // TODO: Figure out why spawning the browser process leaves
        // our original node process running.
        // Maybe we should always exit even for process launches
        process.exit(0);
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
