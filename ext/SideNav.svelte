<script>
  import FaSortAmountDown from 'svelte-icons/fa/FaSortAmountDown.svelte';
  import FaDatabase from 'svelte-icons/fa/FaDatabase.svelte';
</script>

<div class="SideNav">
  <div class="Title">Jambox</div>
  <ul>
    <li>
      <a href="#" class="selected">
        <span class="icon"><FaSortAmountDown /></span>
      </a>
    </li>
    <li>
      <a href="#" class="selected">
        <span class="icon"><FaDatabase /></span>
      </a>
    </li>
  </ul>
</div>

<style>
  .Title {
    font-weight: bold;
    font-size: 20px;
    padding: 14px;
  }

  ul {
    list-style-type: none;
  }
  ul li a {
    display: block;
    border-bottom: 1px solid #10558d;
    color: rgb(241, 237, 237);
    font-size: 10px;
    position: relative;
  }

  .icon {
    width: 20px;
    height: 20px;
    display: inline-block;
  }

  .SideNav {
    background-color: var(--blue);
    color: #dee4ec;
    text-decoration: none;
  }
</style>
