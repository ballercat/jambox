## 0.1.4 - Remove disable web security flags

- fix: `--disable-web-security` removed. This causes Chrome to omit the Origin
        header when enabled.

## 0.1.3 - Match paths containing dots, serialize browser config values

- fix: match pathnames with dot('.') literals in them
- fix: serialize and accept a `browser` option in config

## 0.1.2 - Fix config api route

- fix: wait on `reset` event during config api calls

## 0.1.1 - `--reset` cli arg, better messages

- feat: custom responses for cache misses while network access is disabled
- feat: custom responses for unmocked requests while network access is disabled
- feat: `--reset`/`-r` reset flag to restart jambox
- fix: allow `localhost` requests even if network access is disabled #42

## 0.1.0 - Refactor

- Rework internal logic, bump to `0.1.0`
- Fix persited flags breaking after cache reset
- Add error spash screen when api fails on load
- Add retry button on-load
- Rename `persisted` to `in-memory` or `filesystem`

## 0.0.30 - Turn off cors mode

- Turn off cors mode fix issue with multi headers
- Fix #39

## 0.0.29 - Fix SKPI Fingerprint, minor improvements

- Fix SKPI fingerprint
- Relaunch Jambox server if there is a version mismatch
- Update mockttp library

## 0.0.28 - Fix cert expiration

- fix: Updated the local cert to now expire in Dec 26, 2031

## 0.0.27 - Fix cache update bug

- fix: updating a single persited record removes all other records

## 0.0.26 - Introduce zip archives as tapes

- feature: introduce tapes as `.jambox/*.tape.zip` files
- feature: re-implement cache files as zip archives
- feature: `/api/reset` now properly resets cache from an archive
- feature: mass select and persist records into tapes in the Cache UI
- feature: publish a `cypress-node-events` helper
- chore: refactor integration tests
- chore: use a real jambox.config.js for e2e tests

## 0.0.25 - Cache select all, Remove SideNav, Add global search

- feat: cache select all/multi-select & delete
- fix: Waterfall highlight
- remove: SideNav
- add: global search
- fix: display pathname without query in cache table

## 0.0.24 - Fix broken cache file reads

- fix: catch unhandled json parse during reset

## 0.0.23 - Fix re-renders

- fix: unnecessary re-renders
- feat: stop rendering waterfall after document loads
- feat: clearing waterfall continues rendering incoming requests
- breaking change: rename `auto` option to `stub`
- feat: let stubs define a `body` directly

## 0.0.22 - Implement cached response update flow

- feat: users may now edit the cached responses
- feat: persist cache filters
- patch: use routing to navigate acrsoss the ui
- patch: clean-up global state management
- patch: attempt to close any jambox process prior to e2e tests
- fix: crash when deleting unknown cached id

## 0.0.21 - Bugfix cache read on startup

- fix: correctly read all json caches on startup

## 0.0.20 - Update Cache UI usability

- feat: searchable cache
- feat: searchable statusCode
- feat: cache detail modal

## 0.0.19 - Cache view updates

- feat: delete cache from UI
- feat: new json editor
- feat: add /api/cache POST api
- fix: collect coverage on cypress tests via c8
- fix: properly run github actions

## 0.0.18 - Update UI: Add cache view, sidenav

- feature: cache view
- feature: side nav
- chore: update CSS variables, colors

## 0.0.17 - Housekeeping, cypress tests

- chore: add cypress tests to the project

## 0.0.16 - Port configs, Request info tabs, auto-reconnect

- feature: jambox can be configured with a port now
- feature: request Info has "tabs" for headers, request & response info
- fix: extension will attempt to re-connect to the WebSocket server so a panel refresh is no longer necessary to reconnect.
- chore: added support for typescript JSDoc comments and typechecks.

## 0.0.15 Display raw request & responses

- Show the raw json of request/response in the info modal

## 0.0.14 Add pause api

- add: #10, add `/api/pause`
- fix: extension formatting
- fix: waterfall svg viewBox responds to resize events
- fix: resolve Svelte warnings

## 0.0.13 Improve Extension Styles

- add: styling based on system preferences to extension
- fix: typo in README.md

## 0.0.12 Abort event tracking, UI fixes

- add: `abort` event
- fix: aborted requests are evacuated from cache
- fix: content type responses are no longer hidden
- fix: spelling for log files `sever -> server`

## 0.0.11 Auto mock tweaks

- `auto` mocks patch requests even if network mode is enabled.
- `preferNetwork` boolean is added to allow network first responses even if
  an auto-mock is available.

## 0.0.10 Better image handling, auto mocking

- Let users specify a filepath during an auto-mock. This filepath will be read
  from disk when an auto-mock is used.
- Improve `nextjs-graphql-example`. Add a demo of an image placeholder.
- Add Chrome Extension notifications. Config updates fire notifications.
- Add `ping` & `shutdown` sub-commmands to `jam-server`
- Add `tail` sub-command for tailing a current log
- Create a `.jambox` folder if one doesn't exist in cwd

## 0.0.9 NextJS demo, better watch mode

- A tidy GraphQL example
- A fix for watching config file on linux systems
- New `browser` option in the config file to indicate which browser should be launched.
- Cache globs now match hostname + pathname, not just pathname
- Logfiles are now one per day instead a single giant file
- Fix unit tests, unskip disabled tests

## 0.0.8 Bugfixes, config watchmode

- Bugfix: `trust` list
- Bugfix: cache handling. Remove unnecessary options
- Feature: config file is watched for changes, server resets with changes.

## 0.0.7 Publish

- License
- Svelte DevTool

## 0.0.6 Persistent Caching

`jam <cli command>` or `jam <URL>` for jamming on a feature

`jam-server` to independently launch a server (rare).

Additions:

- Persistent caching of responses is now possible
- First successful cypress integration!
- `jam` & `jam-server` CLI commands
- Deleted `jambox <command>` CLI command (replaced with above)
- Simplified/removed many CLI flags
- `config.auto` feature
- `config.cache.write=auto` for auto writing cache to disk
- `config.blockNetworkRequests` boolean added
- `.jambox` cache directory added
- `jambox.config.js` can now be reloaded from `cwd` of the `jam` command
- Several new APIs added to the server to control behavior
- `mode` setting completely deleted as its no longer necessary
- Many changes to internal cache APIs
- Fixes to the size of the installed npm package, dependencies.

Log:

- Add automatic replies feature
  - Set custom status codes, messages for path globs
- No longer cache non mocked 5xx responses
- Reworked startup behavior
- /api/reset implemented, sets settings on startup of a `jam`
  - This allows the server to reconfigure w/o restart
  - No longer necessary to use a hacky hash workaround
- /api/reset loads cache from disk
- cached responses now provide a hash header
- switched several websocket requests to /api/ instead
- smol refactor
- add http-encoding as a dep
- Unwind hashing from cache lookup
- Add Cache read/write (filesystem)
- Split server and `jam` binaries
- Add cache status colors to waterfall

## 0.0.5 Network Waterfall

- Add a waterfall chart
- Remove table
- Add a refresh (page) button

## 0.0.4 Server: Glob support, improved cache

- Add support for globs
- Improve caching
- Change config API
- `localhost` option removed from config
- `forward` option now supports localhost forwarding
- Forwarding tagets must now be fully parsable urls (protocol + host)
- Add a real world in-memory cache example
- Add a few tests
- Clean-up handler logic
- Fix existing tests

## 0.0.3 Housekeeping

- add this file

## 0.0.2 DevTool

- #2

## 0.0.1 First useful local dev feature (Auth)

- #1
- First localhost test
- remapping localhost to a "real" dev url
- working auth flow via proxying of localhost to a dev url
- big refactors to server logic
- added a basic config
- ability to forward requests
- ability to ignore hosts entirely (noProxy)
- better port handling
- /info server endpoint returns config values proxy info
- better stdio/err into logs logic
- support websocket localhost proxying
  - Let's NextJS refresh work properly (!!)
- refactor cache into it's own class
- add tests
- update README
- add a CHANGELOG
