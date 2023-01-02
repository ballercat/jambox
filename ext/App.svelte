<script>
  import { store, reducer } from './store.js';
  import Waterfall from './Waterfall.svelte';

  export let server;

  const chrome = window.chrome;
  let cleanup;

  $: {
    cleanup?.();

    const sub = server.subscribe((action) => {
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
    <button>Clear</button>
    <button
      on:click={() => {
        // refresh?
        chrome.tabs.query(
          { active: true, currentWindow: true },
          (arrayOfTabs) => {
            store.update((state) => reducer(state, { type: 'refresh' }));
            chrome.tabs.reload(arrayOfTabs[0].id);
          }
        );
      }}>Refresh</button
    >
    <div>
      <input type="checkbox" id="block-network" name="block-network" />
      <label for="block-network">Block Network Requests</label>
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
  }
</style>
