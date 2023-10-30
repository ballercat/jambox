<script>
  import { Router, Route, Link } from 'svelte-routing';
  import {
    createHistory,
    createMemorySource,
  } from 'svelte-routing/src/history';
  import { store, reducer } from './store.js';
  import Cache from './Cache';
  import Checkbox from './Checkbox.svelte';
  import Waterfall from './Waterfall.svelte';
  import RequestInfo from './RequestInfo';
  import CacheEntry from './CacheEntry.svelte';

  export let api;

  let search = $store.search;
  const history = createHistory(createMemorySource());
  const chrome = window.chrome;
  let pauseChecked = false;
  let cleanup;
  let url = '/';

  const loadCache = async () => {
    try {
      const payload = await api.getCache();
      store.update((state) => reducer(state, { type: 'cache.load', payload }));
    } catch (e) {
      store.update((state) =>
        reducer(state, { type: 'error', payload: [`${e.message} ${e.stack}`] })
      );
    }
  };

  const loadConfig = async () => {
    try {
      const payload = await api.getConfig();
      store.update((state) =>
        reducer(state, { type: 'config.update', payload })
      );
    } catch (e) {
      store.update((state) =>
        reducer(state, { type: 'error', payload: [`${e.message} ${e.stack}`] })
      );
    }
  };

  loadConfig();
  loadCache();

  // Refresh when the page reloads
  chrome.webNavigation?.onBeforeNavigate.addListener((details) => {
    if (
      details.frameId === 0 &&
      details.tabId === chrome.devtools.inspectedWindow.tabId
    ) {
      store.update((state) => reducer(state, { type: 'refresh' }));
    }
  });

  chrome.webNavigation?.onCompleted.addListener((details) => {
    if (
      details.frameId === 0 &&
      details.tabId === chrome.devtools.inspectedWindow.tabId
    ) {
      store.update((state) => reducer(state, { type: 'complete' }));
    }
  });

  $: {
    cleanup?.();
    pauseChecked = $store.config.pause;

    cleanup = api.subscribe((action) => {
      if (action.type === 'cache.reset') {
        loadCache();
        return;
      }
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
  {#if $store.errors.length}
    <div class="Box">
      <button
        on:click={() => {
          loadConfig();
          loadCache();
        }}>Retry</button
      >
      <div>
        <span
          >Could not establish initial connection with the jambox api. You could
          attempt to manually try again.</span
        >
        {#each $store.errors as err}
          <div class="Error">
            <pre>{err}</pre>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <Router {url} {history}>
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
          <Link to="/" data-cy-id="waterfall-link" class="SideNav-Link"
            >Waterfall</Link
          >
          <Link data-cy-id="cache-link" to="/cache" class="SideNav-Link"
            >Cache</Link
          >
          <input
            type="search"
            bind:value={search}
            autocomplete
            placeholder="search"
          />
        </div>
        <Route path="/">
          <Waterfall {history} {search} />
        </Route>
        <Route path="/cache">
          <Cache {search} {api} />
        </Route>
        <Route path="/cache/entry/:id" let:params>
          <CacheEntry id={params.id} {api} {history} />
        </Route>
        <Route path="/request/:id" component={RequestInfo} />
      </div>
    </Router>
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
  .Error {
    color: var(--red);
  }
</style>
