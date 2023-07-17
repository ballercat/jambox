<script>
  import { Link } from 'svelte-routing';
  export let row;
  export let col;

  const shorten = (str) => {
    if (str.length > 30) {
      return str.slice(0, 15) + ' ... ' + str.slice(-10);
    }

    return str;
  };
  let value, cyID;
  $: value =
    col.key === 'host' || col.key === 'path'
      ? shorten(row[col.key])
      : row[col.key];
  $: cyID = col.key === 'edit' ? `edit-${row.id}` : col.key;
</script>

<div class="Cell">
  {#if col.key === 'edit'}
    <Link to="/cache/entry/{row.id}" data-cy-id="cache-cell-{cyID}"
      >{row.id}</Link
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
