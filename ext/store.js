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
      const url = new URL(payload.request.url);
      return {
        ...state,
        cache: {
          ...state.cache,
          [payload.id]: {
            ...payload,
            host: url.hostname,
            path: payload.request.path,
            method: payload.request.method,
            statusCode: payload.response?.statusCode,
          },
        },
      };
    }
    case 'cache.load': {
      for (const id in payload) {
        const { request, response } = payload[id];
        const url = new URL(request.url);
        payload[id] = {
          id,
          host: url.hostname,
          path: request.path,
          method: request.method,
          statusCode: response?.statusCode,
          request,
          response,
        };
      }
      return {
        ...state,
        cache: {
          ...state.cache,
          ...payload,
        },
      };
    }
    case 'cache.revert': {
      const { [payload.id]: omit, ...cache } = state.cache;
      return {
        ...state,
        cache,
      };
    }
    case 'cache.update': {
      const url = new URL(payload.request.url);
      return {
        ...state,
        cache: {
          ...state.cache,
          [payload.id]: {
            ...payload,
            host: url.hostname,
            path: payload.request.path,
            method: payload.request.method,
            statusCode: payload.response?.statusCode,
          },
        },
      };
    }
    default:
      return state;
  }
};

export const store = writable(initialState);

export const createActions = (api) => {
  return {
    cacheUpdate(id, { response }) {
      api.updateCache(id, { response });
    },
    cacheDelete(id) {},
  };
};
