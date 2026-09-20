/**
 * Utility functions for handling Cloudinary URLs, document previews, and forced file downloads.
 */

/**
 * Returns a clean viewable URL by removing any attachment flags that force download.
 */
export function getCleanViewUrl(url: string): string {
  if (!url) return url;
  if (!url.includes("res.cloudinary.com")) return url;

  // Remove existing fl_attachment or fl_inline flags if present to avoid duplicating flags
  let clean = url.replace(/\/(fl_attachment|fl_inline)[^/]*\//g, "/");
  clean = clean.replace(/([^:]\/)\/+/g, "$1");

  // Inject fl_inline flag to force Cloudinary to deliver with Content-Disposition: inline header
  if (clean.includes("/upload/")) {
    clean = clean.replace("/upload/", "/upload/fl_inline/");
  }

  return clean;
}

/**
 * Returns a Cloudinary URL formatted to force server-side attachment download header.
 */
export function getCloudinaryDownloadUrl(url: string): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  // Remove existing fl_attachment flag if present
  let clean = url.replace(/\/fl_attachment[^/]*\//g, "/");
  clean = clean.replace(/([^:]\/)\/+/g, "$1");

  if (clean.includes("/upload/")) {
    return clean.replace("/upload/", "/upload/fl_attachment/");
  }
  return clean;
}

/**
 * Extracts a filename from a URL.
 */
export function getFilenameFromUrl(url: string, defaultName: string = "submission.pdf"): string {
  if (!url) return defaultName;
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last.includes(".")) {
      return decodeURIComponent(last);
    }
  } catch {
    // fallback
  }
  return defaultName;
}

/**
 * Reliably triggers a file download for any URL (cross-origin or same-origin).
 * First attempts a CORS fetch to download as a Blob (guarantees same-origin download with filename).
 * If CORS fetch is blocked, falls back to opening a Cloudinary fl_attachment download URL.
 */
export async function downloadFile(url: string, customFilename?: string): Promise<void> {
  if (!url) return;

  const filename = customFilename || getFilenameFromUrl(url);

  // 1. Try fetching as Blob first
  try {
    const response = await fetch(url, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      return;
    }
  } catch {
    // CORS fetch blocked, fall through to server-side attachment link
  }

  // 2. Fallback: Force server-side attachment header (Cloudinary fl_attachment)
  const downloadUrl = url.includes("res.cloudinary.com")
    ? getCloudinaryDownloadUrl(url)
    : url;

  const a = document.createElement("a");
  a.href = downloadUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Returns true if the URL points to a document that can be previewed
 * (PDF, PPT, PPTX, DOC, DOCX, or a Cloudinary raw upload).
 */
export function isDocumentUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("/raw/upload/") ||
    /\.(pdf|ppt|pptx|doc|docx)(\?|$)/i.test(url)
  );
}

/**
 * Backward compatibility alias
 */
export function toInlineUrl(url: string): string {
  return getCleanViewUrl(url);
}
