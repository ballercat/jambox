<script>
  export let onNavigation;
  export let path;
</script>

<div class="SideNav">
  <div class="Title">Jambox</div>
  <ul>
    <li>
      <a
        on:click={(e) => {
          e.preventDefault();
          onNavigation('/Waterfall');
        }}
        href="/Waterfall"
        data-cy-id="waterfall-link"
        class="SideNav-Link {path === '/Waterfall' ? 'selected' : ''}"
        >Waterfall</a
      >
    </li>
    <li>
      <a
        on:click={(e) => {
          e.preventDefault();
          onNavigation('/Cache');
        }}
        data-cy-id="cache-link"
        href="/Cache"
        class="SideNav-Link {path === '/Cache' ? 'selected' : ''}">Cache</a
      >
    </li>
  </ul>
</div>

<style>
  .Title {
    font-weight: bold;
    font-size: 20px;
    padding: 0 10px;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }
  li {
    margin: 5px;
    display: block;
    font-size: 18px;
  }

  .SideNav {
    text-decoration: none;
    border-right: 1px solid var(--magenta);
  }

  .SideNav-Link {
    text-decoration: none;
    color: inherit;
  }

  .SideNav-Link:hover {
    cursor: pointer;
  }

  .selected {
    color: var(--cerulean);
  }
</style>
