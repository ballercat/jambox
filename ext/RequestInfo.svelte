<script>
  export let request;
  export let response;

  let url, reqHeaders, resHeaders;

  $: {
    url = new URL(request.url);
    ({ headers: reqHeaders } = request);
    ({ headers: resHeaders } = response || {});
  }
</script>

<div class="Wrapper">
  <ul>
    <li>
      <div>URL</div>
      <div>{url.toString()}</div>
    </li>
    {#if response?.statusCode}
      <li>
        <div>Status Code</div>
        <div>{response.statusCode}</div>
      </li>
    {/if}
    <li>
      <div>Cached</div>
      <div>{request.cached ? 'yes' : 'no'}</div>
    </li>
    <li>
      <div>Staged</div>
      <div>{request.staged ? 'yes' : 'no'}</div>
    </li>
  </ul>
</div>
<div>
  <span>Request Headers</span>
  <ul>
    {#each Object.entries(reqHeaders) as [key, value]}
      <li>
        <div>{key}</div>
        <div>{value}</div>
      </li>
    {/each}
  </ul>
</div>
{#if response}
  <span>Response Headers</span>
  <ul>
    {#each Object.entries(resHeaders) as [key, value]}
      <li>
        <div>{key}</div>
        <div>{value}</div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  ul {
    list-style-type: none;
    padding: 5px;
    border: 1px solid #aaa;
  }
  li {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  li:nth-child(odd) {
    background-color: #efefef;
  }
</style>
