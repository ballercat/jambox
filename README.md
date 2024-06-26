[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ballercat_jambox&metric=coverage)](https://sonarcloud.io/summary/new_code?id=ballercat_jambox)

# :radio: Jambox :radio:

Record & Playback requests.

## Install

```
yarn add -D jambox
```

## Usage

### `jam`

Prepend `jam` to whatever command you are using to run `next` for example

```json
{
  "scripts": {
    "dev": "jam next dev"
  }
}
```

Or without changing an existing command

```
$(yarn bin jam) yarn dev
```

#### Browser

Each command auto starts a proxy server.

For example

```
yarn jam http://my-site-url.com
```

or create a re-usable script if you don't want to type this out every time

```json
{
  "scripts": {
    "view": "jam http://my-site-url.com"
  }
}
```

### `jam-server [sub-command] [--port]`

Launches a jambox server, you shoulnd't have to start one manually. These are
launched by the `jam` command if one isn't already running.

See sub-commands below.

#### `ping`

`yarn jam-server ping`

Attempt to ping a currently running jambox server

#### `shutdown`

`yarn jam-server shutdown`

Attempt to shutdown a currently running jambox server

#### `tail`

`yarn jam-server tail`

Tail the current logfile

## Config (in-progress)

Currently `jambox.config.js` is the default config path.

Changing the config file resets the jambox server in order to use the changed
options. Any cache values not persisted to file(s) are abanadoned when a jam server
is reset.

Here is a kitchen sink example of a config that:

- blocks any non mocked request
- proxies any `http://my-site-url.com` request to localhost
- in addition to HTTP requests also proxies Weboscket requests
- ignores some requests entirely
- caches specific paths and persists them to disk with `write: 'auto'`
- auto responds with static codes/messages to things like images and logs

```javascript
// Example config
module.exports = {
  blockNetworkRequests: true,
  // A map of a original:destination host
  forward: {
    // Forward all admin requests to a local App
    'http://my-site-url.com': {
      target: 'http://localhost:3000',
      paths: [
        // Match all paths
        '**',
        // Ignore the following paths, send them to the real server
        '!**/graphql',
        '!**/log',
      ],
      // Match websockets (support for NextJS local dev)
      websocket: true,
      // Enable automatic cors support
      // Useful for local servers which do not implement OPTIONS handlers
      // An object of custom OPTIONS respond Headers could be provided as well
      // default: false
      cors: true,
    },
  },
  stub: {
    '**/*.png': 204,
    // It's possible to respond with placeholder images instead of blank/broken 204s
    // Note that you must spcify a filepath, not file contents
    '**/*.jpg': { status: 200, file: 'placeholder.jpg', preferNetwork: true },
    '**/*.ico': 204,
    '**/log': { status: 200, statusMessage: 'stub log' },
  },
  cache: {
    write: 'auto',
    // Match a hostname + pathname string
    stage: ['**/graphql'],
    ignore: ['**/log'],
  },
};
```
