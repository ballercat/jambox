<script>
  import { Link } from 'svelte-routing';
  import Checkbox from '../Checkbox.svelte';

  export let row;
  export let col;
  export let onSelect;

  const shortenKeys = ['host', 'path'];
  const shorten = (str) => {
    if (str.length > 30) {
      return str.slice(0, 5) + ' ... ' + str.slice(-20);
    }

    return str;
  };
  let value, cyID;
  $: {
    const raw = row[col.key] ?? row.id;
    value = shortenKeys.includes(col.key) ? shorten(raw) : raw;
  }
  $: cyID = col.key === 'edit' ? `edit-${row.id}` : col.key;
</script>

<div class="Cell">
  {#if col.key === 'edit'}
    <Link to="/cache/entry/{row.id}" data-cy-id="cache-cell-{cyID}"
      >{`${value.slice(0, 15)}...`}</Link
    >
  {:else if col.key === 'select'}
    <Checkbox
      name="select-row-{row.id}"
      id="select-row-{row.id}"
      label=""
      checked={row.checked}
      onClick={(e) => onSelect(row.id, e.target.checked)}
    />
  {:else if col.key === 'persisted'}
    <span data-cy-id="cache-cell-persisted-{value}-{row.id}"
      >{value ? 'yes' : 'no'}</span
    >
  {:else}
    <span data-cy-id="cache-cell-{cyID}">{value}</span>
  {/if}
</div>

<style>
  .Cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
</style>
