/**
 * This config is used for integration tests
 *
 * - See the *.cy.js files
 * - Used to reset the running jambox instance during tests
 * - Causes .jambox/default.tape.zip to be written
 * - Leave .jambox/default.tape.zip empty after integration tests
 */
module.exports = {
  blockNetworkRequests: false,
  forward: [
    {
      match: 'http://jambox-test.com',
      target: 'http://localhost:7777',
      paths: ['**'],
    },
  ],
  stub: {
    '**/pathC': {
      status: 200,
      statusMessage: 'OK',
      body: { data: 'test-stub' },
    },
  },
  cache: {
    stage: ['jambox-test.com/**'],
  },
};
