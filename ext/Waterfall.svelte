<script>
  import { watchResize } from 'svelte-watch-resize';
  import { store, reducer, CONTENT_MAP } from './store.js';
  import Row from './Row.svelte';
  import Checkbox from './Checkbox.svelte';

  export let history;
  export let data;

  const chrome = window.chrome;

  const shortenURL = (url) => {
    const shorterURL = url.host + url.pathname;

    if (shorterURL.length > 30) {
      return shorterURL.slice(0, 15) + ' ... ' + shorterURL.slice(-10);
    }

    return shorterURL;
  };

  const possibleChecks = [...Object.values(CONTENT_MAP), 'other'];

  let checked = possibleChecks;

  const rowHeight = 15;
  const rowPadding = 5;
  const barOffset = 0;

  const width = '100%';

  let rows,
    minTime = 0,
    maxTime = 0;
  let height, scaleFactor;
  let contentWidth = 600;

  function handleContentResize(node) {
    contentWidth = node.clientWidth;
  }

  $: {
    rows = Object.values(data.http).filter(({ contentType }) => {
      return checked.includes(contentType);
    });

    if (rows.length) {
      minTime = rows[0].request.bodyReceivedTimestamp;
      maxTime =
        rows[rows.length - 1].response?.responseSentTimestamp ||
        [rows.length - 1].request.bodyReceivedTimestamp;
    }

    height = (rows.length + 1) * (rowHeight + rowPadding); // +1 for axis
    scaleFactor = Math.ceil((maxTime - minTime) / (1000 - 5 - barOffset));
  }
</script>

<div class="Box">
  <button
    type="button"
    class="Button"
    on:click={() => store.update((state) => reducer(state, { type: 'clear' }))}
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
  <Checkbox
    onClick={() => {
      if (checked.length === possibleChecks.length) {
        checked = [];
      } else {
        checked = [...possibleChecks];
      }
    }}
    inline
    variation="secondary"
    checked={checked.length === possibleChecks.length}
    id="all-check"
    name="all-check"
    label="All"
  />
  {#each possibleChecks as type}
    <Checkbox
      inline
      onClick={() => {
        if (checked.includes(type)) {
          checked = checked.filter((check) => check !== type);
        } else {
          checked = [...checked, type];
        }
      }}
      checked={checked.includes(type)}
      id="{type}-check"
      name="{type}-check"
      label={type}
    />
  {/each}
</div>

<div class="Content" use:watchResize={handleContentResize}>
  <svg
    {width}
    {height}
    viewBox="0 0 {contentWidth} {height}"
    preserveAspectRatio="none"
    style="overflow: auto;"
  >
    {#each rows as http, index}
      <Row
        aborted={false}
        {...http}
        title={shortenURL(new URL(http.url))}
        {minTime}
        {rowHeight}
        {rowPadding}
        {index}
        {barOffset}
        {scaleFactor}
        onClick={(id) => history.navigate(`/request/${id}`)}
      />
    {/each}
  </svg>
</div>

<style>
  .Box {
    margin-top: 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
  }
  .Content {
    grid-column: 1 / 3;
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
