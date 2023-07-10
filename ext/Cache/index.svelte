<script>
  import SvelteTable from 'svelte-table';
  import Breadcrumb from './Breadcrumb.svelte';
  import Detail from './Detail.svelte';
  import Cell from './Cell.svelte';
  import Checkbox from '../Checkbox.svelte';

  export let api;
  export let cache;

  let cacheEntry = null;
  let data;
  $: {
    data = Object.values(cache).map(({ id, request, response }) => {
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
  }

  const onEdit = (id) => {
    cacheEntry = cache[id];
  };
  const onDelete = (id) => {
    cacheEntry = null;
    api.delete([id]);
  };

  const COLUMNS = [
    {
      key: 'edit',
      title: 'Edit',
      value: () => true,
      renderComponent: {
        component: Cell,
        props: {
          onEdit,
        },
      },
    },
    {
      key: 'host',
      title: 'Host',
      value: (v) => v.host,
      renderComponent: {
        component: Cell,
        props: {
          onEdit,
        },
      },
      searchValue: (row, searchTerm) => {
        return row.host.toLowerCase().includes(searchTerm);
      },
    },
    {
      key: 'path',
      title: 'Path',
      value: (v) => v.path,
      renderComponent: {
        component: Cell,
        props: {
          onEdit,
        },
      },
      searchValue: (row, searchTerm) => {
        return row.path.toLowerCase().includes(searchTerm);
      },
    },
    {
      key: 'statusCode',
      title: 'Status',
      value: (v) => v.statusCode,
      renderComponent: {
        component: Cell,
        props: {
          onEdit,
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
    <SvelteTable columns={COLUMNS} rows={data} classNameRow="Row" />
  {:else}
    <Detail {cacheEntry} {onDelete} />
  {/if}
</div>

<style>
  .Box {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  :global(.Row:hover) {
    cursor: pointer;
    background-color: var(--gc-yellow);
  }
</style>
