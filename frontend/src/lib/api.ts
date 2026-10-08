/*
|--------------------------------------------------------------------------
| SBC API CLIENT
|--------------------------------------------------------------------------
|
| The SBC backend is a separate Express service (deployed on Render).
| Every call that used to hit a Next.js route handler at "/api/..." now
| goes through this module.
|
| Configure the base URL with NEXT_PUBLIC_API_BASE_URL, e.g.
|
|   local    -> http://localhost:8080
|   produced -> https://sbc-backend.onrender.com
|
| If the variable is not set we fall back to a same-origin relative call so
| local experiments keep working instead of hitting "undefined/api/...".
|
*/

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

/**
 * Base URL without a trailing slash.
 */
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

/**
 * Build an absolute backend URL from an API path.
 *
 * apiUrl("/api/payout/history")
 *   -> "https://sbc-backend.onrender.com/api/payout/history"
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Drop-in replacement for `fetch("/api/...")`.
 *
 * Behaves exactly like fetch, but resolves the path against the SBC
 * backend base URL. Auth stays header-based (Firebase ID token in the
 * Authorization header), so no cookies and no credentials are needed.
 */
export function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(apiUrl(path), init);
}
