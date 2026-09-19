/**
 * The path an uploaded staff photo is served from.
 *
 * Its own module, with no imports, because three places need to agree on this
 * shape and they cannot all reach for the same one otherwise: the route that
 * serves the bytes, the service that stores them, and the Zod schema that
 * validates a `photo` field. The schema is reachable from a client component,
 * so it must not import anything that pulls Prisma into the browser bundle.
 */

export const TEAM_PHOTO_BASE = "/api/team-photo";

/** The public path for a stored photo. */
export function teamPhotoUrl(id: string): string {
  return `${TEAM_PHOTO_BASE}/${id}`;
}

/**
 * Recognises a served-photo path.
 *
 * Anchored, and the id character class is deliberately narrow — this value is
 * accepted from a form and rendered into an `src`, so nothing that could carry
 * a path traversal or a scheme belongs in it.
 */
export const TEAM_PHOTO_URL_PATTERN = /^\/api\/team-photo\/[A-Za-z0-9_-]{1,64}$/;

/** The stored id from a served-photo path, or null if it is not one. */
export function teamPhotoIdFromUrl(url: string | null | undefined): string | null {
  if (!url || !TEAM_PHOTO_URL_PATTERN.test(url)) return null;
  return url.slice(TEAM_PHOTO_BASE.length + 1);
}
