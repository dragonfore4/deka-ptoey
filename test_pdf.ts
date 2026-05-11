async function test() {
  const url = "https://deka.supremecourt.or.th/printing/deka";
  const payload = new URLSearchParams();
  payload.append("docid", "1"); // use a generic id
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

  console.log("Testing with Accept: application/pdf...");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Accept: "application/pdf",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    body: payload.toString(),
  });
  console.log("Status:", response.status);
  console.log("Content-Type:", response.headers.get("content-type"));
}

test().catch(console.error);
