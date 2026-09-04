// @ts-nocheck
import { Buffer } from 'buffer';
import { encodeBuffer } from 'http-encoding';

/**
 * Encode a response body into a compressed Buffer, matching the
 * `content-encoding` header of the response.
 *
 * If the body is an object it is JSON-stringified before encoding.
 * If there is no `content-encoding` header the raw buffer is returned.
 *
 * @param {object|string} body    - Response body to encode
 * @param {object}        headers - HTTP headers (used to read `content-encoding`)
 * @returns {Promise<Buffer>} Encoded body buffer
 */
export const encodeBodyBuffer = (body, headers) => {
  let buffer;
  if (body != null && typeof body === 'object') {
    buffer = Buffer.from(JSON.stringify(body));
  } else {
    buffer = Buffer.from(body);
  }

  if (!headers['content-encoding']) {
    return buffer;
  }

  return encodeBuffer(buffer, headers['content-encoding'], { level: 1 });
};

/**
 * Merge a previous cached response with partial updates from `curr`.
 *
 * The `body` of `curr` is re-encoded using {@link encodeBodyBuffer} so the
 * internal buffer representation stays consistent. The `content-length`
 * header is updated automatically if it was present in the original response.
 *
 * @param {object} prev - Original cached response object
 * @param {object} curr - Partial update containing `body` and `headers`
 * @returns {Promise<object>} Updated response object ready to store in cache
 */
export const updateResponse = async (prev, curr) => {
  // New body arrives a primitive instead of a buffer and needs to be patched
  // to fit into the internal representation
  const { body, headers, ...rest } = curr;

  const buffer = await encodeBodyBuffer(body, headers);
  const result = {
    ...prev,
    headers,
    ...rest,
  };

  result.body.buffer = buffer;

  // Update the final buffer and content length
  if ('content-length' in result.headers) {
    result.headers['content-length'] = buffer.length;
  }

  return result;
};
