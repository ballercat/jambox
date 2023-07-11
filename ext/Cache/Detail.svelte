<script>
  import { JSONEditor } from 'svelte-jsoneditor';

  export let cacheEntry;
  export let onDelete;
  export let onUpdateResponse;
  let changes = null;
  let currentTab = 'details';

  const { response, request, ...details } = cacheEntry;

  function onChange(prev, curr) {
    changes = curr.json;
  }
</script>

<div data-cy-id="cache-detail" class="Wrapper">
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
    <button data-cy-id="cache-delete" on:click={() => onDelete(cacheEntry.id)}
      >Delete</button
    >
  {/if}
  {#if currentTab === 'request'}
    <div class="Request">
      <div>Request</div>
      <JSONEditor content={{ json: cacheEntry.request }} />
    </div>
  {/if}
  {#if currentTab === 'response'}
    <div class="Box">
      Response
      <button
        class="inline"
        disabled={changes === null}
        on:click={() => {
          onUpdateResponse(changes);
          changes = null;
        }}>Update (not yet implemented)</button
      >
    </div>
    <JSONEditor content={{ json: cacheEntry.response }} {onChange} />
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
    height: 50%;
  }
  .Box {
    margin: 10px 0;
  }
</style>
