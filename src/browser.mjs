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
      '--disable-features=ChromeWhatsNewUI',
      '--disable-background-networking',
      '--disable-component-update',
      '--check-for-update-interval=31536000',
      // Proxy
      `--proxy-server=${info.proxy.http}`,
      // https://www.chromium.org/developers/design-documents/network-settings/
      `--proxy-bypass-list="${info.noProxy.join(';')}"`,
      // FIXME: Don't depend on browser-launchers profile
      `--user-data-dir=${osenv.home() + '/.config/jambox-' + chrome.name}`,
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

/**
 * Resolve the browser to use. When info.browser is an object ({ name, command })
 * it is used directly, skipping detection. When it's a string (or missing),
 * we detect installed browsers and find by name.
 *
 * @param {string|object} browserConfig - value from config.browser
 * @returns {Promise<{ name: string, command: string }>}
 */
async function resolveBrowser(browserConfig) {
  if (typeof browserConfig === 'object' && browserConfig !== null) {
    return browserConfig;
  }

  const browserName = browserConfig || 'chrome';
  const browsers = await detect();
  const match = browsers.find(({ name }) => name === browserName);
  if (!match) {
    throw new Error(
      `Browser "${browserName}" not found. Detected browsers: ${browsers.map((b) => b.name).join(', ')}. ` +
        `You can provide a custom browser object in jambox.config.js: browser: { name: "...", command: "/path/to/binary" }`
    );
  }
  return match;
}

async function launchProxiedChrome(uri, info) {
  const chrome = await resolveBrowser(info.browser);

  if (os.platform() === 'darwin') {
    return mac({ chrome, uri, info });
  }

  // When a custom browser object is provided, spawn directly instead of
  // delegating to browser-launcher (which would do its own lookup).
  if (typeof info.browser === 'object' && info.browser !== null) {
    return spawn(
      chrome.command,
      [
        uri,
        '--disable-features=ChromeWhatsNewUI',
        '--disable-background-networking',
        '--disable-component-update',
        '--check-for-update-interval=31536000',
        `--proxy-server=${info.proxy.http}`,
        `--proxy-bypass-list="${info.noProxy.join(';')}"`,
        `--user-data-dir=${osenv.home() + '/.config/jambox-' + chrome.name}`,
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
        `--ignore-certificate-errors-spki-list=${SPKI_FINGERPRINT}`,
        '--test-type',
        '--enable-automation',
        '--auto-open-devtools-for-tabs',
        `--load-extension=${EXTENSION_PATH}`,
        '--enable-features=AllowWasmInMV3',
      ],
      { detached: true, stdio: 'ignore' }
    );
  }

  const browserName = chrome.name;
  const launch = await getLauncher();

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
      (err, instance) => {
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
