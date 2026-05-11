import fs from "fs";
import path from "path";

const DEKA_PRINT_URL = "https://deka.supremecourt.or.th/printing/deka";
const GOTENBERG_BASE_URL = (process.env.GOTENBERG_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const GOTENBERG_HTML_URL = `${GOTENBERG_BASE_URL}/forms/chromium/convert/html`;

function buildPayload(docId: string) {
  const payload = new URLSearchParams();
  payload.append("docid", docId);
  payload.append("pdekano", "1");
  payload.append("plitigant", "1");
  payload.append("plaw", "1");
  payload.append("pshorttext", "1");
  payload.append("plongtext", "1");
  payload.append("pjudge", "1");
  payload.append("pprimarycourt", "1");
  payload.append("psource", "1");
  payload.append("pdepartment", "1");
  payload.append("pprimarycourtdekano", "1");
  payload.append("premark", "1");
  return payload;
}

function ensureDownloadPath(folderName: string) {
  const downloadPath = path.join("downloads", folderName);

  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  return downloadPath;
}

function looksLikePdf(contentType: string, body: Buffer) {
  return (
    contentType.includes("application/pdf") ||
    body.slice(0, 4).toString("utf8") === "%PDF"
  );
}

function prepareHtmlForGotenberg(htmlContent: string) {
  const styleBlock = `
    <style>
      .navbar { display: none !important; }
      body { padding-top: 0 !important; margin: 0 !important; background: white !important; }
      page[size="A4"] { margin-top: 0 !important; box-shadow: none !important; }
    </style>
  `;
  const baseTag = '<base href="https://deka.supremecourt.or.th/">';

  if (htmlContent.includes("</head>")) {
    return htmlContent.replace("</head>", `${baseTag}${styleBlock}</head>`);
  }

  return `${styleBlock}${baseTag}${htmlContent}`;
}

async function renderWithGotenberg(htmlContent: string, filePath: string) {
  const formData = new FormData();
  formData.append(
    "files",
    new Blob([prepareHtmlForGotenberg(htmlContent)], { type: "text/html" }),
    "index.html",
  );

  const response = await fetch(GOTENBERG_HTML_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gotenberg error! status: ${response.status} ${message}`);
  }

  const pdfBytes = Buffer.from(await response.arrayBuffer());

  if (!looksLikePdf(response.headers.get("content-type") || "", pdfBytes)) {
    throw new Error("Gotenberg returned a non-PDF response");
  }

  fs.writeFileSync(filePath, pdfBytes);
  console.log(`✅ แปลงสำเร็จผ่าน Gotenberg: ${filePath}`);
}

export async function downloadDekaPDF(docId: string, folderName: string) {
  try {
    const payload = buildPayload(docId);
    const downloadPath = ensureDownloadPath(folderName);
    const filePath = path.join(downloadPath, `deka_${docId}.pdf`);

    const response = await fetch(DEKA_PRINT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: payload.toString(),
      // verbose: true
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    const body = Buffer.from(await response.arrayBuffer());

    if (looksLikePdf(contentType, body)) {
      fs.writeFileSync(filePath, body);
      console.log(`✅ บันทึก PDF ตรงจากเซิร์ฟเวอร์: ${filePath}`);
      return true;
    }

    const htmlContent = body.toString("utf8");
    console.log(`กำลังส่ง ID ${docId} ไปแปลงด้วย Gotenberg...`);

    await renderWithGotenberg(htmlContent, filePath);
    return true;
  } catch (error: any) {
    console.error(`❌ โหลด ID ${docId} พัง:`, error.message);
    return false;
  }
}
