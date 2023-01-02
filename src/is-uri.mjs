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
