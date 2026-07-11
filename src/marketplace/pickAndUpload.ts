// Shared "pick an image from the gallery and upload it" flow used by the brand
// form (logo / cover) and the item form (photo). Returns the uploaded attachment
// (id + urls), or null if the user cancelled. Throws on permission denial or a
// failed upload so callers can surface an alert.
import * as ImagePicker from 'expo-image-picker';
import { mkApi, UploadedImage } from './api';

export async function pickAndUpload(
  token: string,
  aspect?: [number, number],
): Promise<UploadedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Izin akses galeri ditolak.');
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (res.canceled || !res.assets || res.assets.length === 0) {
    return null;
  }

  return mkApi.uploadImage(token, res.assets[0].uri);
}
