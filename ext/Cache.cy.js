import API from './Api';
import App from './App.svelte';

let api;
before(async () => {
  await cy.task('set-jambox-config', {
    blockNetworkRequests: false,
    forward: {
      'http://jambox-test.com': {
        target: 'http://localhost:7777',
        paths: ['**'],
      },
    },
    cache: {
      dir: '.jambox',
      write: 'auto',
      stage: ['jambox-test.com/**'],
    },
  });
  api = await API.create();
});

describe('Cache UI', () => {
  it('can edit response objects', () => {
    cy.mount(App, { props: { api } });

    // Additional requests to fill up the cache
    cy.request('http://jambox-test.com/pathA');
    cy.request('http://jambox-test.com/pathB');
    cy.request('http://jambox-test.com/pathC');

    cy.get('[data-cy-id="cache-link"]').click();
    cy.get(
      '[data-cy-id="cache-cell-edit-f4c55ab257c689845921746061bfeb73"]'
    ).as('test-edit');
    cy
      .get('[data-cy-id="cache-cell-edit-ba20ccbb470042f3200692cad1926c1c"]')
      .as('test-write'),
      cy.get('@test-edit').click();
    cy.get('[data-cy-id="select-response-tab"]').click();

    // Edit body
    cy.get('[data-cy-id="select-response-tab"]').click();
    cy.get(
      '[data-path="%2Fbody"] > .jse-props > .jse-json-node > .jse-contents-outer > .jse-contents > .jse-value'
    ).dblclick();
    cy.get('.jse-editable-div').clear();
    cy.get('.jse-editable-div').type('foobar{enter}');
    cy.get('[data-cy-id="update-response-btn"]').click();

    // Close
    cy.get('[data-cy-id="back-to-cache"]').click({ force: true });

    // Open modal
    cy.get('@test-edit').click();
    cy.get('[data-cy-id="select-response-tab"]').click();
    cy.get('[data-cy-id="cache-detail"]').contains('foobar');

    // clear cache
    cy.get('[data-cy-id="select-details-tab"]').click();
    cy.get('[data-cy-id="cache-delete"]').click();
    cy.get('[data-cy-id="cache-detail"]').should('not.exist');

    cy.wait(1).then(() => {
      // cleanup
      return api.delete([
        'ba20ccbb470042f3200692cad1926c1c',
        'f4c55ab257c689845921746061bfeb73',
        'cd4482b36a608021cd943786ecb54c5d',
      ]);
    });
  });
});
