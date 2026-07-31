const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const siteBasePath =
  configuredBasePath === "/"
    ? ""
    : configuredBasePath.replace(/\/+$/, "");

export function sitePath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteBasePath}${normalizedPath}`;
}
