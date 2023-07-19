<script>
  import { store, reducer } from '../store.js';
  import SvelteTable from 'svelte-table';
  import Cell from './Cell.svelte';

  // export let cache;

  let search = $store.filters.cache;
  let data = [];
  $: {
    data = Object.values($store.cache).filter(({ response }) => {
      return typeof search === 'string' && search.length
        ? JSON.stringify(response.body || '').includes(search)
        : true;
    });
  }

  const COLUMNS = [
    {
      key: 'edit',
      title: 'Edit',
      value: () => true,
      renderComponent: {
        component: Cell,
      },
    },
    {
      key: 'host',
      title: 'Host',
      value: (v) => v.host,
      renderComponent: {
        component: Cell,
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
      },
      searchValue: (row, searchTerm) => {
        return `${row.statusCode}`.includes(searchTerm);
      },
    },
  ];
</script>

<div class="Box">
  <div>
    Search by response body: <input
      bind:value={search}
      on:change={() =>
        store.update((state) =>
          reducer(state, { type: 'search.cache', payload: search })
        )}
      placeholder="search json content"
    />
    <button
      disabled={!search}
      on:click={() => {
        search = '';
        store.update((state) =>
          reducer(state, { type: 'search.cache', payload: search })
        );
      }}>Clear</button
    >
  </div>
  <div>
    Cache entries: {data.length}
  </div>
  <SvelteTable columns={COLUMNS} rows={data} classNameRow="Row" />
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
