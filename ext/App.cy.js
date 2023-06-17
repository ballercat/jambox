import App from './App.svelte';

describe('App', () => {
  it('renders', () => {
    const listeners = new Set();
    const simulateEvent = (action) => {
      cy.log(`Simulate Event`, action);
      for (const fn of listeners) {
        fn(action);
      }
    };

    const api = {
      getConfig() {
        return Promise.resolve({});
      },
      subscribe(fn) {
        listeners.add(fn);
        () => listeners.delete(fn);
      },
    };
    cy.mount(App, { props: { api } });
    cy.wait(10).then(() => {
      simulateEvent({
        type: 'request',
        payload: {
          id: 0,
          url: 'http://jambox.com/json',
          startTimestamp: Date.now() - 10,
          bodyReceivedTimestamp: Date.now(),
          headers: {},
        },
      });
      simulateEvent({
        type: 'request',
        payload: {
          id: 1,
          url: 'http://jambox.com/foobar',
          startTimestamp: Date.now() - 50,
          bodyReceivedTimestamp: Date.now(),
          headers: {},
        },
      });
    });

    cy.get(`[data-cy-id="request-0"]`).as('request');
    cy.get(`[data-cy-id="request-1"]`).as('pending');
    cy.get('@request').contains('pending');
    cy.wait(100).then(() => {
      simulateEvent({
        type: 'response',
        payload: {
          id: 0,
          url: 'http://jambox.com',
          statusCode: 200,
          sizeInBytes: 1024,
          responseSentTimestamp: Date.now(),
          body: { jsonPropertyKey: 'jsonPropertyValue' },
          headers: {
            'content-type': 'application/json',
          },
        },
      });
    });
    cy.get('@request').contains('200');
    cy.get('@request').contains('fetch');
    cy.get('@pending').contains('pending');

    cy.get('@request').click({ force: true });

    cy.get('[data-cy-id="request-info"]').as('modal');

    cy.get('@modal').contains('http://jambox.com/json');
    cy.get('[data-cy-id="select-response-tab"]').click();
    cy.get('@modal').contains('jsonPropertyKey');
    cy.get('@modal').contains('jsonPropertyValue');

    cy.get('[data-cy-id="modal-background"]').click({ force: true });

    cy.get('@modal').should('not.exist');
  });
});
