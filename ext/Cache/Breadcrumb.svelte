<script>
  /**
   * A very basic Breadcrumb
   */
  export let cacheEntry;
  export let onCacheClick;
</script>

<ul>
  <li>
    {#if cacheEntry != null}
      <a
        data-cy-id="cache-breadcrumb-link"
        href="/Cache"
        on:click={(e) => {
          e.preventDefault();
          onCacheClick();
        }}>Cache</a
      >
    {:else}
      <li>Cache</li>
    {/if}
  </li>
  <li><div class="split">/</div></li>
  {#if cacheEntry != null}
    <li>{cacheEntry.id}</li>
  {/if}
</ul>

<style>
  ul {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    flex: 0 1 auto;
    list-style-type: none;
    margin: 0;
    padding: 0 5px;
  }

  li {
    align-items: center;
    display: inline-flex;
    font-size: 14px;
  }

  ul > :last-child {
    color: var(--gc-cerulean);
  }

  .split {
    padding: 0 4px 0 2px;
  }
</style>
