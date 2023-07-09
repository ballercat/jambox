<script>
  import { JSONEditor } from 'svelte-jsoneditor';

  export let cacheEntry;

  function onChange(prev, curr) {
    console.log(prev, curr);
  }
</script>

<div data-cy-id="cache-detail" class="Wrapper">
  <div class="Request">
    <div>Request</div>
    <JSONEditor
      content={{ json: cacheEntry.request }}
      readOnly
      mainMenuBar={false}
    />
  </div>
  <div>
    <div>Response</div>
    <JSONEditor content={{ json: cacheEntry.response }} {onChange} />
  </div>
</div>

<style>
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
