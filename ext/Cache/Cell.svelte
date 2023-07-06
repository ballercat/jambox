<script>
  export let row;
  export let col;

  console.log(row, col);
  const value = row[col.key];
</script>

<span data-cy-id="cache-{col.key}">{value}</span>
