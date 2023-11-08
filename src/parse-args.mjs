export const JAMBOX_FLAGS = {
  '-r': ['reset', 0, Boolean],
  '--reset': ['reset', 0, Boolean],
};

/**
 * Parse out supported flags, everything else becomes the target script
 *
 * args = ['yarn', 'dev']
 * args = ['yarn', '--yarn-flag', '--yarn-flag2', 'dev']
 * args = ['yarn', 'dev', '--dev-flag']
 * args = ['-A', '<value>', '-B', '<value>', '-JamboxFlag', '<value>', 'yarn', 'dev']
 *
 * result:
 * // flags object
 * {
 *    A: ["<value>"],
 *    B: ["<value>"],
 *    JamboxFlag: ["<value>"],
 *    target: ["yarn dev"] // etc
 * }
 *
 * @param {Array<string>}                args
 * @param {{[string]: [string, number]}} supported
 *
 * @return {Object}
 */
export const parseArgs = (args, supported) => {
  const flags = {};
  let i = 0;
  while (i < args.length) {
    const flag = args[i];
    if (flag in supported) {
      const [name, length, type] = supported[flag];
      flags[name] = args.slice(i + 1, i + 1 + length);
      flags[name] = type(flags[name]);
      i += 1 + length;
    } else {
      flags.target = args.slice(i);
      break;
    }
  }
  return flags;
};
