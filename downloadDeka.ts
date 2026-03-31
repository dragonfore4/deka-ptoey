import fs from 'fs';
import path from 'path';

export async function downloadDekaPDF(docId: string, folderName: string, browser: any) {
    let page;
    try {
        const url = "https://deka.supremecourt.or.th/printing/deka";
        const payload = new URLSearchParams();
        payload.append('docid', docId);
        payload.append('pdekano', '1');
        payload.append('plitigant', '1');
        payload.append('plaw', '1');
        payload.append('pshorttext', '1');
        payload.append('plongtext', '1');
        payload.append('pjudge', '1');
        payload.append('pprimarycourt', '1');
        payload.append('psource', '1');
        payload.append('pdepartment', '1');
        payload.append('pprimarycourtdekano', '1');
        payload.append('premark', '1');

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: payload.toString(),
            // verbose: true
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const htmlContent = await response.text();

        console.log(`กำลังแปลง ID ${docId} เป็น PDF...`);

        page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000); 

        // 🌟 ท่าไม้ตายที่ 2: เปลี่ยน waitUntil เป็น 'domcontentloaded'
        await page.setContent(htmlContent, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });

        await page.addStyleTag({
            content: `
                .navbar { display: none !important; } 
                body { padding-top: 0 !important; margin: 0 !important; background: white !important; }
                page[size="A4"] { margin-top: 0 !important; box-shadow: none !important; }
            `
        });

        const downloadPath = path.join('downloads', folderName);
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }

        const filePath = path.join(downloadPath, `deka_${docId}.pdf`); 

        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }
        });

        console.log(`✅ แปลงสำเร็จ: ${filePath}`);
        return true;

    } catch (error: any) {
        console.error(`❌ โหลด ID ${docId} พัง:`, error.message);
        return false;
    } finally {
        if (page) await page.close(); 
    }
}