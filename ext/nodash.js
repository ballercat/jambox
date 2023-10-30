export const without = (skip, obj) => {
  const result = {};
  for (const key in obj) {
    if (!skip.includes(key)) {
      result[key] = obj[key];
    }
  }

  return result;
};

export const debounce = (fn, ms) => {
  let timeout;

  return (...args) => {
    if (timeout) {
      return;
    }

    timeout = setTimeout(() => {
      fn(...args);
      timeout = null;
    }, ms);
  };
};
