import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, CameraOff, ScanLine, CheckCircle } from 'lucide-react';

/**
 * QRScanner
 * Opens the device camera, scans frame-by-frame using jsQR (loaded via CDN script tag),
 * and displays the decoded plain text result — no URL redirect, no external app.
 *
 * Props:
 *   onClose  — called when user dismisses
 */

// Dynamically load jsQR from CDN once
const loadJsQR = () =>
  new Promise((resolve, reject) => {
    if (window.jsQR) { resolve(window.jsQR); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    script.onload  = () => resolve(window.jsQR);
    script.onerror = () => reject(new Error('Failed to load jsQR'));
    document.head.appendChild(script);
  });

const QRScanner = ({ onClose }) => {
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const streamRef     = useRef(null);
  const rafRef        = useRef(null);
  const jsQRRef       = useRef(null);

  const [status, setStatus]     = useState('loading'); // loading | scanning | found | error
  const [result, setResult]     = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [camFacing, setCamFacing] = useState('environment'); // environment = back camera

  const stopCamera = useCallback(() => {
    if (rafRef.current)    { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  const startCamera = useCallback(async (facing) => {
    stopCamera();
    setStatus('loading');
    setResult(null);

    try {
      jsQRRef.current = await loadJsQR();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStatus('scanning');
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setErrorMsg('No camera found on this device.');
      } else {
        setErrorMsg(`Camera error: ${err.message}`);
      }
      setStatus('error');
    }
  }, [stopCamera]);

  // Scan loop — runs on every animation frame while scanning
  const scanFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code) {
      setResult(code.data);
      setStatus('found');
      stopCamera();
      return; // stop loop
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]);

  // Kick off scan loop once video is playing
  const handleVideoPlay = useCallback(() => {
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [scanFrame]);

  // Start on mount
  useEffect(() => {
    startCamera(camFacing);
    return () => stopCamera();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlip = () => {
    const next = camFacing === 'environment' ? 'user' : 'environment';
    setCamFacing(next);
    startCamera(next);
  };

  const handleScanAgain = () => {
    setResult(null);
    startCamera(camFacing);
  };

  // Parse the plain-text payload our QR codes use into key/value lines
  const parsePayload = (text) => {
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('=='));
    return lines.map(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return { raw: line };
      return {
        label: line.slice(0, colonIdx).trim(),
        value: line.slice(colonIdx + 1).trim(),
      };
    });
  };

  const isGOLIPayload = result && result.includes('GOLI ICT ASSET');
  const parsedLines   = result ? parsePayload(result) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ScanLine size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-gray-800">Scan QR Code</h2>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">

          {/* ── LOADING ── */}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <Camera size={36} className="animate-pulse" />
              <p className="text-sm">Starting camera…</p>
            </div>
          )}

          {/* ── ERROR ── */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <CameraOff size={40} className="text-red-400" />
              <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
              <button
                onClick={() => startCamera(camFacing)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── SCANNING ── */}
          {status === 'scanning' && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                {/* Live video feed */}
                <video
                  ref={videoRef}
                  onPlay={handleVideoPlay}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {/* Scanning overlay — animated corner brackets */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-48 h-48">
                    {/* Corners */}
                    {[
                      'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
                      'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
                      'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
                      'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
                    ].map((cls, i) => (
                      <div key={i} className={`absolute w-8 h-8 border-blue-400 ${cls}`} />
                    ))}
                    {/* Scan line animation */}
                    <div className="absolute inset-x-2 h-0.5 bg-blue-400 opacity-80 animate-scan-line" />
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-gray-400">Point your camera at a QR code</p>
              <button
                onClick={handleFlip}
                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Camera size={14} />
                Flip Camera ({camFacing === 'environment' ? 'Back' : 'Front'})
              </button>
            </div>
          )}

          {/* ── RESULT ── */}
          {status === 'found' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span className="text-sm font-semibold">QR Code Detected</span>
              </div>

              {isGOLIPayload ? (
                /* Formatted asset card */
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-blue-800 tracking-widest uppercase mb-3">
                    GOLI – ICT Asset
                  </p>
                  {parsedLines.map((line, i) =>
                    line.raw ? null : (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-500 w-24 shrink-0">{line.label}</span>
                        <span className="text-gray-800 font-medium text-right break-all">{line.value}</span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                /* Unknown QR — show raw text */
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-2 tracking-wide">QR Content</p>
                  <p className="text-sm text-gray-800 break-all whitespace-pre-wrap font-mono">{result}</p>
                </div>
              )}

              <button
                onClick={handleScanAgain}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Scan Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for frame processing — never shown */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default QRScanner;