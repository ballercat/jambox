import API from './Api';
import App from './App.svelte';

let api;
before(async () => {
  await cy.task('set-jambox-config', {
    blockNetworkRequests: false,
    forward: {
      'http://jambox-test.com/path': {
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

describe('Web Extension', () => {
  it('can display seen requests', () => {
    // Jambox should generate a static hash for the URL below
    const HASH = '2be35430d93be811753ecfd6ba828878';
    const testURL = 'http://jambox-test.com/returnThisAsJson';
    cy.mount(App, { props: { api } });

    cy.request(testURL);

    // Additional requests to fill up the cache
    cy.request('http://jambox-test.com/pathA');
    cy.request('http://jambox-test.com/pathB');
    cy.request('http://jambox-test.com/pathC');

    cy.get(`[data-cy-id="${testURL}"]`).as('request');

    cy.get('@request').contains('200');
    cy.get('@request').contains('fetch');

    cy.get('@request').click({ force: true });

    cy.get('[data-cy-id="request-info"]').as('modal');

    cy.get('@modal').contains(testURL);
    cy.get('[data-cy-id="select-response-tab"]').click();
    cy.get('@modal').contains('path');
    cy.get('@modal').contains('/returnThisAsJson');

    cy.get('[data-cy-id="modal-background"]').click({ force: true });

    cy.get('@modal').should('not.exist');

    // When network requests are blocked no caching happens, so disable blocking
    cy.get(`[data-cy-id="block-network"]`).as('block-network').uncheck();
    cy.get('@block-network').should('have.prop', 'indeterminate');

    cy.wait(50);
    cy.request(testURL);

    cy.get('[data-cy-id="cache-link"]').click();

    cy.get(`[data-cy-id="cache-cell-edit-${HASH}"]`).as('test-edit');
    cy.get('@test-edit').click();
    cy.get('[data-cy-id="cache-detail"]').contains(testURL);

    cy.get('[data-cy-id="cache-detail"]').contains('path');
    cy.get('[data-cy-id="cache-detail"]').contains('/returnThisAsJson');

    cy.get('[data-cy-id="cache-breadcrumb-link"]').click();

    cy.get('[data-cy-id="cache-detail"]').should('not.exist');

    // clear cache
    cy.get('@test-edit').click();
    cy.get('[data-cy-id="cache-delete"]').click();
    cy.get('[data-cy-id="cache-detail"]').should('not.exist');
    cy.get('@test-edit')
      .should('not.exist')
      .then(() => {
        // Delete the rest of the requests
        // return api.delete([
        //   'ba20ccbb470042f3200692cad1926c1c',
        //   'f4c55ab257c689845921746061bfeb73',
        //   'cd4482b36a608021cd943786ecb54c5d',
        // ]);
      });
  });
});
