// Screenshot overlay injected into the active tab.
// Adds dimmed overlay, drag-to-select, and copy/download actions.

(function () {
  if (window.__arcWorkspaceShotActive) return;
  window.__arcWorkspaceShotActive = true;

  const state = {
    start: null,
    rect: null,
    selectionEl: null,
    toolbarEl: null,
    instructionEl: null,
    overlayEl: null,
    statusEl: null,
    action: null
  };

  const dpr = window.devicePixelRatio || 1;

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'aw-shot-overlay';
    overlay.innerHTML = `
      <div class="aw-shot-instruction">Drag to select area • Esc to cancel</div>
    `;
    document.body.appendChild(overlay);
    state.overlayEl = overlay;

    const instruction = overlay.querySelector('.aw-shot-instruction');
    state.instructionEl = instruction;

    overlay.addEventListener('mousedown', onMouseDown, { passive: false });
    overlay.addEventListener('mousemove', onMouseMove, { passive: false });
    overlay.addEventListener('mouseup', onMouseUp, { passive: false });
    overlay.addEventListener('dblclick', (e) => e.preventDefault());
    document.addEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
    }
  }

  function onMouseDown(e) {
    if (state.toolbarEl?.contains(e.target)) return; // Allow toolbar interactions
    if (e.button !== 0) return;
    e.preventDefault();
    state.start = { x: e.clientX, y: e.clientY };
    ensureSelectionEl();
    updateSelection(e.clientX, e.clientY);
    hideToolbar();
  }

  function onMouseMove(e) {
    if (state.toolbarEl?.contains(e.target)) return;
    if (!state.start) return;
    e.preventDefault();
    updateSelection(e.clientX, e.clientY);
  }

  function onMouseUp(e) {
    if (state.toolbarEl?.contains(e.target)) return;
    if (!state.start) return;
    e.preventDefault();
    updateSelection(e.clientX, e.clientY);
    state.start = null;
    if (state.rect && state.rect.width > 6 && state.rect.height > 6) {
      showToolbar();
    } else {
      hideToolbar();
      setStatus('Drag to select a larger area');
    }
  }

  function ensureSelectionEl() {
    if (!state.selectionEl) {
      const sel = document.createElement('div');
      sel.className = 'aw-shot-selection';
      state.overlayEl.appendChild(sel);
      state.selectionEl = sel;
    }
  }

  function updateSelection(x, y) {
    const start = state.start || { x, y };
    const left = Math.min(start.x, x);
    const top = Math.min(start.y, y);
    const width = Math.abs(start.x - x);
    const height = Math.abs(start.y - y);
    state.rect = { left, top, width, height };

    if (state.selectionEl) {
      Object.assign(state.selectionEl.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      });
    }
  }

  function showToolbar() {
    if (!state.toolbarEl) {
      const toolbar = document.createElement('div');
      toolbar.className = 'aw-shot-toolbar';
      toolbar.innerHTML = `
        <button data-action="copy">Copy</button>
        <button data-action="download">Download</button>
        <button data-action="cancel">Cancel</button>
        <span class="aw-shot-status"></span>
      `;
      state.overlayEl.appendChild(toolbar);
      state.toolbarEl = toolbar;
      state.statusEl = toolbar.querySelector('.aw-shot-status');

      toolbar.addEventListener('click', async (e) => {
        const action = e.target?.dataset?.action;
        if (!action) return;
        if (action === 'cancel') {
          cleanup();
          return;
        }
        if (state.rect && state.rect.width > 4 && state.rect.height > 4) {
          await handleAction(action);
        }
      });
    }

    const { left, top, width, height } = state.rect;
    const tb = state.toolbarEl;
    tb.style.display = 'flex';
    const padding = 8;
    const tbWidth = tb.offsetWidth || 160;
    const anchorTop = Math.min(top + height + padding, window.innerHeight - 40);
    const anchorLeft = Math.min(left + width - tbWidth, window.innerWidth - tbWidth - padding);
    tb.style.display = 'flex';
    tb.style.top = `${anchorTop}px`;
    tb.style.left = `${Math.max(padding, anchorLeft)}px`;
  }

  function hideToolbar() {
    if (state.toolbarEl) {
      state.toolbarEl.style.display = 'none';
    }
  }

  function setStatus(text) {
    if (state.statusEl) {
      state.statusEl.textContent = text || '';
    }
  }

  async function handleAction(action) {
    console.log('[Screenshot] handleAction called with action:', action);
    try {
      setStatus('Capturing…');

      // Store rect before any DOM changes
      const captureRect = { ...state.rect };
      console.log('[Screenshot] captureRect:', captureRect);

      // Hide overlay before capture so it's not included in screenshot
      // Use opacity 0 and pointer-events none instead of visibility
      const originalStyle = state.overlayEl.style.cssText;
      state.overlayEl.style.opacity = '0';
      state.overlayEl.style.pointerEvents = 'none';

      // Wait for browser to repaint without overlay
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log('[Screenshot] Sending capture request...');
      const resp = await sendCaptureRequest();
      console.log('[Screenshot] Capture response:', resp?.ok, resp?.error);

      // Restore overlay
      state.overlayEl.style.cssText = originalStyle;
      state.overlayEl.style.opacity = '1';
      state.overlayEl.style.pointerEvents = 'auto';

      // Use stored rect for cropping
      state.rect = captureRect;

      if (!resp?.ok || !resp.dataUrl) {
        setStatus('Capture failed');
        const detail = resp?.error ? ` (${resp.error})` : '';
        console.error('[Screenshot] Capture failed:', detail);
        alert(`Screenshot failed${detail}`);
        return;
      }
      console.log('[Screenshot] Cropping image...');
      const blob = await cropToBlob(resp.dataUrl);
      console.log('[Screenshot] Blob created:', !!blob);
      if (!blob) {
        setStatus('Capture failed');
        alert('Screenshot failed while processing.');
        return;
      }

      if (action === 'copy') {
        try {
          await copyBlobToClipboard(blob);
          setStatus('Copied');
          setTimeout(() => cleanup(), 400);
          return;
        } catch (err) {
          console.error('[Screenshot] In-page clipboard copy failed, falling back to background:', err);
          setStatus('Retrying…');
        }
      }

      // Convert blob to data URL for background script
      const dataUrlResult = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });

      if (!dataUrlResult) {
        setStatus('Processing failed');
        alert('Failed to process screenshot.');
        return;
      }

      // Send to background script to handle download/copy (fallback for copy)
      console.log('[Screenshot] Sending save request to background...');
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'screenshot:save', action, dataUrl: dataUrlResult },
          (response) => {
            console.log('[Screenshot] Save response:', response);
            if (chrome.runtime.lastError) {
              console.error('[Screenshot] Save error:', chrome.runtime.lastError.message);
              resolve({ ok: false, error: chrome.runtime.lastError.message });
              return;
            }
            resolve(response);
          }
        );
      });

      console.log('[Screenshot] Save result:', result);
      if (result?.ok) {
        setStatus(action === 'download' ? 'Saved' : 'Copied');
      } else {
        setStatus(action === 'download' ? 'Save failed' : 'Copy failed');
        alert(`${action === 'download' ? 'Download' : 'Copy'} failed: ${result?.error || 'Unknown error'}`);
        return;
      }

      setTimeout(() => cleanup(), 400);
    } catch (err) {
      console.error('[Screenshot overlay] action failed:', err);
      setStatus('Error');
      alert('Screenshot failed. Check console for details.');
    }
  }

  function sendCaptureRequest() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'screenshot:capture' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response);
        }
      );
    });
  }

  async function cropToBlob(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(state.rect.width * dpr);
          canvas.height = Math.round(state.rect.height * dpr);
          const ctx = canvas.getContext('2d');
          const sx = Math.round(state.rect.left * dpr);
          const sy = Math.round(state.rect.top * dpr);
          const sw = Math.round(state.rect.width * dpr);
          const sh = Math.round(state.rect.height * dpr);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        } catch (err) {
          console.error('[Screenshot overlay] crop failed:', err);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  // Listen for cancel messages (e.g., user clicks camera again)
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'screenshot:cancel-overlay') {
      if (window.__arcWorkspaceShotActive) {
        cleanup();
        sendResponse?.({ ok: true });
        return true;
      }
      sendResponse?.({ ok: false });
      return false;
    }
    return false;
  });

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .aw-shot-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        cursor: crosshair;
        z-index: 2147483646;
        user-select: none;
      }
      .aw-shot-instruction {
        position: fixed;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 10px;
        background: rgba(0,0,0,0.6);
        color: #f5f5f5;
        border-radius: 6px;
        font-size: 13px;
        pointer-events: none;
      }
      .aw-shot-selection {
        position: absolute;
        border: 1px solid #4f8bff;
        background: rgba(79, 139, 255, 0.15);
        box-shadow: 0 0 0 1px rgba(79, 139, 255, 0.3);
      }
      .aw-shot-toolbar {
        position: fixed;
        display: none;
        gap: 8px;
        padding: 6px 8px;
        background: rgba(0,0,0,0.85);
        color: #f5f5f5;
        border-radius: 8px;
        align-items: center;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        font-size: 13px;
      }
      .aw-shot-toolbar button {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.1);
        color: #f5f5f5;
        padding: 6px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
      }
      .aw-shot-toolbar button:hover {
        background: rgba(255,255,255,0.16);
      }
      .aw-shot-status {
        margin-left: 6px;
        color: #d1d5db;
        min-width: 48px;
      }
    `;
    document.head.appendChild(style);
  }

  async function copyBlobToClipboard(blob) {
    if (!navigator.clipboard?.write) {
      throw new Error('Clipboard API unavailable');
    }
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
  }

  function cleanup() {
    document.removeEventListener('keydown', onKeyDown);
    if (state.overlayEl?.parentElement) {
      state.overlayEl.removeEventListener('mousedown', onMouseDown);
      state.overlayEl.removeEventListener('mousemove', onMouseMove);
      state.overlayEl.removeEventListener('mouseup', onMouseUp);
      state.overlayEl.remove();
    }
    delete window.__arcWorkspaceShotActive;
  }

  injectStyles();
  createOverlay();
})();
