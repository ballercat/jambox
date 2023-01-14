<script>
  import { store, reducer } from './store.js';
  import Waterfall from './Waterfall.svelte';

  export let server;

  const chrome = window.chrome;
  let cleanup;

  fetch('http://localhost:9000/api/config')
    .then((res) => res.json())
    .then((payload) => {
      store.update((state) => reducer(state, { type: 'config', payload }));
    });

  $: {
    cleanup?.();

    const sub = server.subscribe((action) => {
      if (action.type === 'config') {
        chrome.notifications.create('', {
          title: 'Jambox Config Updated!',
          message: 'Jambox Config Updated!',
          iconUrl: 'icons/icon-json-64x64.png',
          type: 'basic',
        });
      }
      store.update((state) => {
        return reducer(state, action);
      });
    });

    cleanup = () => sub.unsubscribe();
  }
</script>

<main class="Container">
  <h1>Jambox</h1>
  <div class="Box">
    <button
      on:click={() =>
        store.update((state) => reducer(state, { type: 'clear' }))}
      >Clear</button
    >
    <button
      on:click={() => {
        chrome.tabs.query(
          { active: true, currentWindow: true },
          (arrayOfTabs) => {
            store.update((state) => reducer(state, { type: 'refresh' }));
            chrome.tabs.reload(arrayOfTabs[0].id);
          }
        );
      }}>Refresh</button
    >
    <div class="Align-Bottom">
      <div>
        Network Requests Are Blocked: {$store.config.blockNetworkRequests
          ? 'yes'
          : 'no'}
      </div>
    </div>
  </div>
  <Waterfall data={$store} />
</main>

<style>
  .Container {
    padding: 0 10px;
  }
  .Box {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    gap: 10px;
  }
  .Align-Bottom {
    display: flex;
    align-items: flex-end;
  }
</style>
