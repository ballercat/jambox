/**
 * Check whether a value is a parseable URI string.
 *
 * @param {unknown} maybeURI - Value to test
 * @returns {boolean} `true` if `maybeURI` is a string that `new URL()` can parse
 */
const isURI = (maybeURI) => {
  if (typeof maybeURI !== 'string') {
    return false;
  }

  try {
    new URL(maybeURI);
  } catch (e) {
    return false;
  }

  return true;
};

export default isURI;
