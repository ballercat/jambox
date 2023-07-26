<script>
  import { store } from '../store.js';
  import SvelteTable from 'svelte-table';
  import Checkbox from '../Checkbox.svelte';
  import Cell from './Cell.svelte';

  export let api;
  export let search;

  let checked = [];
  let data = [];
  $: {
    data = Object.values($store.cache).reduce((acc, value) => {
      if (typeof search === 'string' && search.length) {
        if (
          !JSON.stringify({
            response: value.response,
            request: value.request,
          }).includes(search)
        ) {
          return acc;
        }
      }

      acc.push({
        ...value,
        checked: checked.includes(value.id),
      });

      return acc;
    }, []);
  }

  const onSelect = (id, toggle) => {
    if (toggle) {
      checked = [...checked, id];
    } else {
      checked = checked.filter((checkedID) => checkedID !== id);
    }
  };

  const COLUMNS = [
    {
      key: 'select',
      title: 'Select',
      value: ({ id }) => checked.includes(id),
      renderComponent: {
        component: Cell,
        props: {
          onSelect,
        },
      },
    },
    {
      key: 'edit',
      title: 'Edit',
      value: () => true,
      renderComponent: {
        component: Cell,
        props: {
          onSelect,
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
          onSelect,
        },
      },
    },
    {
      key: 'pathname',
      title: 'Path',
      value: (v) => v.pathname,
      renderComponent: {
        component: Cell,
        props: {
          onSelect,
        },
      },
    },
    {
      key: 'statusCode',
      title: 'Status',
      value: (v) => v.statusCode,
      renderComponent: {
        component: Cell,
        props: {
          onSelect,
        },
      },
    },
  ];
</script>

<div class="Box">
  <div />
  <div>
    Cache entries: {data.length}
  </div>
  <button
    disabled={checked.length === 0}
    on:click={() => {
      api.delete(checked);
      checked = [];
    }}>Delete Selected</button
  >
  <SvelteTable columns={COLUMNS} rows={data} classNameRow="Row">
    <tr slot="header">
      <th
        ><Checkbox
          label=""
          checked={checked.length > 0}
          id="select-all"
          name="select-all"
          onClick={() => {
            if (checked.length) {
              checked = [];
              return;
            }
            checked = data.map(({ id }) => {
              return id;
            });
          }}
        />
      </th>
      <th>Edit</th>
      <th>Host</th>
      <th>Path</th>
      <th>Status</th>
    </tr>
  </SvelteTable>
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
