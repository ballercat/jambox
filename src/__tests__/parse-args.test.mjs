import test from 'ava';
import { parseArgs, JAMBOX_FLAGS } from '../parse-args.mjs';

test('arg parsing, jambox flags: no', (t) => {
  const flags = parseArgs(['yarn', 'dev'], JAMBOX_FLAGS);
  t.snapshot(flags);
});

test('arg parsing, jambox flags: yes', (t) => {
  const flags = parseArgs(['-r', 'yarn', 'dev'], JAMBOX_FLAGS);
  t.snapshot(flags);
});

test('arg parsing, custom flags', (t) => {
  const flags = parseArgs(
    [
      '--port',
      '0',
      '-p',
      '99',
      '-r',
      '--reset',
      'yarn',
      'dev',
      '--port',
      '9000',
    ],
    {
      ...JAMBOX_FLAGS,
      '--port': ['port', 1, String],
      // shouldn't do it this way but it's allowed to change the types here
      '-p': ['port', 1, Number],
    }
  );

  t.snapshot(flags);
});
