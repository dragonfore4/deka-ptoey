export async function getTotalPages(startYear: number | string, endYear: number | string): Promise<number> {
    try {

        const payload = new URLSearchParams();
        payload.append('search_form_type', 'basic');
        payload.append('start', 'true');
        payload.append('search_type', '1');
        payload.append('search_deka_start_year', startYear.toString());
        payload.append('search_deka_end_year', endYear.toString());
        // get count page numbers
        const response = await fetch("https://deka.supremecourt.or.th/search", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "th-TH,th;q=0.9,en;q=0.8,zh-CN;q=0.7,zh;q=0.6",
                "cache-control": "no-cache",
                "content-type": "application/x-www-form-urlencoded",
                "pragma": "no-cache",
                "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"",
                "sec-ch-ua-mobile": "?1",
                "sec-ch-ua-platform": "\"Android\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1"
            },
            "referrer": "https://deka.supremecourt.or.th/",
            "body": payload.toString(),
            "method": "POST",
            "mode": "cors",
            "credentials": "include",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.text();
        // console.log("eiei",data)

        // ค้นหาข้อความ "หน้า 1 / 16" หรือเลขหน้าที่อยู่หลังเครื่องหมาย /
        const match = data.match(/หน้า\s*\d+\s*\/\s*(\d+)/);

        if (match && match[1]) {
            const totalPages = parseInt(match[1], 10);
            console.log(`🔍 ตรวจพบ: ${match[0]}`);
            console.log(`📄 จำนวนหน้าทั้งหมดคือ: ${totalPages}`);
            return totalPages;
        }
        return 0; // เผื่อกรณีหาไม่เจอ ให้ return 0      
    } catch (error) {
        console.error("❌ Error in getTotalPages:", error);
        return 0;
    }
}