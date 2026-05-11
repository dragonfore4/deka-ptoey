import { getAllDekaIds } from "./getAllDekaIds.js";
import { downloadDekaPDF } from "./downloadDeka.js";
import { getTotalPages } from "./getTotalpages.js";

async function startWorkflow(startYear: number, endYear: number) {
  console.log(`🚀 เริ่มต้นดึงข้อมูลฎีกาปี ${startYear} - ${endYear}`);

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
    const folderName = `${startYear}-${endYear}`;
    const CONCURRENCY_LIMIT = DOWNLOAD_CONCURRENCY_LIMIT;

    console.log(
      `📂 เริ่มดาวน์โหลด PDF ทั้งหมด ${allIds.length} ไฟล์ (ทีละ ${CONCURRENCY_LIMIT} ไฟล์)...`,
    );

    for (let i = 0; i < allIds.length; i += CONCURRENCY_LIMIT) {
      // หั่น Array ออกเป็นก้อนเล็กๆ ตาม CONCURRENCY_LIMIT
      const batch = allIds.slice(i, i + CONCURRENCY_LIMIT);

      console.log(
        `\n⏳ กำลังดาวน์โหลดชุดที่ ${Math.floor(i / CONCURRENCY_LIMIT) + 1} (IDs: ${batch.join(", ")})`,
      );

      // สั่งโหลดพร้อมกันใน Batch นี้
      await Promise.all(
        batch.map((docId) => downloadDekaPDF(docId, folderName)),
      );

      // หน่วงเวลาเล็กน้อยระหว่างแต่ละชุด เพื่อป้องกันเซิร์ฟเวอร์แบน IP
      if (i + CONCURRENCY_LIMIT < allIds.length) {
        console.log(`พัก 4 วินาทีก่อนขึ้นชุดต่อไป...`);
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    }

    // for (const docId of allIds) {
    //     await downloadDekaPDF(docId, folderName, browser);

    //     // สำคัญ: ใส่ delay ระหว่างไฟล์ (เช่น 2 วินาที) กันโดนบล็อก
    //     await new Promise(resolve => setTimeout(resolve, 2000));
    // }

    console.log(
      "✨ ภารกิจเสร็จสิ้น! ข้อมูลทั้งหมดถูกบันทึกลงโฟลเดอร์ downloads",
    );
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดใน Workflow:", error);
  }
}

export const DOWNLOAD_CONCURRENCY_LIMIT = 20; // จำนวนไฟล์ที่โหลดพร้อมกัน (ปรับเพิ่ม/ลดได้ตามสเปคคอม)
export const GET_DEKA_ID_CONCURRENCY_LIMIT = 5;

const YEAR_RANGES = [
  { startYear: 2568, endYear: 2569 },
  { startYear: 2567, endYear: 2568 },
];

async function runAllYearRanges() {
  for (const { startYear, endYear } of YEAR_RANGES) {
    await startWorkflow(startYear, endYear);
  }
}

// เรียกใช้งาน
runAllYearRanges();
