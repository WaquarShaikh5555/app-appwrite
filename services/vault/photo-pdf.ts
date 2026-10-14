import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { uriToBytes, type PickedAsset } from "./files";
import { imagesToPdf, type EmbeddableImage } from "./pdf";

/**
 * Photos → PDF, entirely on the device.
 *
 * Every picked photo is normalised to JPEG first (via expo-image-manipulator)
 * before it is embedded. That one step is what makes phone photos work: cameras
 * hand back HEIC, and pdf-lib can only embed JPEG and PNG. It also means the
 * image is downscaled and compressed on the way in, so a 20-photo PDF stays a
 * few megabytes instead of a hundred.
 *
 * Nothing is uploaded for the conversion — the finished PDF is the only thing
 * that ever leaves the device, and only when the caller chooses to save it.
 */

export interface PhotoPdfProgress {
  done: number;
  total: number;
  /** The photo currently being processed, for a status line. */
  name: string;
}

export async function buildPhotoPdf(params: {
  assets: PickedAsset[];
  /** Long-edge cap per photo. Keeps the output small. */
  maxEdge?: number;
  quality?: number;
  onProgress?: (progress: PhotoPdfProgress) => void;
}): Promise<Uint8Array> {
  const { assets, maxEdge = 2000, quality = 0.85 } = params;
  const total = assets.length;
  if (total === 0) {
    throw new Error("Pick at least one photo first.");
  }

  const images: EmbeddableImage[] = [];

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    params.onProgress?.({ done: index, total, name: asset.name });

    // Decode once so the real dimensions are known. Resizing by an assumed
    // axis is how you silently upscale every portrait photo in the batch
    // (or squash it) — so measure, then decide.
    const decoded = await ImageManipulator.manipulate(asset.uri).renderAsync();
    const longest = Math.max(decoded.width, decoded.height);

    let sized = decoded;
    if (longest > maxEdge) {
      // Cap the long edge; the short edge follows proportionally.
      const context = ImageManipulator.manipulate(decoded);
      sized = await (decoded.width >= decoded.height
        ? context.resize({ width: maxEdge })
        : context.resize({ height: maxEdge })
      ).renderAsync();
    }

    // Any input format (HEIC, WebP, …) leaves here as JPEG, which is the only
    // thing pdf-lib can embed besides PNG.
    const jpeg = await sized.saveAsync({
      compress: quality,
      format: SaveFormat.JPEG,
    });
    const bytes = await uriToBytes(jpeg.uri);

    images.push({ bytes, type: "jpg" });
    params.onProgress?.({ done: index + 1, total, name: asset.name });
  }

  return imagesToPdf(images, { fit: "page" });
}
