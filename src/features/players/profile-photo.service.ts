import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { updateUserPhotoURL } from "@/features/auth/auth.service";
import { storage } from "@/lib/firebase";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function getProfilePhotoError(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return "Image must be under 2 MB.";
  }

  return "";
}

export async function uploadProfilePhoto(
  userId: string,
  file: File,
): Promise<string> {
  const error = getProfilePhotoError(file);

  if (error) {
    throw new Error(error);
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const photoRef = ref(storage, `profile-photos/${userId}/avatar.${extension}`);

  await uploadBytes(photoRef, file, { contentType: file.type });
  const photoURL = await getDownloadURL(photoRef);
  await updateUserPhotoURL(userId, photoURL);

  return photoURL;
}
