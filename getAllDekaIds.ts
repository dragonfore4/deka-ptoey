// export async function getAllDekaIds(startYear, endYear, totalPages) {
//     const resultList = [];

const GET_DEKA_ID_CONCURRENCY_LIMIT = 5;

//     const fetchPageWithRetry = async (url, payload, retries = 3) => {
//         let lastError;
//         for (let attempt = 1; attempt <= retries; attempt++) {
//             try {
//                 const response = await fetch(url, {
//                     method: "POST",
//                     headers: {
//                         "content-type": "application/x-www-form-urlencoded",
//                         "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
//                     },
//                     body: payload.toString()
//                 });

//                 if (!response.ok) {
//                     throw new Error(`status ${response.status}`);
//                 }

//                 return response.text();
//             } catch (error) {
//                 lastError = error;
//                 if (attempt < retries) {
//                     const delayMs = 800 * attempt;
//                     console.warn(`⚠️ หน้าโหลดไม่สำเร็จ จะลองใหม่ หน้า ${url} (${attempt}/${retries})`);
//                     await new Promise(resolve => setTimeout(resolve, delayMs));
//                 }
//             }
//         }
//         throw lastError;
//     };

//     try {
//         const payload = new URLSearchParams();
//         payload.append('search_form_type', 'basic');
//         payload.append('start', 'true');
//         payload.append('search_type', '1');
//         payload.append('search_deka_start_year', startYear);
//         payload.append('search_deka_end_year', endYear);

//         // วนลูปตามจำนวนหน้า (เริ่มจากหน้า 1 ถึง all_page)
//         for (let i = 1; i <= all_page; i++) {
//             console.log(`กำลังดึงข้อมูลหน้า: ${i}...`);

//             // เปลี่ยน URL ตามเลขหน้า i
//             const url = `https://deka.supremecourt.or.th/search/index/${i}`;

//             let data;
//             try {
//                 data = await fetchPageWithRetry(url, payload, 3);
//             } catch (error) {
//                 console.error(`หน้า ${i} พัง: ${error.message}`);
//                 continue; // ถ้าหน้าไหนพัง ให้ข้ามไปทำหน้าถัดไป
//             }
//             const matches = data.match(/btn_print_\d+/g);

//             if (matches) {
//                 const ids = matches.map(item => item.replace('btn_print_', ''));
//                 console.log(`หน้า ${i} เจอ: ${ids.length} รายการ`);

//                 // เก็บ ID ที่เจอลงใน Array หลัก
//                 resultList.push(...ids);
//             } else {
//                 console.log(`หน้า ${i} ไม่พบข้อมูล`);
//             }

//             // **ข้อแนะนำ**: ควรใส่ delay เล็กน้อยเพื่อไม่ให้โดน Server บล็อก
//             await new Promise(resolve => setTimeout(resolve, 1000)); 
//         }

//         console.log("--------------------------");
//         console.log("สรุปผลการดึงข้อมูลทั้งหมด:");
//         const uniqueIds = [...new Set(resultList)];
//         console.log("จำนวน ID ทั้งหมดที่เก็บได้:", uniqueIds.length);
//         console.log("รายชื่อ ID ทั้งหมด:", uniqueIds);

//         return uniqueIds;

//     } catch (error) {
//         console.error("เกิดข้อผิดพลาดร้ายแรง:", error);
//     }
// }


export async function getAllDekaIds(startYear: number, endYear: number, totalPages: number): Promise<string[]> {
    const resultList: string[] = [];
    const CONCURRENCY_LIMIT = GET_DEKA_ID_CONCURRENCY_LIMIT // ยิงพร้อมกันกี่หน้า (ปรับได้ตามความเหมาะสม)

    const fetchPageWithRetry = async (page: number, payload: URLSearchParams, retries: number = 3) => {
        const url = `https://deka.supremecourt.or.th/search/index/${page}`;
        let lastError;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "content-type": "application/x-www-form-urlencoded",
                        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    },
                    body: payload.toString(),
                    // verbose: true
                });

                if (!response.ok) throw new Error(`status ${response.status}`);

                const data = await response.text();
                const matches = data.match(/btn_print_\d+/g);
                return matches ? matches.map(item => item.replace('btn_print_', '')) : [];

            } catch (error: any) {
                lastError = error;
                const delayMs = 1000 * attempt;
                console.warn(`⚠️ หน้า ${page} พลาด (ครั้งที่ ${attempt}/${retries}): ${error.message}`);
                await new Promise(res => setTimeout(res, delayMs));
            }
        }
        console.error(`❌ ข้ามหน้า ${page} หลังจากพยายามครบ ${retries} ครั้ง`);
        return []; // คืนค่า Array ว่างถ้าพัง เพื่อไม่ให้ Promise.all พังทั้งชุด
    };

    try {
        const payload = new URLSearchParams();
        payload.append('search_form_type', 'basic');
        payload.append('start', 'true');
        payload.append('search_type', '1');
        payload.append('search_deka_start_year', startYear.toString());
        payload.append('search_deka_end_year', endYear.toString());

        // แบ่งหน้าเป็นกลุ่มๆ (Chunks)
        for (let i = 1; i <= totalPages; i += CONCURRENCY_LIMIT) {
            const currentBatch = [];

            // สร้าง Array ของเลขหน้าที่จะดึงในรอบนี้
            for (let j = i; j < i + CONCURRENCY_LIMIT && j <= totalPages; j++) {
                currentBatch.push(j);
            }

            console.log(`🚀 กำลังดึงกลุ่มหน้า: ${currentBatch.join(', ')}...`);

            const batchResults = await Promise.all(
                currentBatch.map(async (page) => {
                    // เรียกใช้ฟังก์ชันดึงข้อมูล (ที่คืนค่าเป็น Array ของ IDs)
                    const ids = await fetchPageWithRetry(page, payload);

                    // LOG ตรงนี้เลย: รายงานผลของหน้านั้นๆ ทันทีที่ดึงเสร็จ
                    if (ids.length > 0) {
                        console.log(`  📄 หน้า ${page}: เจอ ${ids.length} รายการ`);
                    } else {
                        console.log(`  📄 หน้า ${page}: ไม่พบข้อมูลหรือเกิดข้อผิดพลาด`);
                    }

                    return ids; // ส่ง IDs กลับไปให้ Promise.all รวมร่าง
                })
            );

            // รวมผลลัพธ์
            batchResults.forEach(ids => resultList.push(...ids));

            // Delay ระหว่างกลุ่ม (Optional) เพื่อถนอม Server
            if (i + CONCURRENCY_LIMIT <= totalPages) {
                await new Promise(res => setTimeout(res, 500));
            }
        }

        const uniqueIds = [...new Set(resultList)];
        console.log(`✅ เสร็จสิ้น! เก็บได้ทั้งหมด ${uniqueIds.length} IDs`);
        return uniqueIds;

    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดร้ายแรงใน getAllDekaIds:", error);
        return []; // ต้อง return array ว่างเพื่อให้ Type ตรงกับ Promise<string[]>
    }
}