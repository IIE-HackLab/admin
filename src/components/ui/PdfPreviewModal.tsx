import { useState, useEffect } from "react";
import { getCleanViewUrl, downloadFile, getFilenameFromUrl } from "../../lib/cloudinaryUtils";

interface Props {
  url: string;
  onClose: () => void;
}

export default function PdfPreviewModal({ url, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [viewMode, setViewMode] = useState<"direct" | "google">("direct");

  const cleanUrl = getCleanViewUrl(url);
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(cleanUrl)}&embedded=true`;
  const filename = getFilenameFromUrl(url);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDownloadClick = async () => {
    setDownloading(true);
    try {
      await downloadFile(url, filename);
    } finally {
      setDownloading(false);
    }
  };

  const iframeSrc = viewMode === "direct" ? cleanUrl : googleViewerUrl;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[92vh] bg-[#0a0f1e] border border-white/15 rounded-xl flex flex-col shadow-[0_0_80px_rgba(0,245,255,0.12)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-slate-950/80 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-4 w-[3px] bg-cyan-400 shadow-[0_0_10px_#00f5ff]" />
            <span className="text-[11px] font-black font-orbitron text-cyan-400 uppercase tracking-[0.2em] truncate max-w-[200px] sm:max-w-xs">
              {filename}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded p-0.5 mr-2">
              <button
                onClick={() => setViewMode("direct")}
                className={`px-2.5 py-1 text-[9px] font-orbitron uppercase font-bold rounded transition-all ${
                  viewMode === "direct"
                    ? "bg-cyan-400 text-black shadow-[0_0_8px_rgba(0,245,255,0.4)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Inline View
              </button>
              <button
                onClick={() => setViewMode("google")}
                className={`px-2.5 py-1 text-[9px] font-orbitron uppercase font-bold rounded transition-all ${
                  viewMode === "google"
                    ? "bg-cyan-400 text-black shadow-[0_0_8px_rgba(0,245,255,0.4)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Google View
              </button>
            </div>

            {/* External Open Link */}
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-[9px] font-black font-orbitron uppercase tracking-widest text-slate-300 border border-white/15 hover:border-cyan-400/50 hover:text-cyan-400 transition-all rounded bg-white/5"
            >
              Open Tab ↗
            </a>

            {/* Download Button */}
            <button
              onClick={handleDownloadClick}
              disabled={downloading}
              className="px-3 py-1.5 text-[9px] font-black font-orbitron uppercase tracking-widest bg-cyan-500/15 text-cyan-400 border border-cyan-400/40 hover:bg-cyan-400 hover:text-black transition-all rounded shadow-[0_0_12px_rgba(0,245,255,0.2)] disabled:opacity-50"
            >
              {downloading ? "Downloading..." : "⬇ Download"}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all font-mono text-base ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Document Canvas */}
        <div className="flex-1 overflow-hidden relative bg-slate-950">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 z-10 pointer-events-none">
              <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_15px_#00f5ff]" />
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest animate-pulse">
                Initializing Document Stream...
              </p>
            </div>
          )}

          <iframe
            src={iframeSrc}
            title="Document Preview"
            className="w-full h-full border-0 bg-slate-950"
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}
