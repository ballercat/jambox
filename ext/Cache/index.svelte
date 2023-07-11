<script>
  import SvelteTable from 'svelte-table';
  import Breadcrumb from './Breadcrumb.svelte';
  import Detail from './Detail.svelte';
  import Modal from '../Modal.svelte';
  import Cell from './Cell.svelte';

  export let api;
  export let cache;

  let search;
  let cacheEntry = null;
  let data;
  $: {
    data = Object.values(cache).reduce((acc, { id, request, response }) => {
      const url = new URL(request.url);
      const include =
        typeof search === 'string' && search.length
          ? JSON.stringify(response.body || '').includes(search)
          : true;
      if (!include) {
        return acc;
      }

      acc.push({
        id,
        host: url.hostname,
        path: request.path,
        method: request.method,
        statusCode: response?.statusCode,
        request,
        response,
      });

      return acc;
    }, []);
  }

  const onEdit = (id) => {
    cacheEntry = data.find((entry) => entry.id === id);
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
      searchValue: (row, searchTerm) => {
        return `${row.statusCode}`.includes(searchTerm);
      },
    },
  ];
</script>

<div class="Box">
  <div>
    <Breadcrumb {cacheEntry} onCacheClick={() => (cacheEntry = null)} />
  </div>
  <div>
    Search by response body: <input
      bind:value={search}
      placeholder="search json content"
    />
    <button disabled={!search} on:click={() => (search = '')}>Clear</button>
  </div>
  <div>
    Cache entries: {data.length}
  </div>
  <SvelteTable columns={COLUMNS} rows={data} classNameRow="Row" />
  {#if cacheEntry != null}
    <Modal on:close={() => (cacheEntry = null)}>
      <Detail
        {cacheEntry}
        {onDelete}
        onUpdateResponse={(response) => {
          api.updateCache(cacheEntry.id, { response });
        }}
      />
    </Modal>
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
