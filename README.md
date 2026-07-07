# PDF_Sentence_Navigator
---

# PDF Sentence Navigator

A Chrome Extension that allows you to navigate between sentences in a PDF document using your keyboard:

* **TAB** → Move to the next sentence
* **SHIFT + TAB** → Return to the previous sentence

The active sentence is visually highlighted within the PDF.

---

## Installation

1. Download this repository (using `git clone` or as a ZIP file).
2. Open Chrome and navigate to Extensions (`chrome://extensions/`).
3. Enable **Developer Mode** (in the top-right corner).
4. Click **Load unpacked** and select the project folder (`pdf-sentence-navigator`).

---

## Usage

* Open any PDF file in Chrome.
* The extension will automatically redirect you to its built-in viewer (`viewer.html`).
* Use TAB / SHIFT+TAB to navigate through the sentences.
* The active sentence will be emphasized with a visual highlight.

---

## File Structure

* `manifest.json` — Extension configuration (Manifest V3).
* `viewer.html`, `viewer.js`, `viewer.css` — The main viewer where the PDF is loaded and sentence navigation takes place.
* `popup.html`, `popup.js`, `popup.css` — The extension's popup window.
* `rules.json` — Redirect rules for PDF files.
* `pdfjs/` — The pdf.js library used for text extraction.
* `.gitignore` — For excluding auxiliary files.

---

## Limitations

Not all PDF files store text in the same way.

In some cases, sentence extraction might not work perfectly, or certain words might be missed.

This depends entirely on the internal structure of the PDF (e.g., scanned or OCR-processed files).

---

## Troubleshooting

* If you encounter an **ERR_FILE_NOT_FOUND** error in the Console, double-check that the pdf.js files are correctly placed inside the `pdfjs/` folder.
* The `_metadata` folder is not required — you can safely delete it or add it to your `.gitignore`.

---

## Author

Nika Giorgobiani
