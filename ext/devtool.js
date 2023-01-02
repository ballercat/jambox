import browser from 'webextension-polyfill';

(async function main() {
  await browser.devtools.panels.create('Jambox', null, 'panel.html');
})();
