<script>
  export let row;
  export let col;
  export let onDelete;

  const value = row[col.key];
</script>

{#if col.key === 'delete'}
  <button
    data-cy-id="cache-delete"
    on:click={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(row.id);
    }}>Delete</button
  >
{:else}
  <span data-cy-id="cache-cell-{col.key}">{value}</span>
{/if}
