<script>
  import RequestInfo from '../RequestInfo';

  export let cacheEntry;
</script>

<div class="Wrapper">
  <RequestInfo {...cacheEntry} />
</div>

<style>
  .Wrapper {
    display: flex;
    flex-direction: column;
    margin-top: 10px;
  }
</style>
