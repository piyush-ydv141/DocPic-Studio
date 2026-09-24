# 📸 DocPic Studio Pro — Universal Image & PDF Govt Suite

**DocPic Studio Pro** is a privacy-first, 100% browser-based web application designed to prepare official government documents, passport photos, scanned signatures, and PDF files. Every tool natively accepts both **Image formats (JPG, PNG, WEBP)** and **PDF documents**.

---

## ✨ Features

- **🛂 Passport & Govt Photo Resizer**:
  - Presets for Indian Passport, US Visa, UPSC/SSC, and PAN Card.
  - Custom dimension settings (`cm`, `mm`, `px`, `inch`) and DPI control (`300 DPI`, `200 DPI`).
  - Interactive cropping powered by Cropper.js.

- **✍️ Signature Cleaner**:
  - Shadow and background noise removal.
  - Ink color switching (Deep Black / Official Blue).
  - Background choices: Clean White (JPG) or Transparent (PNG).

- **🎛️ Image & PDF Enhancer**:
  - Fine-tune Brightness, Contrast, and Color Saturation.
  - One-click **Auto-Enhance** mode for scanned documents.

- **🗜️ Target KB Size Compressor**:
  - Compress images and PDF pages down to specific size limits (e.g., `< 50 KB`, `< 20 KB`).
  - Binary search algorithm for precision compression without heavy quality loss.

- **📄 PDF & Word Converters**:
  - **PDF / Image to Word (.doc)**: Extracts text content and visual page layouts into editable Word files.
  - **Image / PDF to Formatted PDF**: Merge and convert images or PDFs into standard A4 or Letter PDFs.

---

## 🔒 100% Client-Side & Private

- **Zero Server Uploads**: All file rendering, cropping, enhancement, and conversion happen entirely inside your web browser using Web APIs.
- Your personal documents, signatures, and photos **never leave your device**.

---

## 🛠️ Built With

- **HTML5 & CSS3**
- **Tailwind CSS** (via CDN)
- **Vanilla JavaScript (ES6+)**
- **Libraries**:
  - [PDF.js](https://mozilla.github.io/pdf.js/) — PDF Rendering Engine
  - [Cropper.js](https://fengyuanchen.github.io/cropperjs/) — Photo Cropping Tool
  - [jsPDF](https://github.com/parallax/jsPDF) — PDF Generation
  - [Lucide Icons](https://lucide.dev/) — UI Iconography

---

## 🚀 Quick Start

No backend server or complex build process required!

1. Clone or download the repository:
   ```bash
   git clone [https://github.com/YOUR-USERNAME/docpic-studio.git](https://github.com/YOUR-USERNAME/docpic-studio.git)