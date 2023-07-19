const path = require('path');

module.exports = {
  blockNetworkRequests: false,
  forward: {
    'http://jambox-demo-graphql.vercel.app': {
      target: 'http://localhost:3000',
      paths: ['**'],
      // websocket: true will ensure NextJS can make a WS connection + HMR
      websocket: true,
    },
  },
  stub: {
    '**/*.jpg': { status: 200, file: path.join(__dirname, '200x200.jpg') },
  },
  cache: {
    write: 'auto',
    // GraphQL request
    stage: ['graphql-pokemon2.vercel.app/'],
  },
};
