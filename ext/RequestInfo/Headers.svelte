<script>
  export let request;
  export let response;

  let url, reqHeaders, resHeaders;
  let currentTab = 'headers';

  $: {
    url = new URL(request.url);
    ({ headers: reqHeaders } = request);
    ({ headers: resHeaders } = response || {});
  }
</script>

<ul>
  <li>
    <div class="Columns">URL</div>
    <div class="Columns">{url.toString()}</div>
  </li>
  {#if response?.statusCode}
    <li>
      <div class="Columns">Status Code</div>
      <div class="Columns">{response.statusCode}</div>
    </li>
  {/if}
  <li>
    <div class="Columns">Cached</div>
    <div class="Columns">{request.cached ? 'yes' : 'no'}</div>
  </li>
  <li>
    <div class="Columns">Staged</div>
    <div class="Columns">{request.staged ? 'yes' : 'no'}</div>
  </li>
</ul>
<div class="Section">
  <h5>Request Headers</h5>
  <ul>
    {#each Object.entries(reqHeaders) as [key, value]}
      <li>
        <div class="Columns">{key}</div>
        <div class="Columns">{value}</div>
      </li>
    {/each}
  </ul>
</div>
{#if response}
  <div class="Section">
    <h5>Resonse Headers</h5>
    <ul>
      {#each Object.entries(resHeaders) as [key, value]}
        <li>
          <div class="Columns">{key}</div>
          <div class="Columns">{value}</div>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  ul {
    list-style-type: none;
    padding: 5px;
    border: 1px solid var(--borderColor);
  }
  li {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
  li:nth-child(odd) {
    background-color: var(--stripeA);
  }
  .Columns {
    padding: 2px;
    word-wrap: break-word;
    overflow: auto;
  }
  .Columns:nth-child(odd) {
    grid-column: 1;
  }
  .Columns:nth-child(even) {
    grid-column: 2 / 4;
  }
  .Section {
    padding: 2px;
  }
</style>
