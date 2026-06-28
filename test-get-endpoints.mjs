const endpoints = [
  "verify", "Verify", "match", "Match", 
  "morfinauth/verify", "morfinauth/Verify", 
  "morfinauth/match", "morfinauth/Match"
];

async function test() {
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://127.0.0.1:8030/${ep}`);
      const text = await res.text();
      console.log(`GET /${ep} -> Status: ${res.status}, Response: ${text.substring(0, 50)}`);
    } catch (e) {
      console.log(`GET /${ep} -> Error: ${e.message}`);
    }
  }
}

test();
