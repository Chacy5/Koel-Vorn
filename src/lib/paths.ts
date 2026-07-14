export const withBase = (path: string) => {
  if (!path.startsWith('/')) return path;
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return `${base}${path.slice(1)}`;
};
