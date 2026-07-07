// viewer.js
// PDF Sentence Navigator
// -----------------------------------------------------------------------

import * as pdfjsLib from "./pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "./pdfjs/pdf.worker.mjs",
  import.meta.url,
).href;

const SCALE = 1.5;

const pdfPagesEl = document.getElementById("pdfPages");
const statusTextEl = document.getElementById("statusText");
const sentenceCounterEl = document.getElementById("sentenceCounter");
const filePicker = document.getElementById("filePicker");
const pickLabel = document.getElementById("pickLabel");

let fullText = "";
let spanRanges = [];
let sentences = [];
let currentSentenceIndex = -1;

// -------------------------------------------------------------------------
// 1. წყაროს დადგენა
// -------------------------------------------------------------------------

function getFileParam() {
  const search = window.location.search;
  const idx = search.indexOf("file=");
  if (idx === -1) return null;
  return search.substring(idx + 5);
}

async function init() {
  const fileParam = getFileParam();
  if (fileParam) {
    setStatus("იტვირთება: " + decodeURIComponent(fileParam));
    try {
      const res = await fetch(fileParam);
      const buf = await res.arrayBuffer();
      await loadPdf(buf);
    } catch (err) {
      setStatus("ვერ მოხერხდა ჩატვირთვა: " + err.message);
    }
  } else {
    setStatus("აირჩიე PDF ფაილი ზემოთ მოცემული ღილაკით.");
  }
}

filePicker.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setStatus("იტვირთება: " + file.name);
  const buf = await file.arrayBuffer();
  await loadPdf(buf);
});

// -------------------------------------------------------------------------
// 2. PDF-ის ჩატვირთვა და რენდერი
// -------------------------------------------------------------------------

async function loadPdf(arrayBuffer) {
  pdfPagesEl.innerHTML = "";
  fullText = "";
  spanRanges = [];
  sentences = [];
  currentSentenceIndex = -1;

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    await renderPage(page);
    setStatus(`გვერდი ${pageNum} / ${pdf.numPages}`);
  }

  buildSentences();
  setStatus(
    `ჩატვირთულია — ${pdf.numPages} გვერდი, ${sentences.length} წინადადება`,
  );
  updateCounter();

  if (sentences.length > 0) {
    goToSentence(0);
  }
}

async function renderPage(page) {
  const viewport = page.getViewport({ scale: SCALE });

  const pageDiv = document.createElement("div");
  pageDiv.className = "pdf-page";
  pageDiv.style.width = viewport.width + "px";
  pageDiv.style.height = viewport.height + "px";

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");

  const textLayerDiv = document.createElement("div");
  textLayerDiv.className = "text-layer";

  pageDiv.appendChild(canvas);
  pageDiv.appendChild(textLayerDiv);
  pdfPagesEl.appendChild(pageDiv);

  await page.render({ canvasContext: ctx, viewport }).promise;

  // ✅ normalizeWhitespace ჩართულია
  const textContent = await page.getTextContent({ normalizeWhitespace: true });
  addTextLayer(textContent, viewport, textLayerDiv);
}

// -------------------------------------------------------------------------
// 3. ტექსტის ფენის აგება
// -------------------------------------------------------------------------

function addTextLayer(textContent, viewport, container) {
  textContent.items.forEach((item) => {
    if (!item.str) {
      if (item.hasEOL) fullText += "\n";
      return;
    }

    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const angle = Math.atan2(tx[1], tx[0]);
    const fontHeight = Math.hypot(tx[2], tx[3]);
    const widthPx = item.width * SCALE;

    const span = document.createElement("span");
    span.textContent = item.str;
    span.style.left = tx[4] + "px";
    span.style.top = tx[5] - fontHeight + "px";
    span.style.fontSize = fontHeight + "px";
    span.style.width = widthPx + "px";
    if (Math.abs(angle) > 0.01) {
      span.style.transform = `rotate(${angle}rad)`;
    }
    container.appendChild(span);

    const start = fullText.length;
    fullText += item.str;
    const end = fullText.length;
    spanRanges.push({ el: span, start, end });

    if (item.hasEOL) {
      fullText += "\n";
    } else {
      fullText += " ";
    }
  });
}

// -------------------------------------------------------------------------
// 4. წინადადებებად დაყოფა
// -------------------------------------------------------------------------

function buildSentences() {
  const SENTENCE_END_RE = /[^.!?…;:\n]*[.!?…;:]+[)"'»]*\s*/g;
  let match;
  let lastIndex = 0;
  SENTENCE_END_RE.lastIndex = 0;

  while ((match = SENTENCE_END_RE.exec(fullText)) !== null) {
    const text = match[0].trim();
    if (text.length > 0) {
      sentences.push({
        start: match.index,
        end: match.index + match[0].length,
        text,
      });
    }
    lastIndex = SENTENCE_END_RE.lastIndex;
    if (match[0].length === 0) SENTENCE_END_RE.lastIndex++;
  }

  if (lastIndex < fullText.length) {
    const rest = fullText.slice(lastIndex).trim();
    if (rest.length > 0) {
      sentences.push({ start: lastIndex, end: fullText.length, text: rest });
    }
  }
}

// -------------------------------------------------------------------------
// 5. ნავიგაცია და გამოკვეთა
// -------------------------------------------------------------------------

function getSpansInRange(start, end) {
  return spanRanges
    .filter((r) => r.start < end && r.end > start)
    .map((r) => r.el);
}

function clearHighlight() {
  document
    .querySelectorAll(".sentence-active")
    .forEach((el) => el.classList.remove("sentence-active"));
}

function goToSentence(index) {
  if (index < 0 || index >= sentences.length) return;
  clearHighlight();
  currentSentenceIndex = index;
  const s = sentences[index];
  const spans = getSpansInRange(s.start, s.end);
  spans.forEach((el) => el.classList.add("sentence-active"));
  if (spans.length > 0) {
    spans[0].scrollIntoView({ block: "center", behavior: "smooth" });
  }
  updateCounter();
}

function nextSentence() {
  if (sentences.length === 0) return;
  const next =
    currentSentenceIndex + 1 >= sentences.length
      ? sentences.length - 1
      : currentSentenceIndex + 1;
  goToSentence(next);
}

function prevSentence() {
  if (sentences.length === 0) return;
  const prev = currentSentenceIndex - 1 < 0 ? 0 : currentSentenceIndex - 1;
  goToSentence(prev);
}

function updateCounter() {
  if (sentences.length === 0) {
    sentenceCounterEl.textContent = "";
    return;
  }
  sentenceCounterEl.textContent = `წინადადება ${currentSentenceIndex + 1} / ${sentences.length}`;
}

function setStatus(text) {
  statusTextEl.textContent = text;
}

// -------------------------------------------------------------------------
// 6. კლავიატურის მართვა
// -------------------------------------------------------------------------

document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    if (e.shiftKey) {
      prevSentence();
    } else {
      nextSentence();
    }
  }
});

init();
