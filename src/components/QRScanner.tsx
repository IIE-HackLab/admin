import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const html5Qrcode = new Html5Qrcode('qr-reader');
    scannerRef.current = html5Qrcode;

    const startScanner = async () => {
      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

      try {
        // Try back camera (environment facing) by default
        await html5Qrcode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isMounted) onScan(decodedText);
          },
          () => {} // silent on frame scan failure
        );
      } catch (err) {
        console.warn("Environment camera failed/unavailable, attempting fallback camera:", err);
        try {
          // Fallback to front/default camera
          await html5Qrcode.start(
            { facingMode: 'user' },
            config,
            (decodedText) => {
              if (isMounted) onScan(decodedText);
            },
            () => {}
          );
        } catch (fallbackErr) {
          console.error("Failed to start camera scanner:", fallbackErr);
          if (isMounted) {
            setErrorMessage("Camera access failed. Please ensure camera permissions are granted.");
          }
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => {
              scannerRef.current?.clear();
            })
            .catch((e) => console.error("Failed to stop QR scanner", e));
        } else {
          try {
            scannerRef.current.clear();
          } catch (e) {
            // silent cleanup
          }
        }
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative glass-card border-cyan-500/30 w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        {/* Cyberpunk corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500" />

        <div className="p-4 border-b border-cyan-500/20 flex justify-between items-center bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-cyan-400 animate-pulse rounded-full" />
            <h3 className="font-orbitron text-white text-xs tracking-[0.3em] uppercase">Visual Uplink: Scanner</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-cyan-400 transition-colors p-1 hover:bg-cyan-500/10 rounded"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-6 bg-slate-950/90">
          {errorMessage ? (
            <div className="p-4 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs text-center font-orbitron">
              {errorMessage}
            </div>
          ) : (
            <div id="qr-reader" className="overflow-hidden rounded border border-cyan-500/20 min-h-[250px]" />
          )}
        </div>

        <div className="p-4 border-t border-cyan-500/10 bg-slate-900/50">
          <p className="text-[9px] text-cyan-500/60 font-orbitron text-center tracking-[0.2em] uppercase leading-relaxed">
            Position entity QR within containment field<br/>
            <span className="text-slate-600 font-mono text-[8px]">Primary Sensor: Back Camera</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
