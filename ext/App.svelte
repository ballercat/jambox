<script>
  import { store, reducer } from './store.js';
  import Checkbox from './Checkbox.svelte';
  import Waterfall from './Waterfall.svelte';

  export let api;

  const chrome = window.chrome;
  let pauseChecked = false;
  let cleanup;
  api.getConfig().then((payload) => {
    store.update((state) => reducer(state, { type: 'config', payload }));
  });

  $: {
    cleanup?.();
    pauseChecked = $store.config.pause;
    console.log($store.config);

    cleanup = api.subscribe((action) => {
      if (action.type === 'config') {
        chrome.notifications?.create('', {
          title: 'Jambox Config Updated!',
          message: `Loaded ${action.payload.filepath}`,
          iconUrl: 'icons/icon-json-64x64.png',
          type: 'basic',
        });
      }
      store.update((state) => {
        return reducer(state, action);
      });
    });
  }
</script>

<main class="Container">
  <div class="Box">
    <div class="TopBar">
      <div class="Text">📻 Jambox 📻</div>
      <Checkbox
        checked={$store.config.paused}
        inline
        label="Pause Proxy"
        onClick={() => {
          api.pause(!$store.config.paused);
        }}
      />
      <Checkbox
        inline
        checked={$store.config.blockNetworkRequests}
        label="Block Network"
        onClick={() => {}}
      />
    </div>
  </div>
  <Waterfall data={$store} />
</main>

<style>
  @media (prefers-color-scheme: dark) {
    :root {
      --backgroundColor: #000;
      --textColor: #fff;
      --stripeA: #333;
      --stripeB: #000;
      --aborted: DeepPink;
      --borderColor: #666;
    }
  }

  @media (prefers-color-scheme: light) {
    :root {
      --backgroundColor: #fff;
      --textColor: #000;
      --stripeA: #efefef;
      --stripeB: #fff;
      --aborted: #a35;
      --borderColor: #aaa;
    }
  }

  :global(html, body) {
    font-family: menlo, monospace;
    font-size: 1rem;
    background-color: var(--backgroundColor);
    color: var(--textColor);
  }
  .Container {
    padding: 0 20px;
  }
  .Text {
    font-weight: bold;
  }
  .Box {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .TopBar {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    border-bottom: 2px solid;
    border-color: var(--stripeA);
    padding-bottom: 10px;
  }
</style>
