const endpoints = [
  "verify", "Verify", "match", "Match", 
  "morfinauth/verify", "morfinauth/Verify", 
  "morfinauth/match", "morfinauth/Match"
];

async function test() {
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://127.0.0.1:8030/${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const text = await res.text();
      console.log(`POST /${ep} -> Status: ${res.status}, Response: ${text.substring(0, 50)}`);
    } catch (e) {
      console.log(`POST /${ep} -> Error: ${e.message}`);
    }
  }
}

test();
