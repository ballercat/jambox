import API from './Api';
import App from './App.svelte';

let api;
before(async () => {
  api = await API.create();
});

// static hashes for requests used below
const A = 'ba20ccbb470042f3200692cad1926c1c';
const B = 'f4c55ab257c689845921746061bfeb73';
const C = 'cd4482b36a608021cd943786ecb54c5d';

describe('Cache UI', () => {
  it('can edit response objects', () => {
    // load jambox config from cwd
    cy.task('jambox.reset');
    cy.mount(App, { props: { api } });

    // Additional requests to fill up the cache
    cy.request('http://jambox-test.com/pathA');
    cy.request('http://jambox-test.com/pathB');
    cy.request('http://jambox-test.com/pathC');

    cy.get('[data-cy-id="cache-link"]').click();
    cy.get(`[data-cy-id="cache-cell-edit-${A}"]`).as('test-edit');
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
  });

  it.only('can persist records and delete them after', () => {
    // load jambox config from cwd
    cy.task('jambox.reset');
    cy.mount(App, { props: { api } });

    cy.request('http://jambox-test.com/pathA');
    cy.request('http://jambox-test.com/pathB');
    cy.request('http://jambox-test.com/pathC');

    cy.get('[data-cy-id="cache-link"]').click();
    cy.get(`[data-cy-id="cache-cell-edit-${A}"]`).as('test-persist-A');
    cy.get(`[data-cy-id="cache-cell-edit-${B}"]`).as('test-persist');
    cy.get(`[data-cy-id="select-row-${B}"]`).as('test-persist-select');
    cy.get(`[data-cy-id="select-row-${A}"]`).as('test-persist-select-A');
    cy.get(`[data-cy-id="cache-cell-edit-${C}"]`).as('test-in-memory-cache');

    // Persist should be click-able
    cy.get('@test-persist-select').click();
    cy.get('@test-persist-select-A').click();
    cy.get('[data-cy-id="cache-persist"]').click();
    cy.get(`[data-cy-id="cache-cell-persisted-true-${B}"]`).should('exist');

    // Edit persisted record
    cy.get('@test-persist').click();
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
    cy.get('[data-cy-id="back-to-cache"]').click();

    // Back to Waterfall
    cy.get('[data-cy-id="waterfall-link"]').click();

    // Reset jambox. This deletes in-memory cache
    cy.task('jambox.reset');

    // Back to cache
    cy.get('[data-cy-id="cache-link"]').click();

    // Cache should be loaded from a tape and contain the edited
    cy.get('@test-persist').click();
    cy.get('[data-cy-id="select-response-tab"]').click();
    cy.get('[data-cy-id="cache-detail"]').contains('foobar');

    // Back to cache
    cy.get('[data-cy-id="cache-link"]').click();

    // The pathC cached value was not persisted and should no longer exist in UI
    cy.get('@test-in-memory-cache').should('not.exist');

    cy.get('@test-persist-select').click();
    cy.get('@test-persist-select-A').click();
    cy.get('[data-cy-id="cache-delete"]').click();

    cy.get('@test-persist').should('not.exist');
    cy.get('@test-persist-A').should('not.exist');
  });
});
