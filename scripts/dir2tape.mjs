#!/usr/bin/env node
/**
 * zip an exisiting cache directory into an archive
 */
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { PortablePath, npath, ppath } from '@yarnpkg/fslib';
import { ZipFS } from '@yarnpkg/libzip';

async function dir2tape(dir) {
  const out = 'out.tape.zip';
  const zipfs = new ZipFS(npath.toPortablePath(path.join(process.cwd(), out)), {
    create: true,
  });

  const files = await readdir(dir);
  for (const filename of files) {
    if (filename.endsWith('.json')) {
      const file = path.join(dir, filename);
      const content = JSON.parse(await readFile(file, 'utf-8'));
      await zipfs.writeFilePromise(
        ppath.join(PortablePath.root, filename),
        JSON.stringify(content, null, 2)
      );
    }
  }

  zipfs.saveAndClose();
}

dir2tape(process.argv.slice(2)[0]);
