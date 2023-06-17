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

_NOTE: At the moment Cypress test don't integrate with the backend_

You may run cypress tests to easily test changes to the web extension.

`yarn cy`

The API is fully mocked in the cypress tests so this isn't a full integration
test _yet_.
