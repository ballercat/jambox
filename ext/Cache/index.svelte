<script>
  import { store } from '../store.js';
  import SvelteTable from 'svelte-table';
  import Cell from './Cell.svelte';

  export let search;

  let data = [];
  $: {
    data = Object.values($store.cache).filter(({ request, response }) => {
      return typeof search === 'string' && search.length
        ? JSON.stringify({ response, request }).includes(search)
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
    },
    {
      key: 'pathname',
      title: 'Path',
      value: (v) => v.pathname,
      renderComponent: {
        component: Cell,
      },
    },
    {
      key: 'statusCode',
      title: 'Status',
      value: (v) => v.statusCode,
      renderComponent: {
        component: Cell,
      },
    },
  ];
</script>

<div class="Box">
  <div />
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
