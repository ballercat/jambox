export const without = (skip, obj) => {
  const result = {};
  for (const key in obj) {
    if (!skip.includes(key)) {
      result[key] = obj[key];
    }
  }

  return result;
};
