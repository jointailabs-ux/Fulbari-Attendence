import net from 'net';

async function post(endpoint, body = {}) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const req = `POST /morfinauth/${endpoint} HTTP/1.1\r\nHost: 127.0.0.1:8030\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(payload)}\r\nConnection: close\r\n\r\n${payload}`;
    
    const client = new net.Socket();
    let responseData = "";
    client.connect(8030, '127.0.0.1', () => { client.write(req); });
    client.on('data', data => { responseData += data.toString(); });
    client.on('close', () => {
      const parts = responseData.split('\r\n\r\n');
      const bodyStr = parts.length > 1 ? parts.slice(1).join('\r\n\r\n') : "";
      
      let data = {};
      if (bodyStr) {
        try { data = JSON.parse(bodyStr); }
        catch (e) { data = { Raw: bodyStr.substring(0, 500) + '...' }; }
      }
      resolve(data);
    });
  });
}

async function run() {
  console.log("Uninit...");
  await post("uninitdevice");
  console.log("Init...");
  await post("initdevice", { ConnectedDvc: "MFS500", ClientKey: "" });
  console.log("Waiting 3s for you to place finger...");
  await new Promise(r => setTimeout(r, 3000));
  console.log("Capturing...");
  const cap = await post("capture", { Quality: 40, TimeOut: 15 });
  console.log("Capture res:", cap);
  if (cap.ErrorCode == 0) {
    console.log("Getting template...");
    const tpl = await post("gettemplate", { TmpFormat: 0 });
    console.log("Template keys:", Object.keys(tpl));
    console.log("Template snippet:", JSON.stringify(tpl).substring(0, 150));
  }
}
run();
