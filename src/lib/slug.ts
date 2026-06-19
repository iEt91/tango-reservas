export function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function isSlugAvailable(slug: string, existingSlugs: string[]) {
  return !existingSlugs.includes(slug);
}

export function createUniqueSlug(
  baseValue: string,
  existingSlugs: string[],
  suffixStart = 2,
) {
  const baseSlug = createSlug(baseValue);

  if (!baseSlug) {
    return `negocio-${Date.now()}`;
  }

  if (isSlugAvailable(baseSlug, existingSlugs)) {
    return baseSlug;
  }

  let counter = suffixStart;
  let candidate = `${baseSlug}-${counter}`;

  while (!isSlugAvailable(candidate, existingSlugs)) {
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
}
