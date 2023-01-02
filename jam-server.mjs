#!/usr/bin/env node
// Entrypoint
import arg from 'arg';
import server from './src/server/index.mjs';

const run = (argv) => {
  console.log('📻 Jambox Server 📻');

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
