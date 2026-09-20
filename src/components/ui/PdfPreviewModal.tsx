import { useState, useEffect } from "react";

interface Props {
  url: string;
  onClose: () => void;
}

/**
 * Opens a Cloudinary raw-uploaded PDF in an in-app modal.
 *
 * Fetches the file as a blob, re-wraps with application/pdf MIME type,
 * then feeds the local object URL to an <iframe>. This bypasses Cloudinary's
 * octet-stream Content-Type header that blocks the browser's native PDF viewer.
 */
export default function PdfPreviewModal({ url, onClose }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let blobUrl = "";
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.blob();
        const pdfBlob = new Blob([raw], { type: "application/pdf" });
        blobUrl = URL.createObjectURL(pdfBlob);
        if (!cancelled) setObjectUrl(blobUrl);
      } catch (err) {
        if (!cancelled)
          setError("Could not load the PDF. Download it instead.");
        console.error("PDF preview error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[90vh] bg-slate-950 border border-white/10 flex flex-col overflow-hidden shadow-[0_0_80px_rgba(0,245,255,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-4 w-[2px] bg-cyan-400 shadow-[0_0_8px_#00ffff]" />
            <span className="text-[10px] font-black font-orbitron text-cyan-400 uppercase tracking-[0.25em]">
              PDF Preview
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={url}
              download
              className="px-3 py-1.5 text-[9px] font-black font-orbitron uppercase tracking-widest text-slate-300 border border-white/10 hover:border-white/30 hover:text-white transition-all"
            >
              Download
            </a>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg leading-none"
            >
              x
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Loading PDF...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8">
              <p className="text-sm font-mono text-slate-400 text-center">{error}</p>
              <a
                href={url}
                download
                className="px-6 py-2.5 border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-orbitron font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
              >
                Download File
              </a>
            </div>
          )}

          {objectUrl && !loading && (
            <iframe
              src={objectUrl}
              title="PDF Preview"
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
