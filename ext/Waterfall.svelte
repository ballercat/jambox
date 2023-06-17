<script>
  import { watchResize } from 'svelte-watch-resize';
  import Row from './Row.svelte';
  import RequestInfo from './RequestInfo';
  import Modal from './Modal.svelte';

  export let data;
  export let selection = null;

  const CONTENT_MAP = {
    'application/javascript': 'js',
    'application/json': 'fetch',
    'text/html': 'html',
  };
  const possibleChecks = [...Object.values(CONTENT_MAP), 'other'];

  const shortenURL = (url) => {
    const shorterURL = url.host + url.pathname;

    if (shorterURL.length > 30) {
      return shorterURL.slice(0, 15) + ' ... ' + shorterURL.slice(-10);
    }

    return shorterURL;
  };

  let checked = possibleChecks;

  const rowHeight = 15;
  const rowPadding = 5;
  const barOffset = 0;

  const width = '100%';

  let rows, minTime, maxTime;
  let height, scaleFactor;
  let contentWidth = 100;

  function handleContentResize(node) {
    contentWidth = node.clientWidth;
  }

  $: {
    ({ rows, minTime, maxTime } = Object.values(data.requestById).reduce(
      (acc, request) => {
        const url = new URL(request.url);
        const response = data.responseById[request.id];
        const contentTypeHeader = response?.headers['content-type'] ?? null;
        const contentType = contentTypeHeader
          ? CONTENT_MAP[contentTypeHeader.split(';')[0]]
          : 'other';

        if (!checked.includes(contentType)) {
          return acc;
        }

        acc.maxTime = Math.max(
          acc.maxTime,
          response?.responseSentTimestamp || request.bodyReceivedTimestamp
        );
        acc.minTime = Math.min(acc.minTime, request.startTimestamp);

        const start = Math.ceil(request.startTimestamp);
        const received = Math.ceil(
          request.bodyReceivedTimestamp - request.startTimestamp
        );
        const duration = response?.responseSentTimestamp
          ? Math.ceil(response.responseSentTimestamp - request.startTimestamp)
          : null;

        acc.rows.push({
          id: request.id,
          url,
          title: shortenURL(url),
          start,
          received,
          duration,
          statusCode: response?.statusCode || null,
          contentType,
          aborted: Boolean(data.abortedRequestById[request.id]),
        });

        return acc;
      },
      {
        rows: [],
        minTime: Number.MAX_SAFE_INTEGER,
        maxTime: 0,
      }
    ));
    height = (rows.length + 1) * (rowHeight + rowPadding); // +1 for axis
    scaleFactor = Math.ceil((maxTime - minTime) / (1000 - 5 - barOffset));
  }
</script>

<div class="Box">
  <div class="Checkbox-wrapper">
    <input
      on:click={() => {
        if (checked.length === possibleChecks.length) {
          checked = [];
        } else {
          checked = [...possibleChecks];
        }
      }}
      checked={checked.length === possibleChecks.length}
      type="checkbox"
      id="all-check"
      name="all-check"
      class="AllCheckbox Checkbox"
    />
    <label class="Label" for="all-check">All</label>
  </div>
  {#each possibleChecks as type}
    <div class="Checkbox-wrapper">
      <input
        on:click={() => {
          if (checked.includes(type)) {
            checked = checked.filter((check) => check !== type);
          } else {
            checked = [...checked, type];
          }
        }}
        checked={checked.includes(type)}
        type="checkbox"
        id="{type}-check"
        name="{type}-check"
        class="IndvidualCheckbox Checkbox"
      />
      <label class="Label" for="{type}-check">{type}</label>
    </div>
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
    {#each rows as row, index}
      <Row
        {...row}
        request={data.requestById[row.id]}
        response={data.responseById[row.id]}
        {minTime}
        {rowHeight}
        {rowPadding}
        {index}
        {barOffset}
        {scaleFactor}
        onClick={(id) =>
          (selection = {
            request: data.requestById[id],
            response: data.responseById[id],
          })}
      />
    {/each}
  </svg>
</div>
{#if selection}
  <Modal on:close={() => (selection = null)}>
    <RequestInfo {...selection} />
  </Modal>
{/if}

<style>
  .Box {
    margin: 20px;
  }
  .Checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .Checkbox-wrapper:not(:first-child) {
    margin-top: 5px;
  }
  .Checkbox {
    width: 24px;
    height: 24px;
    cursor: pointer;
  }
  .Checkbox:checked ~ .Label {
    font-weight: bold;
  }
  .IndvidualCheckbox {
    accent-color: MediumSlateBlue;
  }
  .AllCheckbox {
    accent-color: fuchsia;
  }
  .Label {
    cursor: pointer;
    width: 100%;
  }
  .Content {
    grid-column: 1 / 3;
  }
</style>
