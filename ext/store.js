import { writable } from 'svelte/store';

export const initialState = {
  config: {},
  requestById: {},
  responseById: {},
  abortedRequestById: {},
  blockNetwork: false,
  cache: {},
};

export const reducer = (state, action) => {
  const { type, payload } = action;
  console.log(action);
  switch (type) {
    case 'clear': {
      return {
        ...state,
        requestById: {},
        responseById: {},
      };
    }
    case 'config': {
      return {
        ...state,
        config: payload,
      };
    }
    case 'refresh': {
      return {
        ...state,
        requestById: {},
        responseById: {},
      };
    }
    case 'abort': {
      return {
        ...state,
        abortedRequestById: {
          ...state.abortedRequestById,
          [payload.id]: payload,
        },
      };
    }
    case 'request': {
      return {
        ...state,
        requestById: {
          ...state.requestById,
          [payload.id]: payload,
        },
      };
    }
    case 'response': {
      return {
        ...state,
        responseById: {
          ...state.responseById,
          [payload.id]: payload,
        },
      };
    }
    case 'cache.commit': {
      return {
        ...state,
        cache: {
          ...state.cache,
          [payload.request.id]: payload,
        },
      };
    }
    default:
      return state;
  }
};

export const store = writable(initialState);
