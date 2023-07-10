<script>
  export let row;
  export let col;
  export let onEdit;

  let value, cyID;
  $: value = row[col.key];
  $: cyID = col.key === 'edit' ? `edit-${row.id}` : col.key;
</script>

<div class="Cell">
  {#if col.key === 'edit'}
    <button
      inline
      data-cy-id="cache-cell-{cyID}"
      on:click={() => {
        onEdit(row.id);
      }}>Edit</button
    >
  {:else}
    <span data-cy-id="cache-cell-{cyID}">{value}</span>
  {/if}
</div>

<style>
  .Cell {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
