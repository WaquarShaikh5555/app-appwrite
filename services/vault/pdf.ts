import { degrees, PDFDocument } from "pdf-lib";
import type { VaultFileRow } from "@/types/vault";

/**
 * PDF operations, all local.
 *
 * pdf-lib is pure JavaScript, so the same code runs in the browser and on the
 * device: pages can be rotated, reordered, removed, extracted and merged. It
 * cannot rasterise a page (turn it into an image) — that needs a renderer,
 * which is deliberately not bundled. See docs/VAULT.md for the options.
 */

export interface PageInfo {
  index: number;
  /** Clockwise rotation in degrees, normalised to 0 / 90 / 180 / 270. */
  rotation: number;
  width: number;
  height: number;
}

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

export function describePages(document: PDFDocument): PageInfo[] {
  return document.getPages().map((page, index) => {
    const size = page.getSize();
    const angle = page.getRotation().angle ?? 0;
    return {
      index,
      rotation: ((angle % 360) + 360) % 360,
      width: Math.round(size.width),
      height: Math.round(size.height),
    };
  });
}

/** Rotate one page by ±90° (clockwise positive), the way a person expects. */
export function rotatePage(document: PDFDocument, index: number, delta: number): void {
  const pages = document.getPages();
  if (index < 0 || index >= pages.length) return;
  const page = pages[index];
  const current = page.getRotation().angle ?? 0;
  page.setRotation(degrees(((current + delta) % 360 + 360) % 360));
}

export function deletePage(document: PDFDocument, index: number): boolean {
  if (document.getPageCount() <= 1) return false; // never produce an empty PDF
  document.removePage(index);
  return true;
}

/** Move a page one slot towards the front of the document. */
export function movePageEarlier(document: PDFDocument, index: number): boolean {
  if (index <= 0) return false;
  const pages = document.getPages();
  const [page] = pages.splice(index, 1);
  pages.splice(index - 1, 0, page);
  return true;
}

/** Move a page one slot towards the back of the document. */
export function movePageLater(document: PDFDocument, index: number): boolean {
  if (index >= document.getPageCount() - 1) return false;
  const pages = document.getPages();
  const [page] = pages.splice(index, 1);
  pages.splice(index + 1, 0, page);
  return true;
}

/** Keep only the listed pages (1-based numbers as shown to the user). */
export function extractPages(document: PDFDocument, keep: number[]): Promise<PDFDocument> {
  return PDFDocument.create().then(async (fresh) => {
    const indexes = keep
      .map((n) => n - 1)
      .filter((i) => i >= 0 && i < document.getPageCount());
    const copied = await fresh.copyPages(document, indexes);
    copied.forEach((page) => fresh.addPage(page));
    return fresh;
  });
}

/** Append every page of another PDF — the "merge" operation. */
export async function mergePdfInto(
  base: PDFDocument,
  otherBytes: Uint8Array,
): Promise<number> {
  const other = await PDFDocument.load(otherBytes, { ignoreEncryption: true });
  const copied = await base.copyPages(other, other.getPageIndices());
  copied.forEach((page) => base.addPage(page));
  return copied.length;
}

export type EmbeddableImage = { bytes: Uint8Array; type: "jpg" | "png" };

/** A4 in points — the frame photos are fitted into. */
const A4 = { width: 595.28, height: 841.89 };
const PHOTO_MARGIN = 22;

/**
 * Build a PDF from images, one per page.
 *
 * `fit: "page"` centres each photo on an A4 page (what people expect from a
 * scanned document); `fit: "image"` makes each page exactly the photo's size,
 * which is what you want for a photo album. pdf-lib can only embed JPEG and
 * PNG — callers normalise everything else to JPEG first.
 */
export async function imagesToPdf(
  images: EmbeddableImage[],
  options: { fit?: "page" | "image" } = {},
): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new Error("There are no images to put in a PDF.");
  }

  const document = await PDFDocument.create();
  const fit = options.fit ?? "page";
  document.setProducer("Eternalz");
  document.setCreator("Eternalz Document Manager");

  for (const image of images) {
    const embedded =
      image.type === "png"
        ? await document.embedPng(image.bytes)
        : await document.embedJpg(image.bytes);

    if (fit === "image") {
      const page = document.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: embedded.width,
        height: embedded.height,
      });
      continue;
    }

    const page = document.addPage([A4.width, A4.height]);
    const maxWidth = A4.width - PHOTO_MARGIN * 2;
    const maxHeight = A4.height - PHOTO_MARGIN * 2;
    const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height, 1);
    const width = embedded.width * scale;
    const height = embedded.height * scale;
    page.drawImage(embedded, {
      x: (A4.width - width) / 2,
      y: (A4.height - height) / 2,
      width,
      height,
    });
  }

  return document.save({ useObjectStreams: false });
}

/** A dated, human filename that won't collide with an earlier batch. */
export function photosPdfName(date: Date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  const time = date.toISOString().slice(11, 16).replace(":", "");
  return `Photos-${stamp}-${time}.pdf`;
}

export async function savePdf(document: PDFDocument): Promise<Uint8Array> {
  return document.save({ useObjectStreams: false });
}

/** A filename that reflects what was done, without clobbering the original. */
export function editedPdfName(original: string, suffix: string): string {
  const base = original.replace(/\.[^.]+$/, "");
  return `${base}-${suffix}.pdf`;
}

/** Friendly summary of an edit set, used in the save card. */
export function describeEdits(params: {
  rotations: number;
  deleted: number;
  moved: number;
  mergedPages: number;
}): string[] {
  const lines: string[] = [];
  if (params.rotations) {
    lines.push(`Rotated ${params.rotations} page${params.rotations === 1 ? "" : "s"}`);
  }
  if (params.deleted) {
    lines.push(`Removed ${params.deleted} page${params.deleted === 1 ? "" : "s"}`);
  }
  if (params.moved) {
    lines.push(`Reordered ${params.moved} page${params.moved === 1 ? "" : "s"}`);
  }
  if (params.mergedPages) {
    lines.push(
      `Merged in ${params.mergedPages} page${params.mergedPages === 1 ? "" : "s"} from another PDF`,
    );
  }
  return lines;
}

export type { VaultFileRow };
