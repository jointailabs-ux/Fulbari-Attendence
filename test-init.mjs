async function test() {
  try {
    const MORFIN_URI = "http://127.0.0.1:8030/morfinauth";
    const initRes = await fetch(`${MORFIN_URI}/initdevice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ConnectedDvc: "MFS500", ClientKey: "" })
    });
    const text = await initRes.text();
    console.log(`initdevice -> Status: ${initRes.status}, Response: ${text}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

test();
