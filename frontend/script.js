// Frontend logic: supports three inputs (file upload, browser file, image URL).
// Two compress methods:
//  - compressBtn -> send to backend /compress
//  - compressClientBtn -> client-side compression using canvas (fallback)

const fileInput = document.getElementById('fileInput');
const browserInput = document.getElementById('browserInput');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');

const resizeRange = document.getElementById('resizeRange');
const resizeVal = document.getElementById('resizeVal');
const qualityRange = document.getElementById('qualityRange');
const qualityVal = document.getElementById('qualityVal');

const compressBtn = document.getElementById('compressBtn');
const compressClientBtn = document.getElementById('compressClientBtn');

const previewImg = document.getElementById('previewImg');
const downloadLink = document.getElementById('downloadLink');

let selectedFile = null;
let selectedImageObj = null; // Image object for client compress

// Update sliders
resizeRange.addEventListener('input', () => { resizeVal.textContent = resizeRange.value; });
qualityRange.addEventListener('input', () => { qualityVal.textContent = qualityRange.value; });

// Handle file inputs
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
browserInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

function handleFile(file) {
  if (!file) return;
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    previewImg.src = ev.target.result;
    // create Image object for client-side compress
    selectedImageObj = new Image();
    selectedImageObj.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// Load from URL
loadUrlBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) { alert('Please enter an image URL'); return; }
  // show preview
  previewImg.src = url;
  selectedFile = null;
  selectedImageObj = new Image();
  selectedImageObj.crossOrigin = "anonymous";
  selectedImageObj.src = url;
});

// Compress by calling backend
compressBtn.addEventListener('click', async () => {
  const percent = parseInt(resizeRange.value);
  const quality = parseInt(qualityRange.value);

  const formData = new FormData();
  formData.append('percent', percent);
  formData.append('quality', quality);

  // If we have file selected => send multipart file
  if (selectedFile) {
    formData.append('image', selectedFile);
  } else if (urlInput.value.trim()) {
    // send URL for backend to fetch
    formData.append('image_url', urlInput.value.trim());
  } else {
    alert('Please upload a file or provide an image URL.');
    return;
  }

  try {
    compressBtn.disabled = true;
    compressBtn.textContent = 'Compressing...';
    const resp = await fetch('http://localhost:5000/compress', {
      method: 'POST',
      body: formData
    });

    if (!resp.ok) {
      const err = await resp.json().catch(()=>null);
      alert('Server error: ' + (err?.error || resp.statusText));
      return;
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    previewImg.src = url;
    downloadLink.href = url;
    downloadLink.style.display = 'inline-block';
    downloadLink.textContent = 'Download Compressed Image';
  } catch (err) {
    alert('Network or server error: ' + err.message);
  } finally {
    compressBtn.disabled = false;
    compressBtn.textContent = 'Compress (server)';
  }
});

// Client-side compression fallback (uses canvas)
compressClientBtn.addEventListener('click', async () => {
  if (!selectedImageObj || !selectedImageObj.src) {
    alert('Load an image first (upload or URL).');
    return;
  }

  const percent = parseInt(resizeRange.value);
  const quality = parseInt(qualityRange.value) / 100; // toDataURL quality 0..1

  // Ensure image is loaded
  if (!selectedImageObj.complete) {
    selectedImageObj.onload = () => doClientCompress(selectedImageObj, percent, quality);
  } else {
    doClientCompress(selectedImageObj, percent, quality);
  }
});

function doClientCompress(imgObj, percent, quality) {
  const canvas = document.createElement('canvas');
  const scale = percent / 100;
  canvas.width = Math.max(1, Math.round(imgObj.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(imgObj.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgObj, 0, 0, canvas.width, canvas.height);

  // Convert to blob
  canvas.toBlob((blob) => {
    if (!blob) { alert('Compression failed'); return; }
    const url = URL.createObjectURL(blob);
    previewImg.src = url;
    downloadLink.href = url;
    downloadLink.style.display = 'inline-block';
    downloadLink.textContent = 'Download Compressed Image';
  }, 'image/jpeg', quality);
}
