const eps = ["verify"];

async function test() {
  for (const ep of eps) {
    try {
      const res = await fetch(`http://localhost:8030/morfinauth/${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          "ProbTemplate": "",
          "GalleryTemplate": "",
          "TmpFormat": 0
        })
      });
      const text = await res.text();
      console.log(`POST /${ep} -> Status: ${res.status}, Response: ${text.substring(0, 50)}`);
    } catch (e) {
      console.log(`POST /${ep} -> Error: ${e.message}`);
    }
  }
}

test();
