import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import QRCode from 'qrcode';

const QRModal = ({ asset, onClose }) => {
  const canvasRef = useRef(null);
  const [qrReady, setQrReady] = useState(false);

  const qrValue = asset?.qr_url || asset?.qrUrl || `https://wms.goli.com/assets/${asset?.asset_id || asset?.assetID}`;

  useEffect(() => {
    if (!canvasRef.current || !qrValue) return;

    QRCode.toCanvas(canvasRef.current, qrValue, {
      width: 256,
      margin: 2,
      color: {
        dark: '#1e3a5f',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    }, (err) => {
      if (!err) setQrReady(true);
    });
  }, [qrValue]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `QR-${asset?.asset_id || asset?.assetID}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const imgData = canvasRef.current.toDataURL('image/png');
    const assetID = asset?.asset_id || asset?.assetID;
    const description = asset?.description || '';
    const location = asset?.location || '-';
    const category = asset?.category || '';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${assetID}</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fff; }
            .label { text-align: center; border: 2px solid #1e3a5f; border-radius: 12px; padding: 24px 32px; display: inline-block; }
            .brand { font-size: 12px; font-weight: bold; color: #1e3a5f; letter-spacing: 2px; margin-bottom: 8px; }
            img { display: block; margin: 0 auto 12px; }
            .asset-id { font-size: 18px; font-weight: bold; color: #1e3a5f; margin-bottom: 4px; }
            .desc { font-size: 13px; color: #444; margin-bottom: 2px; }
            .meta { font-size: 11px; color: #888; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="brand">GOLI - ICT WMS</div>
            <img src="${imgData}" width="200" height="200" />
            <div class="asset-id">${assetID}</div>
            <div class="desc">${description}</div>
            <div class="meta">${category} &nbsp;|&nbsp; ${location}</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!asset) return null;

  const assetID = asset?.asset_id || asset?.assetID;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <p className="text-xs font-bold text-blue-900 tracking-widest uppercase mb-1">ICT – ASSET WMS</p>
          <h3 className="text-lg font-bold text-gray-800">{asset.description}</h3>
          <p className="text-sm text-gray-500">{assetID}</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-5">
          <div className="p-3 border-2 border-blue-900 rounded-xl bg-white shadow-inner">
            <canvas ref={canvasRef} style={{ display: 'block' }} />
          </div>
        </div>

        {/* Asset Info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-5 text-sm grid grid-cols-2 gap-y-1.5 gap-x-2">
          <span className="text-gray-500">Category</span>
          <span className="text-gray-800 font-medium text-right">{asset.category}</span>
          <span className="text-gray-500">Status</span>
          <span className="text-right">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full
              ${asset.status === 'Available' ? 'bg-green-100 text-green-800' : ''}
              ${asset.status === 'In Use' ? 'bg-blue-100 text-blue-800' : ''}
              ${asset.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' : ''}
              ${asset.status === 'Repair' ? 'bg-orange-100 text-orange-800' : ''}
              ${asset.status === 'Retired' ? 'bg-gray-100 text-gray-800' : ''}
            `}>{asset.status}</span>
          </span>
          <span className="text-gray-500">Location</span>
          <span className="text-gray-800 font-medium text-right">{asset.location || '—'}</span>
          <span className="text-gray-500">Assigned To</span>
          <span className="text-gray-800 font-medium text-right">{asset.assigned_to || asset.assignedTo || '—'}</span>
        </div>

        {/* URL hint */}
        <p className="text-center text-xs text-gray-400 mb-5 break-all">{qrValue}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={!qrReady}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Download size={15} />
            Download
          </button>
          <button
            onClick={handlePrint}
            disabled={!qrReady}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Printer size={15} />
            Print Label
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRModal;
