// Configure PDF.js Worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Global Variables
let passportCropper = null;
let rawSignatureImg = null;
let rawEnhanceImg = null;
let rawCompressImg = null;
let compressedBlobOutput = null;
let selectedPdfFiles = [];
let selectedWordInputFile = null;

document.addEventListener('DOMContentLoaded', function() {
  if (window.lucide) {
    lucide.createIcons();
  }
  initializeEventListeners();
});

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-blue-600';
  toast.className = `${bg} text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 transform translate-y-2 opacity-0`;
  toast.innerText = message;

  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

  const activeBtn = document.getElementById(`tab-${tabId}`);
  const activeSec = document.getElementById(`sec-${tabId}`);

  if (activeBtn) activeBtn.classList.add('tab-active');
  if (activeSec) activeSec.classList.remove('hidden');
}

// Universal File Reader (Converts both PDF and Image to HTML Image object)
async function loadFileAsImage(file) {
  if (file.type === 'application/pdf') {
    showToast('Extracting first page of PDF...', 'info');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img, dataUrl: canvas.toDataURL('image/jpeg', 0.95) });
      img.src = canvas.toDataURL('image/jpeg', 0.95);
    });
  } else {
    const dataUrl = await readFileAsDataURL(file);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img, dataUrl });
      img.src = dataUrl;
    });
  }
}

function initializeEventListeners() {
  // Passport Input
  const pInput = document.getElementById('passportInput');
  if (pInput) {
    pInput.addEventListener('change', async function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const { dataUrl } = await loadFileAsImage(file);
      const img = document.getElementById('passportCropperImg');
      img.src = dataUrl;
      img.classList.remove('hidden');
      document.getElementById('passportPlaceholder').classList.add('hidden');

      if (passportCropper) passportCropper.destroy();
      passportCropper = new Cropper(img, { viewMode: 1, autoCropArea: 0.9, responsive: true });
      document.getElementById('btnProcessPassport').disabled = false;
      showToast('Loaded into Passport Editor', 'success');
    });
  }

  // Signature Input
  const sInput = document.getElementById('sigInput');
  if (sInput) {
    sInput.addEventListener('change', async function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const { img } = await loadFileAsImage(file);
      rawSignatureImg = img;
      updateSignaturePreview();
      document.getElementById('btnDownloadSig').disabled = false;
      showToast('Signature File Loaded', 'success');
    });
  }

  // Enhancer Input
  const eInput = document.getElementById('enhInput');
  if (eInput) {
    eInput.addEventListener('change', async function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const { img } = await loadFileAsImage(file);
      rawEnhanceImg = img;
      updateEnhancePreview();
      document.getElementById('btnDownloadEnh').disabled = false;
      document.getElementById('btnAutoEnhance').disabled = false;
      document.getElementById('btnResetEnhance').disabled = false;
      showToast('File Loaded into Enhancer', 'success');
    });
  }

  // Compressor Input
  const cInput = document.getElementById('compInput');
  if (cInput) {
    cInput.addEventListener('change', async function(e) {
      const file = e.target.files[0];
      if (!file) return;

      document.getElementById('compOrigSize').innerText = `${(file.size / 1024).toFixed(1)} KB`;
      const { img } = await loadFileAsImage(file);
      rawCompressImg = img;
      document.getElementById('compControls').classList.remove('hidden');
      runKbCompressor();
    });
  }

  // Word Input
  const wordInput = document.getElementById('wordFileInput');
  if (wordInput) {
    wordInput.addEventListener('change', function(e) {
      selectedWordInputFile = e.target.files[0];
      document.getElementById('btnGenWord').disabled = !selectedWordInputFile;
    });
  }

  // PDF Input
  const pdfInput = document.getElementById('pdfInput');
  if (pdfInput) {
    pdfInput.addEventListener('change', function(e) {
      selectedPdfFiles = Array.from(e.target.files);
      document.getElementById('btnGenPdf').disabled = selectedPdfFiles.length === 0;
    });
  }

  // Live adjustments
  document.getElementById('sigThreshold')?.addEventListener('input', updateSignaturePreview);
  document.getElementById('sigInkColor')?.addEventListener('change', updateSignaturePreview);
  document.getElementById('sigBgMode')?.addEventListener('change', updateSignaturePreview);

  document.getElementById('enhBrightness')?.addEventListener('input', updateEnhancePreview);
  document.getElementById('enhContrast')?.addEventListener('input', updateEnhancePreview);
  document.getElementById('enhSaturate')?.addEventListener('input', updateEnhancePreview);

  document.getElementById('compRange')?.addEventListener('input', runKbCompressor);
}

// Passport Specs
function applyPassportPreset() {
  const preset = document.getElementById('presetSelect').value;
  const w = document.getElementById('pWidth'), h = document.getElementById('pHeight'), u = document.getElementById('pUnit'), kb = document.getElementById('pMaxKb');

  if (preset === 'in-passport' || preset === 'upsc') {
    w.value = '3.5'; h.value = '4.5'; u.value = 'cm'; kb.value = '50';
  } else if (preset === 'us-passport') {
    w.value = '2.0'; h.value = '2.0'; u.value = 'inch'; kb.value = '240';
  } else if (preset === 'pan') {
    w.value = '2.5'; h.value = '3.5'; u.value = 'cm'; kb.value = '50';
  }
}

async function processPassportPhoto() {
  if (!passportCropper) return;
  const w = parseFloat(document.getElementById('pWidth').value);
  const h = parseFloat(document.getElementById('pHeight').value);
  const unit = document.getElementById('pUnit').value;
  const dpi = parseInt(document.getElementById('pDpi').value);

  let targetW = w, targetH = h;
  if (unit === 'cm') { targetW = (w / 2.54) * dpi; targetH = (h / 2.54) * dpi; }
  else if (unit === 'mm') { targetW = (w / 25.4) * dpi; targetH = (h / 25.4) * dpi; }

  const croppedCanvas = passportCropper.getCroppedCanvas({ width: Math.round(targetW), height: Math.round(targetH) });
  
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = croppedCanvas.width;
  finalCanvas.height = croppedCanvas.height;
  const ctx = finalCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  ctx.drawImage(croppedCanvas, 0, 0);

  const maxKb = parseFloat(document.getElementById('pMaxKb').value) || 50;
  const blob = await compressCanvasToTargetKb(finalCanvas, maxKb, 'image/jpeg');

  triggerDownload(blob, `passport_photo.jpg`);
  showToast('Passport Photo Exported!', 'success');
}

// Signature Cleaner
function updateSignaturePreview() {
  if (!rawSignatureImg) return;
  const canvas = document.getElementById('sigCanvas');
  const ctx = canvas.getContext('2d');
  const threshold = parseInt(document.getElementById('sigThreshold').value);
  document.getElementById('sigThresholdVal').innerText = threshold;

  const inkColor = document.getElementById('sigInkColor').value;
  const bgMode = document.getElementById('sigBgMode').value;

  canvas.width = rawSignatureImg.width;
  canvas.height = rawSignatureImg.height;

  ctx.fillStyle = bgMode === 'transparent' ? 'rgba(0,0,0,0)' : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(rawSignatureImg, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i+1] + data[i+2]) / 3;
    if (avg < threshold) {
      if (inkColor === 'blue') { data[i] = 10; data[i+1] = 50; data[i+2] = 180; }
      else { data[i] = 0; data[i+1] = 0; data[i+2] = 0; }
      data[i+3] = 255;
    } else {
      if (bgMode === 'transparent') { data[i+3] = 0; }
      else { data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = 255; }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  canvas.classList.remove('hidden');
  document.getElementById('sigPlaceholder').classList.add('hidden');
}

async function downloadSignature() {
  const canvas = document.getElementById('sigCanvas');
  const bgMode = document.getElementById('sigBgMode').value;
  const mimeType = bgMode === 'transparent' ? 'image/png' : 'image/jpeg';
  const maxKb = parseFloat(document.getElementById('sigMaxKb').value) || 20;

  const blob = await compressCanvasToTargetKb(canvas, maxKb, mimeType);
  triggerDownload(blob, `clean_signature.${bgMode === 'transparent' ? 'png' : 'jpg'}`);
  showToast('Signature Downloaded!', 'success');
}

// Enhancer
function updateEnhancePreview() {
  if (!rawEnhanceImg) return;
  const b = document.getElementById('enhBrightness').value;
  const c = document.getElementById('enhContrast').value;
  const s = document.getElementById('enhSaturate').value;

  document.getElementById('valBrightness').innerText = `${b}%`;
  document.getElementById('valContrast').innerText = `${c}%`;
  document.getElementById('valSaturate').innerText = `${s}%`;

  const canvas = document.getElementById('enhCanvas');
  const ctx = canvas.getContext('2d');

  canvas.width = rawEnhanceImg.width;
  canvas.height = rawEnhanceImg.height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
  ctx.drawImage(rawEnhanceImg, 0, 0);

  canvas.classList.remove('hidden');
  document.getElementById('enhPlaceholder').classList.add('hidden');
}

function autoEnhanceImage() {
  document.getElementById('enhBrightness').value = 110;
  document.getElementById('enhContrast').value = 115;
  document.getElementById('enhSaturate').value = 105;
  updateEnhancePreview();
}

function resetEnhanceControls() {
  document.getElementById('enhBrightness').value = 100;
  document.getElementById('enhContrast').value = 100;
  document.getElementById('enhSaturate').value = 100;
  updateEnhancePreview();
}

async function downloadEnhancedImage() {
  const canvas = document.getElementById('enhCanvas');
  const blob = await compressCanvasToTargetKb(canvas, 300, 'image/jpeg');
  triggerDownload(blob, 'enhanced_document.jpg');
}

// Compressor
async function runKbCompressor() {
  if (!rawCompressImg) return;
  const canvas = document.createElement('canvas');
  canvas.width = rawCompressImg.width;
  canvas.height = rawCompressImg.height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(rawCompressImg, 0, 0);

  const targetKb = parseFloat(document.getElementById('compRange').value);
  document.getElementById('targetKbVal').innerText = `${targetKb} KB`;

  compressedBlobOutput = await compressCanvasToTargetKb(canvas, targetKb, 'image/jpeg');
  document.getElementById('compNewSize').innerText = `${(compressedBlobOutput.size / 1024).toFixed(1)} KB`;
}

function downloadCompressedImage() {
  if (compressedBlobOutput) triggerDownload(compressedBlobOutput, 'compressed_file.jpg');
}

// PDF OR IMAGE TO WORD (.DOC) CONVERTER
async function processPdfOrImageToWord() {
  if (!selectedWordInputFile) return;

  showToast('Creating Word Document...', 'info');
  let htmlPages = '';

  if (selectedWordInputFile.type === 'application/pdf') {
    const arrayBuffer = await selectedWordInputFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const extractedText = textContent.items.map(item => item.str).join(' ');

      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const imgData = canvas.toDataURL('image/jpeg', 0.85);

      htmlPages += `
        <div style="page-break-after:always; margin-bottom:20px;">
          <h4 style="font-family:Arial; color:#2563eb;">Page ${i} Extracted Text:</h4>
          <p style="font-family:Arial; font-size:11pt; color:#333; background:#f8fafc; padding:12px; border:1px solid #e2e8f0; border-radius:6px;">
            ${extractedText || '<em>(Scanned Graphic Content)</em>'}
          </p>
          <br/>
          <img src="${imgData}" style="max-width:100%; height:auto;" />
        </div>
      `;
    }
  } else {
    const dataUrl = await readFileAsDataURL(selectedWordInputFile);
    htmlPages = `
      <div style="text-align:center; padding:10px;">
        <img src="${dataUrl}" style="max-width:100%; height:auto;" />
      </div>
    `;
  }

  const wordTemplate = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>DocPic Document</title></head>
    <body style="font-family:Arial, sans-serif; padding:20px;">
      ${htmlPages}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordTemplate], { type: 'application/msword' });
  triggerDownload(blob, `converted_document.doc`);
  showToast('Word Document Downloaded!', 'success');
}

// PDF Generator
async function generatePdfDocument() {
  if (selectedPdfFiles.length === 0) return;

  const { jsPDF } = window.jspdf;
  const orientation = document.getElementById('pdfOrientation').value;
  const pageSize = document.getElementById('pdfPageSize').value;
  const doc = new jsPDF({ orientation, unit: 'mm', format: pageSize });

  for (let i = 0; i < selectedPdfFiles.length; i++) {
    if (i > 0) doc.addPage();
    const { dataUrl, img } = await loadFileAsImage(selectedPdfFiles[i]);

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const ratio = Math.min((pageW - 20) / img.width, (pageH - 20) / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;

    doc.addImage(dataUrl, 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h);
  }

  doc.save('converted_document.pdf');
  showToast('PDF Document Created!', 'success');
}

// Binary Search KB Compressor Helper
function compressCanvasToTargetKb(canvas, targetKb, mimeType = 'image/jpeg') {
  return new Promise((resolve) => {
    let minQ = 0.01, maxQ = 0.98, bestBlob = null, attempts = 0;

    function step() {
      const midQ = (minQ + maxQ) / 2;
      canvas.toBlob((blob) => {
        attempts++;
        if (!blob) { resolve(bestBlob); return; }
        const currentKb = blob.size / 1024;
        bestBlob = blob;

        if (attempts >= 8 || Math.abs(currentKb - targetKb) < 1.5) {
          resolve(bestBlob);
        } else if (currentKb > targetKb) {
          maxQ = midQ; step();
        } else {
          minQ = midQ; step();
        }
      }, mimeType, midQ);
    }
    step();
  });
}

function readFileAsDataURL(file) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target.result);
    r.readAsDataURL(file);
  });
}

function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}