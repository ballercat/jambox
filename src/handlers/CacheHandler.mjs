// @ts-check
import mockttp from 'mockttp';
import Cache from '../Cache.mjs';

export default class CacheHandler extends mockttp.requestHandlers
  .CallbackHandler {
  /**
   * Empty cache response
   */
  static NO_CACHE_RESULT = {
    statusCode: 404,
    statusMessage: 'No cached result found',
    json: {
      errors: [
        'This request was matched, but no previous response found in cache.',
      ],
    },
  };

  /**
   * @param {import('../Jambox.mjs').default} jambox
   */
  constructor(jambox) {
    const callback = async (completedRequest) => {
      try {
        const hash = await Cache.hash(completedRequest);
        if (!jambox.cache.has(hash)) {
          return CacheHandler.NO_CACHE_RESULT;
        }
        const { response } = jambox.cache.get(hash);
        return {
          headers: {
            ...response.headers,
            'x-jambox-hash': hash,
          },
          json: response.json,
          rawBody: response.body.buffer,
          status: response.status,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
        };
      } catch (e) {
        return {
          statusCode: 500,
          statusMessage: 'Internal jambox error',
          json: {
            errors: [
              'CacheHandler encountered an error',
              `${e.message} ${e.stack}`,
            ],
          },
        };
      }
    };

    super(callback);
  }
  explain() {
    return `CacheHandler return a response from cache`;
  }
}
