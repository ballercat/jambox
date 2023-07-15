<script>
  import { createEventDispatcher, onDestroy } from 'svelte';

  export let title;

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');

  let modal;

  const handle_keydown = (e) => {
    if (e.key === 'Escape') {
      close();
      return;
    }

    if (e.key === 'Tab') {
      // trap focus
      const nodes = modal.querySelectorAll('*');
      const tabbable = Array.from(nodes).filter((n) => n.tabIndex >= 0);

      let index = tabbable.indexOf(document.activeElement);
      if (index === -1 && e.shiftKey) index = 0;

      index += tabbable.length + (e.shiftKey ? -1 : 1);
      index %= tabbable.length;

      tabbable[index].focus();
      e.preventDefault();
    }
  };

  const previously_focused =
    typeof document !== 'undefined' && document.activeElement;

  if (previously_focused) {
    onDestroy(() => {
      previously_focused.focus();
    });
  }
</script>

<svelte:window on:keydown={handle_keydown} />

<div
  data-cy-id="modal-background"
  class="Modal-Background"
  on:click={close}
  on:keydown={close}
/>

<div class="Modal" role="dialog" aria-modal="true" bind:this={modal}>
  <div class="Modal-Header">
    <h3>{title}</h3>
  </div>
  <div class="Modal-Content">
    <slot />
  </div>
</div>

<style>
  .Modal-Background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
  }

  .Modal {
    position: fixed;
    inset: 5%;
    border-radius: 0.2em;
    background: var(--backgroundColor);
  }

  .Modal-Content {
    width: 100%;
    height: 100%;
    padding: 1em;
    overflow: auto;
  }

  .Modal-Header {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--blue);
    color: var(--gc-yellow);
  }
</style>
