module.exports = {
  browser: 'chromium',
  blockNetworkRequests: false,
  forward: {
    'http://jambox-demo-graphql.vercel.app': {
      target: 'http://localhost:3000',
      paths: ['**'],
      // websocket: true will ensure NextJS can make a WS connection + HMR
      websocket: true,
    },
  },
  cache: {
    write: 'auto',
    // GraphQL request
    stage: ['graphql-pokemon2.vercel.app/'],
  },
};
