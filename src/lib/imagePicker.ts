// Cross-platform image picker for profile photos. On Capacitor uses the
// native @capacitor/camera plugin (Gallery + Camera). On the web falls back
// to a hidden <input type="file"> with `capture` for camera access.

import { isNative } from "@/lib/native";

export type PickerSource = "gallery" | "camera";

export interface PickedImage {
  blob: Blob;
  mimeType: string;
  extension: string;
}

async function pickWithFileInput(source: PickerSource): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.setAttribute("capture", "environment");
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      resolve({ blob: file, mimeType: file.type || "image/jpeg", extension: ext });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function pickProfileImage(source: PickerSource): Promise<PickedImage | null> {
  if (!isNative()) return pickWithFileInput(source);
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: true,
      resultType: CameraResultType.Base64,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      correctOrientation: true,
      width: 512,
      height: 512,
    });
    if (!photo.base64String) return null;
    const mime = `image/${(photo.format || "jpeg").toLowerCase()}`;
    const bytes = base64ToBytes(photo.base64String);
    return {
      blob: new Blob([bytes.buffer as ArrayBuffer], { type: mime }),
      mimeType: mime,
      extension: (photo.format || "jpg").toLowerCase(),
    };
  } catch (err) {
    console.warn("[imagePicker] native picker failed", err);
    return pickWithFileInput(source);
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
