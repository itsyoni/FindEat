import * as MediaLibrary from "expo-media-library";

export class MediaLibraryPermissionError extends Error {
  constructor() {
    super("Media library permission was not granted");
    this.name = "MediaLibraryPermissionError";
  }
}

export async function saveImageToGallery(uri: string) {
  let permission = await MediaLibrary.getPermissionsAsync(true, ["photo"]);
  if (!permission.granted) {
    permission = await MediaLibrary.requestPermissionsAsync(true, ["photo"]);
  }
  if (!permission.granted) throw new MediaLibraryPermissionError();

  await MediaLibrary.Asset.create(uri);
}

export async function saveVideoToGallery(uri: string) {
  let permission = await MediaLibrary.getPermissionsAsync(true, ["video"]);
  if (!permission.granted) {
    permission = await MediaLibrary.requestPermissionsAsync(true, ["video"]);
  }
  if (!permission.granted) throw new MediaLibraryPermissionError();

  await MediaLibrary.Asset.create(uri);
}
