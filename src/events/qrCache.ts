// Caches QR PNGs fetched from organizer-app to local device storage, keyed
// by qrToken, so a registered offline/hybrid event's QR stays viewable at
// check-in with no or poor signal — matching the reliability of a saved
// confirmation-email screenshot.
import * as FileSystem from 'expo-file-system/legacy';

function cachePathFor(qrToken: string): string {
  return `${FileSystem.cacheDirectory}qr-${qrToken}.png`;
}

// Returns a local file:// URI for the given QR, downloading + caching it on
// first call. Subsequent calls for the same token reuse the cached file
// without a network request.
export async function getCachedQrUri(qrToken: string, remoteUrl: string): Promise<string> {
  const localPath = cachePathFor(qrToken);
  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) {
    return localPath;
  }
  const result = await FileSystem.downloadAsync(remoteUrl, localPath);
  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new Error(`QR download failed: HTTP ${result.status}`);
  }
  return result.uri;
}
