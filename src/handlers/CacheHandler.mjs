// @ts-nocheck
import mockttp from 'mockttp';
import Cache from '../Cache.mjs';

/**
 * Request handler that serves responses from the in-memory cache.
 *
 * When a request matches the {@link CacheMatcher}, this handler is invoked.
 * It looks up the request hash in the cache and returns the stored response,
 * or a 404 if no cached entry is found.
 *
 * @extends {mockttp.requestHandlers.CallbackHandler}
 */
export default class CacheHandler
  extends mockttp.requestHandlers.CallbackHandler
{
  /**
   * Response returned when no cached entry is found for the request.
   *
   * @type {{ statusCode: number, statusMessage: string, json: object }}
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
   * Creates a new CacheHandler.
   *
   * @param {import('../Jambox.mjs').default} jambox - The active Jambox instance
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

  /**
   * Returns a human-readable description of what this handler does.
   *
   * @returns {string}
   */
  explain() {
    return `CacheHandler return a response from cache`;
  }
}
