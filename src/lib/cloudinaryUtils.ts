/**
 * Converts a Cloudinary raw upload URL to a browser-viewable inline URL.
 *
 * Cloudinary serves `/raw/upload/` files with `Content-Disposition: attachment`
 * which forces a download and breaks browser PDF/doc rendering.
 *
 * By replacing `/raw/upload/` with `/image/upload/` Cloudinary switches to
 * serving the file inline (works for PDF, PPT, PPTX, DOC, DOCX).
 *
 * Additionally, inserting the `fl_attachment:false` flag explicitly forces
 * inline delivery even when the preset is configured to attach.
 */
export function toInlineUrl(url: string): string {
  if (!url) return url;
  if (!url.includes("res.cloudinary.com")) return url;

  // Files uploaded as raw must stay as raw — Cloudinary rejects cross-type serving.
  // fl_attachment:false overrides Content-Disposition to inline so the browser
  // can render the file directly instead of forcing a download.
  return url
    .replace("/raw/upload/", "/raw/upload/fl_attachment:false/")
    .replace("/raw/upload/fl_attachment:false/fl_attachment:false/", "/raw/upload/fl_attachment:false/");
}


/**
 * Returns true if the URL points to a document (PDF, PPT, PPTX, DOC, DOCX,
 * or a Cloudinary raw upload).
 */
export function isDocumentUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("/raw/upload/") ||
    /\.(pdf|ppt|pptx|doc|docx)(\?|$)/i.test(url)
  );
}
