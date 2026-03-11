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

    const imgData    = canvasRef.current.toDataURL('image/png');
    const description = asset?.description || '';
    const category    = asset?.category || '';
    const status      = asset?.status || '';
    const location    = asset?.location || '—';
    const serial      = asset?.serial_number || asset?.serialNumber || '—';

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>QR Label – ${assetID}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: Arial, sans-serif;
        background: #fff;
        display: flex;
        justify-content: center;
        padding: 24px;
      }
      .label {
        border: 2px solid #1e3a5f;
        border-radius: 12px;
        padding: 20px 24px;
        width: 300px;
        text-align: center;
      }
      .brand { font-size: 10px; font-weight: bold; color: #1e3a5f; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px; }
      .qr-img { display: block; margin: 0 auto 14px; width: 180px; height: 180px; }
      .hint { font-size: 9px; color: #999; margin-bottom: 12px; font-style: italic; }
      .asset-id { font-size: 18px; font-weight: bold; color: #1e3a5f; margin-bottom: 4px; }
      .desc { font-size: 12px; color: #333; margin-bottom: 10px; }
      hr { border: none; border-top: 1px dashed #ccc; margin: 10px 0; }
      table { width: 100%; font-size: 11px; border-collapse: collapse; }
      td { padding: 3px 4px; text-align: left; }
      td:first-child { color: #888; width: 38%; }
      td:last-child { color: #333; font-weight: 600; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <div class="label">
      <div class="brand">GOLI &ndash; ICT WMS</div>
      <img class="qr-img" src="${imgData}" />
      <div class="hint">Scan to view asset details</div>
      <div class="asset-id">${assetID}</div>
      <div class="desc">${description}</div>
      <hr />
      <table>
        <tr><td>Category</td><td>${category}</td></tr>
        <tr><td>Status</td><td>${status}</td></tr>
        <tr><td>Location</td><td>${location}</td></tr>
        <tr><td>Assigned To</td><td>${assignedTo}</td></tr>
        <tr><td>Serial #</td><td>${serial}</td></tr>
      </table>
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