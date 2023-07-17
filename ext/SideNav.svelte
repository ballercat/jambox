<script>
  import { Link } from 'svelte-routing';
</script>

<div class="SideNav">
  <div class="Title">Jambox</div>
  <ul>
    <li>
      <Link to="/" data-cy-id="waterfall-link" class="SideNav-Link"
        >Waterfall</Link
      >
    </li>
    <li>
      <Link data-cy-id="cache-link" to="/cache" class="SideNav-Link">Cache</Link
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
</style>
