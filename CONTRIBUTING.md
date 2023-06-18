# CONTRIBUTING

Git clone locally and run `jam.mjs` from wherever you cloned the repo to. Use the
example kitched sink example in the README.md for a good config starting point.

- Write feature
- Test feature
  - pass test
- Lint feature
  - pass lints
- Push branch
- Get Pull Request merged

## Manual testing

`yarn dev` to watch and rebuild server
`yarn webpack --watch` to rebuild the extension UI

Once Chrome is launched with via jambox, for example `jam record <url>` you
no longer need to re-launch chrome to connect to the jambox. Just restart the
server, chrome will be able to proxy to it just fine. One day it'll be possible
to reset/change settings from withing the Chrome extension.

## Cypress

You may run cypress tests to easily integration test changes to both web-extension
and the server.

Start the end-to-end backend, this will stand up a simple HTTP server to test against and
a jambox server to act as a proxy.

`yarn e2e-dev`

Launch cypress

`yarn cy`

Note that if yuu did not launch the server first, the tests will fail.
