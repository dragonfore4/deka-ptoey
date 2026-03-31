import { getAllDekaIds } from './getAllDekaIds.js';
import { downloadDekaPDF } from './downloadDeka.js';
import { getTotalPages } from './getTotalpages.js';
import { chromium, type Browser } from 'playwright';

async function launchBrowser(): Promise<Browser> {
    const launchOptions = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions'
        ]
    };

    try {
        return await chromium.launch({ ...launchOptions, channel: 'chrome' });
    } catch (error) {
        console.warn('⚠️ เปิด Chrome channel ไม่ได้, fallback ไปใช้ Chromium ของ Playwright');
        return chromium.launch(launchOptions);
    }
}

async function startWorkflow(startYear: number, endYear: number) {
    console.log(`🚀 เริ่มต้นดึงข้อมูลฎีกาปี ${startYear} - ${endYear}`);
    let browser = await launchBrowser();

    try {
        // STEP 1: หาจำนวนหน้าทั้งหมดก่อน
        const totalPages = await getTotalPages(startYear, endYear);
        
        if (!totalPages) {
            console.log("❌ ไม่พบจำนวนหน้าข้อมูล");
            return;
        }

        // STEP 2: ดึงรายการ ID ทั้งหมดจากทุกหน้า
        const allIds = await getAllDekaIds(startYear, endYear, totalPages);

        if (!allIds || allIds.length === 0) {
            console.log("❌ ไม่พบเลข ID ฎีกา");
            return;
        }

        // STEP 3: โหลดแบบขนาน (Concurrent Batching)
        const folderName = `${startYear}-${endYear}-${allIds.length}`;
        const CONCURRENCY_LIMIT = DOWNLOAD_CONCURRENCY_LIMIT;
        const RETRY_LIMIT = 2;

        console.log(`📂 เริ่มดาวน์โหลด PDF ทั้งหมด ${allIds.length} ไฟล์ (ทีละ ${CONCURRENCY_LIMIT} ไฟล์)...`);

        for (let i = 0; i < allIds.length; i += CONCURRENCY_LIMIT) {
            // หั่น Array ออกเป็นก้อนเล็กๆ ตาม CONCURRENCY_LIMIT
            const batch = allIds.slice(i, i + CONCURRENCY_LIMIT);
            
            console.log(`\n⏳ กำลังดาวน์โหลดชุดที่ ${Math.floor(i / CONCURRENCY_LIMIT) + 1} (IDs: ${batch.join(', ')})`);
            
            // สั่งโหลดพร้อมกันใน Batch นี้
            let results = await Promise.all(
                batch.map(docId => downloadDekaPDF(docId, folderName, browser))
            );

            let failedIds = batch.filter((_, idx) => !results[idx]);

            // ถ้ารอบหลักพลาด ให้ retry เฉพาะรายการที่พัง โดยตรวจ browser และเปิดใหม่ถ้าหลุด
            for (let attempt = 1; attempt <= RETRY_LIMIT && failedIds.length > 0; attempt++) {
                if (!browser.isConnected()) {
                    console.warn('⚠️ Browser หลุดระหว่างดาวน์โหลด, กำลังเปิดใหม่เพื่อ retry...');
                    browser = await launchBrowser();
                }

                console.warn(`🔁 Retry รอบที่ ${attempt}/${RETRY_LIMIT} สำหรับ ${failedIds.length} IDs`);
                results = await Promise.all(
                    failedIds.map(docId => downloadDekaPDF(docId, folderName, browser))
                );
                failedIds = failedIds.filter((_, idx) => !results[idx]);
            }

            if (failedIds.length > 0) {
                console.error(`❌ ข้าม ${failedIds.length} IDs ในชุดนี้: ${failedIds.join(', ')}`);
            }
            
            // หน่วงเวลาเล็กน้อยระหว่างแต่ละชุด เพื่อป้องกันเซิร์ฟเวอร์แบน IP
            if (i + CONCURRENCY_LIMIT < allIds.length) {
                console.log(`พัก 4 วินาทีก่อนขึ้นชุดต่อไป...`);
                await new Promise(resolve => setTimeout(resolve, 4000));
            }
        }
        
        // for (const docId of allIds) {
        //     await downloadDekaPDF(docId, folderName, browser);
            
        //     // สำคัญ: ใส่ delay ระหว่างไฟล์ (เช่น 2 วินาที) กันโดนบล็อก
        //     await new Promise(resolve => setTimeout(resolve, 2000));
        // }

        console.log("✨ ภารกิจเสร็จสิ้น! ข้อมูลทั้งหมดถูกบันทึกลงโฟลเดอร์ downloads");

    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดใน Workflow:", error);
    } finally {
        if (browser.isConnected()) {
            await browser.close();
        }
    }
}

export const DOWNLOAD_CONCURRENCY_LIMIT = 20; // ลดลงเพื่อให้ browser เสถียรมากขึ้นตอนสร้าง PDF พร้อมกันหลายไฟล์
export const GET_DEKA_ID_CONCURRENCY_LIMIT = 5; 

const YEAR_RANGES = [
    // { startYear: 2568, endYear: 2569 },
    // { startYear: 2567, endYear: 2568 }
    { startYear: 2566, endYear: 2567 },
    { startYear: 2565, endYear: 2566 }
];

async function runAllYearRanges() {
    for (const { startYear, endYear } of YEAR_RANGES) {
        await startWorkflow(startYear, endYear);
    }
}

// เรียกใช้งาน
runAllYearRanges();