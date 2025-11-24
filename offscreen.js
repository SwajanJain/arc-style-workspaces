// Offscreen document for clipboard operations
// Service workers can't access clipboard directly, so we use this offscreen document

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'offscreen:copy') {
    handleCopyToClipboard(message.dataUrl)
      .then((method) => sendResponse({ ok: true, method }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Copy failed' }));
    return true; // async response
  }
});

async function handleCopyToClipboard(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  // Prefer chrome.clipboard API (doesn't require focused document)
  if (chrome?.clipboard?.setImageData) {
    const imageData = await blobToImageData(blob);
    await chrome.clipboard.setImageData(
      imageData,
      chrome.clipboard?.ImageType?.PNG || 'png'
    );
    return 'clipboard-api';
  }

  // Fallback to async clipboard API (may require focus on some platforms)
  const pngBlob = blob.type === 'image/png' ? blob : await convertToPng(blob);
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': pngBlob })
  ]);
  return 'navigator';
}

async function blobToImageData(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(bitmap.width, bitmap.height)
      : (() => {
          const c = document.createElement('canvas');
          c.width = bitmap.width;
          c.height = bitmap.height;
          return c;
        })();
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    if (bitmap.close) bitmap.close();
  }
}

async function convertToPng(blob) {
  // Create an image from the blob and convert to PNG
  const img = await createImageBitmap(blob);
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(img.width, img.height)
    : (() => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        return c;
      })();
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  if (canvas.convertToBlob) {
    return await canvas.convertToBlob({ type: 'image/png' });
  }
  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
