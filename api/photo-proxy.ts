const PHOTO_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "randomuser.me",
];

export const PHOTO_PROXY_MAX_BYTES = 2 * 1024 * 1024;

export function isAllowedPhotoUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return false;
    }

    const host = url.hostname;

    return (
      PHOTO_HOSTS.includes(host) ||
      host.endsWith(".firebasestorage.app") ||
      host.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}
