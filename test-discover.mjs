async function test() {
  try {
    const res = await fetch(`http://127.0.0.1:8030/morfinauth/connecteddevicelist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
    const text = await res.text();
    console.log(`POST /connecteddevicelist -> Status: ${res.status}, Response: ${text.substring(0, 100)}`);
  } catch (e) {
    console.log(`POST /connecteddevicelist -> Error: ${e.message}`);
  }
}

test();
