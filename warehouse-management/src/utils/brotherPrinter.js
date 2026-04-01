// Brother P900W Label Printer Utility
// Supports 62mm continuous tape (2.4" width)

export const printToBrotherP900W = async (asset, qrDataUrl) => {
  const assetID = asset?.asset_id || asset?.assetID || '';
  const description = asset?.description || '';
  const category = asset?.category || '';
  const assignedTo = asset?.assigned_to || asset?.assignedTo || '—';
  const location = asset?.location || '—';

  // Create label HTML optimized for 62mm tape (2.4" / ~234px width)
  const labelHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Asset Label - ${assetID}</title>
  <style>
    @page {
      size: 62mm 100mm;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 62mm;
      height: 100mm;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4mm;
      background: white;
    }
    .brand {
      font-size: 8pt;
      font-weight: bold;
      color: #1e3a5f;
      letter-spacing: 1.5px;
      margin-bottom: 3mm;
    }
    .qr-code {
      width: 35mm;
      height: 35mm;
      margin-bottom: 3mm;
    }
    .asset-id {
      font-size: 14pt;
      font-weight: bold;
      color: #1e3a5f;
      margin-bottom: 1mm;
      text-align: center;
    }
    .desc {
      font-size: 9pt;
      color: #333;
      margin-bottom: 2mm;
      text-align: center;
      max-width: 54mm;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .info {
      font-size: 7pt;
      color: #666;
      text-align: center;
      line-height: 1.4;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="brand">GOLI ICT</div>
  <img class="qr-code" src="${qrDataUrl}" alt="QR Code" />
  <div class="asset-id">${assetID}</div>
  <div class="desc">${description}</div>
  <div class="info">
    ${category}${location !== '—' ? ' • ' + location : ''}
  </div>
</body>
</html>`;

  // Create hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(labelHTML);
  doc.close();

  // Wait for image to load, then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      
      // Cleanup after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };
};
