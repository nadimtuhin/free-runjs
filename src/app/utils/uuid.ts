/**
 * Generates a cryptographically secure UUID v4 string.
 * Falls back to a timestamp-based string if crypto.randomUUID() is not available.
 * @returns {string} A UUID v4 string
 */
export function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch (error) {
    // Fallback for environments where crypto.randomUUID() is not available
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }
}
