<script>
  import { store, reducer } from './store.js';
  import Waterfall from './Waterfall.svelte';

  export let api;

  const chrome = window.chrome;
  let cleanup;

  api.getConfig().then((payload) => {
    store.update((state) => reducer(state, { type: 'config', payload }));
  });

  $: {
    cleanup?.();

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
    <h1>📻 Jambox 📻</h1>
    <div>
      <button
        type="button"
        class="Button"
        on:click={() =>
          store.update((state) => reducer(state, { type: 'clear' }))}
        >Clear</button
      >
      <button
        class="Button"
        type="button"
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
      <button
        class="Button"
        type="button"
        on:click={() => api.pause(!$store.config.paused)}
        >{$store.config.paused ? 'Unpause' : 'Pause'}</button
      >
    </div>
    <div>
      Network Requests Are Blocked: <span class="Highlight Text"
        >{$store.config.blockNetworkRequests ? 'yes' : 'no'}
      </span>
    </div>
    <div>
      Proxy is paused: <span class="Highlight Text"
        >{$store.config.paused ? 'yes' : 'no'}</span
      >
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
    font-size: 1rem;
    background-color: var(--backgroundColor);
    color: var(--textColor);
  }
  .Container {
    padding: 0 20px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
  .Highlight {
    padding: 2px 5px;
    background: var(--textColor);
    color: var(--backgroundColor);
  }
  .Text {
    font-weight: bold;
  }
  .Box {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .Button {
    background-color: var(--textColor);
    color: var(--backgroundColor);
    border-radius: 5px;
    padding: 5px 10px;
    cursor: pointer;
    font-weight: bold;
    outline: 0;
    border: 2px solid transparent;
  }

  .Button:hover {
    background-color: var(--backgroundColor);
    color: var(--textColor);
    border-color: var(--textColor);
  }
  .Button:focus-visible {
    background-color: var(--backgroundColor);
    color: var(--textColor);
    border-color: var(--textColor);
  }

  .Button:active {
    border-color: MediumSlateBlue;
    color: MediumSlateBlue;
  }
</style>
