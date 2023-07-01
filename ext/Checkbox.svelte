<script>
  export let id;
  export let name;
  export let label;
  export let checked;
  export let onClick;
  export let inline = false;
  export let variation = 'primary';

  const cx = {
    inline: { true: 'Inline', false: '' },
    primary: 'Primary',
    secondary: 'Secondary',
  };
</script>

<div class={`Checkbox ${cx.inline[inline]}`}>
  <input
    on:click={onClick}
    {checked}
    type="checkbox"
    {id}
    name={id}
    class={`${cx[variation]} Checkbox`}
  />
  <label class="Label" for={name}>{label}</label>
</div>

<style>
  .Checkbox {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .Inline {
    display: inline-flex;
  }
  .Checkbox-wrapper:not(:first-child) {
    margin-top: 2px;
  }
  .Checkbox {
    height: 20px;
    cursor: pointer;
  }
  .Checkbox:checked ~ .Label {
    font-weight: bold;
  }
  .Primary {
    accent-color: var(--cerulean);
  }
  .Secondary {
    accent-color: var(--magenta);
  }
  .Label {
    cursor: pointer;
    width: 100%;
  }
  .Content {
    grid-column: 1 / 3;
  }
</style>
