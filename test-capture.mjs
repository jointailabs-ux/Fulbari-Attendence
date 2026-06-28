async function test() {
  try {
    const res = await fetch(`http://127.0.0.1:8030/morfinauth/capture`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        "Quality": 60,
        "TimeOut": 10
      })
    });
    const text = await res.text();
    console.log(`POST /capture -> Status: ${res.status}, Response: ${text.substring(0, 100)}`);
  } catch (e) {
    console.log(`POST /capture -> Error: ${e.message}`);
  }
}

test();
