import API from './Api';
import App from './App.svelte';

let api;
before(async () => {
  await cy.task('set-jambox-config', {
    blockNetworkRequests: true,
    forward: {
      'http://jambox-test.com/path': {
        target: 'http://localhost:7777',
        paths: ['**'],
      },
    },
    cache: {
      stage: ['jambox-test.com/**'],
    },
  });
  api = await API.create();
});
describe('Web Extension', () => {
  it('can display seen requests', () => {
    const testURL = 'http://jambox-test.com/returnThisAsJson';
    cy.mount(App, { props: { api } });

    cy.request(testURL);

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

    // Same modal as the waterfall should be available for cache
    cy.get('[data-cy-id="cache-id"]').click();
    cy.get('@modal').contains(testURL);
    cy.get('[data-cy-id="select-response-tab"]').click();
    cy.get('@modal').contains('path');
    cy.get('@modal').contains('/returnThisAsJson');

    cy.get('[data-cy-id="modal-background"]').click({ force: true });

    cy.get('@modal').should('not.exist');
  });
});
