<script>
  import { JSONEditor } from 'svelte-jsoneditor';

  export let cacheEntry;
  export let onDelete;
  export let onUpdateResponse;
  let changes = null;

  function onChange(prev, curr) {
    changes = curr.json;
  }
</script>

<div data-cy-id="cache-detail" class="Wrapper">
  <button data-cy-id="cache-delete" on:click={() => onDelete(cacheEntry.id)}
    >Delete</button
  >
  <div class="Request">
    <div>Request</div>
    <JSONEditor
      content={{ json: cacheEntry.request }}
      readOnly
      mainMenuBar={false}
    />
  </div>
  <div>
    <div>
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
  </div>
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
</style>
