<script>
  import { store, reducer } from './store.js';
  import Cache from './Cache';
  import Checkbox from './Checkbox.svelte';
  import Waterfall from './Waterfall.svelte';
  import SideNav from './SideNav.svelte';
  import RequestInfo from './RequestInfo';
  import Modal from './Modal.svelte';

  export let api;

  const chrome = window.chrome;
  let pauseChecked = false;
  let cleanup;
  let path = '/Waterfall';
  let selection = null;

  api.getConfig().then((payload) => {
    store.update((state) => reducer(state, { type: 'config', payload }));
  });
  api.getCache().then((payload) => {
    store.update((state) => reducer(state, { type: 'cache.load', payload }));
  });

  $: {
    cleanup?.();
    pauseChecked = $store.config.pause;

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
  <SideNav
    onNavigation={(selection) => {
      path = selection;
    }}
    {path}
  />
  <div class="Box">
    <div class="TopBar">
      <Checkbox
        checked={$store.config.paused}
        inline
        id="pause-proxy"
        name="pause-proxy"
        label="Pause Proxy"
        onClick={() => {
          api.pause(!$store.config.paused);
        }}
      />
      <Checkbox
        inline
        id="block-network"
        name="block-network"
        checked={$store.config.blockNetworkRequests}
        label="Block Network"
        onClick={() => {
          api.blockNetworkRequests(!$store.config.blockNetworkRequests);
        }}
      />
    </div>
    {#if path === '/Waterfall'}
      <Waterfall data={$store} onSelection={(value) => (selection = value)} />
    {/if}
    {#if path === '/Cache'}
      <Cache
        cache={$store.cache}
        {api}
        onSelection={(row) => {
          selection = row;
        }}
      />
    {/if}
  </div>
  {#if selection}
    <Modal on:close={() => (selection = null)}>
      <RequestInfo {...selection} />
    </Modal>
  {/if}
</main>

<style>
  /* https://iamkate.com/data/12-bit-rainbow/ */
  :root {
    --magenta: #817;
    --maroon: #a35;
    --red: #c66;
    --orange: #e94;
    --yellow: #ed0;
    --conifer: #9d5;
    --aquamarine: #4d8;
    --turquoise: #2cb;
    --topaz: #0bc;
    --cerulean: #09c;
    --blue: #36b;
    --purple: #639;

    /* greyscale */
    --gc-magenta: #696969;
    --gc-maroon: #5b5b5b;
    --gc-red: #4c4c4c;
    --gc-orange: #979797;
    --gc-yellow: #e2e2e2;
    --gc-conifer: #bcbcbc;
    --gc-aquamarine: #969696;
    --gc-turquoise: #a4a4a4;
    --gc-topaz: #b3b3b3;
    --gc-cerulean: #686868;
    --gc-blue: #1d1d1d;
    --gc-purple: #434343;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --backgroundColor: #000;
      --textColor: #fff;
      --stripeA: var(--gc-purple);
      --stripeB: #000;
      --aborted: var(--cerulean);
      --borderColor: var(--gc-magenta);
    }
  }

  @media (prefers-color-scheme: light) {
    :root {
      --backgroundColor: #fff;
      --textColor: #000;
      --stripeA: var(--gc-yellow);
      --stripeB: #fff;
      --aborted: var(--maroon);
      --borderColor: var(--gc-turquoise);
    }
  }

  :global(html, body) {
    font-family: menlo, monospace;
    font-size: 1rem;
    background-color: var(--backgroundColor);
    color: var(--textColor);
  }
  .Container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    height: 100vh;
  }
  .Container > :first-child {
    flex-grow: 1;
  }
  .Container > :last-child {
    flex-basis: 0;
    flex-grow: 999;
    min-inline-size: 50%;
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
