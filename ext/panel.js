import App from './App.svelte';
import API from './Api.js';

const boot = async () => {
  const api = await API.create();
  return new App({
    target: document.body,
    props: {
      api,
    },
  });
};

boot();
