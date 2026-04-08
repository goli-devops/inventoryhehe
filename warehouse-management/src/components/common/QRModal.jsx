import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { buildQRPayload } from './QRCodeDisplay';

const QRModal = ({ asset, onClose }) => {
  const canvasRef     = useRef(null);
  const printFrameRef = useRef(null);
  const [qrReady, setQrReady] = useState(false);

  const payload    = buildQRPayload(asset);
  const assetID    = asset?.asset_id || asset?.assetID || '';
  const assignedTo = asset?.assigned_to || asset?.assignedTo || '—';

  useEffect(() => {
    if (!canvasRef.current || !payload) return;
    setQrReady(false);
    QRCode.toCanvas(canvasRef.current, payload, {
      width: 256,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }, (err) => { if (!err) setQrReady(true); });
  }, [payload]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link    = document.createElement('a');
    link.download = `QR-${assetID}.png`;
    link.href     = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current || !qrReady) return;

    const imgData = canvasRef.current.toDataURL('image/png');
    const assetTag = asset?.inventory_asset_tag?.trim() || asset?.asset_id || 'N/A';

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Asset Label – ${assetTag}</title>
    <style>
      @page{size:38mm 24mm;margin:0}
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#fff;padding:0;font-family:Arial,sans-serif}
      .page{display:flex;flex-direction:column;gap:0}
      .label{width:38mm;height:24mm;display:flex;align-items:center;padding:1mm;background:#fff;page-break-after:always}
      .qr-box{flex-shrink:0;width:20mm;height:20mm;margin-right:1mm;display:flex;align-items:center;justify-content:center}
      .qr-box img{display:block;width:100%;height:100%}
      .info{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:0.5mm}
      .logo{max-width:12mm;max-height:6mm;object-fit:contain}
      .asset-tag{font-size:6.5pt;font-weight:bold;color:#000;font-family:monospace;letter-spacing:0.03em;word-break:break-all;text-align:center;line-height:1.1}
      .label:last-child{page-break-after:avoid}
      @media screen{body{background:#f0f0f0;padding:16px}.page{gap:12px}.label{border:1px solid #000}}
      @media print{.label{border:none}}
    </style>
  </head>
  <body>
    <div class="page">
      <div class="label">
        <div class="qr-box"><img src="${imgData}" /></div>
        <div class="info">
          <img class="logo" src="${window.location.origin}/goli_logo.jpg" alt="GOLI" onerror="this.style.display='none'" />
          <div class="asset-tag">${assetTag}</div>
        </div>
      </div>
    </div>
  </body>
</html>`;

    let iframe = printFrameRef.current;
    if (!iframe) {
      iframe = document.createElement('iframe');
      Object.assign(iframe.style, { position: 'fixed', top: '-9999px', left: '-9999px', width: '0', height: '0', border: 'none' });
      document.body.appendChild(iframe);
      printFrameRef.current = iframe;
    }

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    iframe.onload = () => setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); }, 300);
  };

  useEffect(() => {
    return () => {
      if (printFrameRef.current) { document.body.removeChild(printFrameRef.current); printFrameRef.current = null; }
    };
  }, []);

  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 relative">

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <X size={18} className="text-gray-500" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <p className="text-xs font-bold text-blue-900 tracking-widest uppercase mb-1">GOLI – ICT WMS</p>
          <h3 className="text-lg font-bold text-gray-800">{asset.description}</h3>
          <p className="text-sm text-gray-500">{assetID}</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-3">
          <div className="p-3 border-2 border-blue-900 rounded-xl bg-white shadow-inner">
            <canvas ref={canvasRef} style={{ display: 'block' }} />
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-gray-400 mb-4 italic">
          Scan with any QR reader to view asset details — no internet required
        </p>

        {/* Asset Info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-5 text-sm grid grid-cols-2 gap-y-1.5 gap-x-2">
          <span className="text-gray-500">Category</span>
          <span className="text-gray-800 font-medium text-right">{asset.category}</span>
          <span className="text-gray-500">Status</span>
          <span className="text-right">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full
              ${asset.status === 'Available'   ? 'bg-green-100 text-green-800'  : ''}
              ${asset.status === 'In Use'       ? 'bg-blue-100 text-blue-800'   : ''}
              ${asset.status === 'Maintenance'  ? 'bg-yellow-100 text-yellow-800' : ''}
              ${asset.status === 'Repair'       ? 'bg-orange-100 text-orange-800' : ''}
              ${asset.status === 'Retired'      ? 'bg-gray-100 text-gray-800'   : ''}
            `}>{asset.status}</span>
          </span>
          <span className="text-gray-500">Location</span>
          <span className="text-gray-800 font-medium text-right">{asset.location || '—'}</span>
          <span className="text-gray-500">Assigned To</span>
          <span className="text-gray-800 font-medium text-right">{assignedTo}</span>
          {(asset.serial_number || asset.serialNumber) && <>
            <span className="text-gray-500">Serial #</span>
            <span className="text-gray-800 font-medium text-right">{asset.serial_number || asset.serialNumber}</span>
          </>}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={!qrReady}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Download size={15} /> Download
          </button>
          <button
            onClick={handlePrint}
            disabled={!qrReady}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Printer size={15} /> Print Label
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal;