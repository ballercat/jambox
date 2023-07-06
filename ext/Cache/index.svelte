<script>
  import { onMount } from 'svelte';
  import SvelteTable from 'svelte-table';
  import Cell from './Cell.svelte';

  export let onSelection;
  export let api;

  let data = [];
  onMount(async () => {
    const result = await api.getCache();
    data = Object.entries(result).map(([id, { request, response }]) => {
      const url = new URL(request.url);
      return {
        id,
        host: url.hostname,
        path: request.path,
        method: request.method,
        statusCode: response?.statusCode,
        request,
        response,
      };
    });
  });

  const COLUMNS = [
    {
      key: 'id',
      title: 'ID',
      value: (v) => v.id,
      renderComponent: Cell,
    },
    {
      key: 'host',
      title: 'Host',
      value: (v) => v.host,
    },
    {
      key: 'path',
      title: 'Path',
      value: (v) => v.path,
    },
    {
      key: 'statusCode',
      title: 'Status',
      value: (v) => v.statusCode,
    },
  ];
</script>

<div>
  <SvelteTable
    columns={COLUMNS}
    rows={data}
    on:clickRow={(e) => onSelection(e.detail.row)}
    selectOnClick
  />
</div>

<style>
  :global(tr) {
    cursor: pointer;
  }
</style>
