/**
 * Base URL for the Python AI assistant backend (api.py).
 * Set ASSIST_API_URL in .env to your local or deployed Python server.
 * Falls back to BACKEND_API_URL if not set.
 */
export function assistApiUrl(): string {
  const url = process.env.ASSIST_API_URL || process.env.BACKEND_API_URL
  if (!url) throw new Error('ASSIST_API_URL (or BACKEND_API_URL) is not configured')
  // Strip trailing slash so callers can safely append paths
  return url.replace(/\/$/, '')
}
