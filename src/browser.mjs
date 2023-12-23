import os from 'os';
import osenv from 'osenv';
import util from 'util';
import { spawn } from 'child_process';
import { EXTENSION_PATH } from './constants.mjs';
import launcher from '@httptoolkit/browser-launcher';

// that's right
const SPKI_FINGERPRINT = 'ImPkfKy0ZYTFQr8oFYoEGm6FJOgHyRUkeMBTfHujwSQ=';

const detect = () => {
  return new Promise((resolve) => {
    launcher.detect(resolve);
  });
};

const getLauncher = util.promisify(launcher);

// NOTE: The launcher from browser-launcher is umm, bad. It does not launch
// a new instance of chrome and claims it's not possible, but it totally is.
// The spawn() logic is borrowed from portions of Cypress.
const mac = ({ chrome, uri, info }) => {
  // Borrowed from cypress
  // https://github.com/cypress-io/cypress/blob/4e667e5383a4df482756f3b1b3d572c3a97ac7df/packages/launcher/lib/browsers.ts#L188
  const browser = spawn(
    'open',
    [
      '-n',
      chrome.command,
      '--args',
      uri,
      '--args',
      '--disable-web-security',
      '--disable-features=ChromeWhatsNewUI',
      '--disable-background-networking',
      '--disable-component-update',
      '--check-for-update-interval=31536000',
      // Proxy
      `--proxy-server=${info.proxy.http}`,
      `--proxy-bypass-list=${info.noProxy.join(',')}`,
      // FIXME: Don't depend on browser-launchers profile
      `--user-data-dir=${
        osenv.home() +
        '/.config/' +
        'browser-launcher' +
        `${chrome.name}-${chrome.version}`
      }`,
      '--disable-restore-session-state',
      '--no-default-browser-check',
      '--disable-popup-blocking',
      '--disable-translate',
      '--start-maximized',
      '--disable-default-apps',
      '--disable-sync',
      '--enable-fixed-layout',
      '--no-first-run',
      '--noerrdialogs',
      '--disable-background-networking',
      `--ignore-certificate-errors-spki-list=${SPKI_FINGERPRINT}`,
      '--test-type',
      '--enable-automation',
      '--auto-open-devtools-for-tabs',
      `--load-extension=${EXTENSION_PATH}`,
      '--enable-features=AllowWasmInMV3',
    ],
    { detached: true, stdio: 'ignore' }
  );
  return browser;
};

async function launchProxiedChrome(uri, info) {
  const browserName = info.browser || 'chrome';
  const browsers = await detect();
  const chrome = browsers.find(({ name }) => name === browserName);
  // @ts-ignore
  const launch = await getLauncher();

  if (os.platform() === 'darwin') {
    return mac({ chrome, uri, info });
  }

  return new Promise((resolve, reject) => {
    launch(
      uri,
      {
        browser: browserName,
        proxy: info.proxy.http,
        noProxy: info.noProxy,
        detached: true,
        profile: null,
        options: [
          '--disable-web-security',
          `--ignore-certificate-errors-spki-list=${SPKI_FINGERPRINT}`,
          '--disable-features=ChromeWhatsNewUI',
          '--disable-background-networking',
          '--disable-component-update',
          '--check-for-update-interval=31536000',
          '--restore-last-session',
          '--test-type',
          '--auto-open-devtools-for-tabs',
          `--load-extension=${EXTENSION_PATH}`,
        ],
      },
      (err, /** @type {any} */ instance) => {
        if (err !== null) {
          console.log(err);
          reject(err);
        }

        console.log(`${browserName} launched with ${instance.pid}`);
        instance.process.unref();
        instance.process.stdin.unref();
        instance.process.stdout.unref();
        instance.process.stderr.unref();
        resolve(instance);
      }
    );
  });
}

export default launchProxiedChrome;
