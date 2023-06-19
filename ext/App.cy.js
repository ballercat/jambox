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
  });
});
