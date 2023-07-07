<script>
  import SvelteTable from 'svelte-table';
  import Breadcrumb from './Breadcrumb.svelte';
  import Detail from './Detail.svelte';
  import Cell from './Cell.svelte';

  export let api;
  export let cache;

  let cacheEntry = null;
  let data;
  $: data = Object.values(cache).map(({ id, request, response }) => {
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

  const onDelete = (id) => {
    api.delete(id);
  };

  const COLUMNS = [
    {
      key: 'host',
      title: 'Host',
      value: (v) => v.host,
      renderComponent: Cell,
      searchValue: (row, searchTerm) => {
        return row.host.toLowerCase().includes(searchTerm);
      },
    },
    {
      key: 'path',
      title: 'Path',
      value: (v) => v.path,
      renderComponent: Cell,
      searchValue: (row, searchTerm) => {
        return row.path.toLowerCase().includes(searchTerm);
      },
    },
    {
      key: 'statusCode',
      title: 'Status',
      value: (v) => v.statusCode,
      renderComponent: Cell,
    },
    {
      key: 'delete',
      title: 'Delete',
      value: () => true,
      renderComponent: {
        component: Cell,
        props: {
          onDelete,
        },
      },
    },
  ];
</script>

<div class="Box">
  <div>
    <Breadcrumb {cacheEntry} onCacheClick={() => (cacheEntry = null)} />
  </div>
  {#if cacheEntry === null}
    <SvelteTable
      columns={COLUMNS}
      rows={data}
      on:clickRow={(e) => (cacheEntry = e.detail.row)}
      selectOnClick
    />
  {:else}
    <Detail {cacheEntry} />
  {/if}
</div>

<style>
  :global(tr) {
    cursor: pointer;
  }
  .Box {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
</style>
