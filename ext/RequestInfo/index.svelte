<script>
  import Headers from './Headers.svelte';
  import { JsonView } from '@zerodevx/svelte-json-view';

  export let request;
  export let response;

  let currentTab = 'headers';
</script>

<div class="Wrapper" data-cy-id="request-info">
  <div>
    <button
      data-cy-id="select-headers-tab"
      on:click={() => {
        currentTab = 'headers';
      }}>Headers</button
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
  <div class="Content">
    {#if currentTab === 'headers'}
      <Headers {request} {response} />
    {/if}
    {#if currentTab === 'request'}
      <JsonView json={request.body || {}} />
    {/if}
    {#if currentTab === 'response'}
      {#if response}
        <JsonView json={response.body || {}} />
      {/if}
    {/if}
  </div>
</div>

<style>
  .Content {
    padding: 2px;
    margin-top: 10px;
  }
</style>
