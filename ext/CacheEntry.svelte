<script>
  import { without } from './nodash';
  import { JSONEditor } from 'svelte-jsoneditor';
  import { Link } from 'svelte-routing';
  import { store } from './store';

  export let api;
  export let history;
  export let id;
  let changes = null;
  let currentTab = 'details';

  const cacheEntry = $store.cache[id];
  let response, request, details;

  $: {
    response = cacheEntry.response;
    request = cacheEntry.request;
    details = without(['request', 'response'], cacheEntry);
  }

  function onChange(curr) {
    try {
      changes = curr.json || JSON.parse(curr.text);
    } catch (e) {
      // it's not guaranteed that if the user inputs text it's actually valid json
      changes = null;
    }
  }
</script>

<div data-cy-id="cache-detail" class="Wrapper">
  <Link data-cy-id="back-to-cache" to="/cache">Back</Link>
  <div class="Box">
    <button
      data-cy-id="select-details-tab"
      on:click={() => {
        currentTab = 'details';
      }}>Details</button
    >
    <button
      data-cy-id="select-request-tab"
      on:click={() => {
        currentTab = 'request';
      }}>Request</button
    >
    <button
      data-cy-id="select-response-tab"
      on:click={() => {
        currentTab = 'response';
      }}>Response</button
    >
  </div>
  {#if currentTab === 'details'}
    <JSONEditor content={{ json: details }} />
    <button
      data-cy-id="cache-delete"
      on:click={() => {
        history.navigate('/cache');
        api.delete([cacheEntry.id]);
      }}>Delete</button
    >
  {/if}
  {#if currentTab === 'request'}
    <div class="Request">
      <div>Request</div>
      <JSONEditor content={{ json: request }} />
    </div>
  {/if}
  {#if currentTab === 'response'}
    <div class="Box" data-cy-id="cache-response-edit">
      Response
      <button
        class="inline"
        disabled={changes === null}
        data-cy-id="update-response-btn"
        on:click={() => {
          api.updateCache(cacheEntry.id, { response: changes });
          changes = null;
        }}>Update</button
      >
    </div>
    <JSONEditor content={{ json: response }} {onChange} />
  {/if}
</div>

<style>
  .inline {
    display: inline;
  }
  .Wrapper {
    display: flex;
    flex-direction: column;
    margin-top: 10px;
    width: 100%;
  }
  .Request {
    margin-bottom: 20px;
  }
  .Box {
    margin: 10px 0;
  }
</style>
