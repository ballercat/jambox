// @ts-check
import { Buffer } from 'buffer';
import { encodeBuffer } from 'http-encoding';

/**
 * @param body    {object|string}  Body
 * @param headers {Headers} Headers
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
 * @param prev {object} Previous response
 * @param curr {object} Current response
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

  // Update the final buffer and content length
  result.body.buffer = buffer;
  result.headers['content-length'] = buffer.length;

  return result;
};
