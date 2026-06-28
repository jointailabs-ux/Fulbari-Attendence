const net = require('net');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function post(endpoint, payload = {}) {
  const jsonBody = JSON.stringify(payload);
  const requestStr = [
    `POST /morfinauth/${endpoint} HTTP/1.1`,
    `Host: 127.0.0.1:8030`,
    `Content-Type: application/json`,
    `Content-Length: ${Buffer.byteLength(jsonBody)}`,
    `Connection: close`,
    ``,
    jsonBody
  ].join('\r\n');

  return new Promise((resolve) => {
    const client = new net.Socket();
    let responseData = '';
    client.connect(8030, '127.0.0.1', () => { client.write(requestStr); });
    client.on('data', (data) => { responseData += data.toString(); });
    client.on('close', () => {
      const parts = responseData.split('\r\n\r\n');
      const bodyStr = parts.length > 1 ? parts.slice(1).join('\r\n\r\n') : '';
      try { resolve({ data: JSON.parse(bodyStr), raw: bodyStr }); } catch(e) { resolve({ data: bodyStr, raw: bodyStr }); }
    });
    client.on('error', () => resolve({ data: null }));
  });
}

async function capture() {
  const cap = await post('capture', { Quality: 40, TimeOut: 15 });
  if (cap.data && (cap.data.ErrorCode === 0 || cap.data.ErrorCode === "0")) {
    const tpl = await post('gettemplate', { TmpFormat: 0 });
    return tpl.data.TemplateBase64 || tpl.data.TemplateData || tpl.data.ImgData;
  }
  return null;
}

async function run() {
  console.log("=== MorFin MFS500 Verification Debugger ===");
  await post('uninitdevice');
  const init = await post('initdevice', { ConnectedDvc: 'MFS500', ClientKey: '' });
  if (init.data.ErrorCode !== 0 && init.data.ErrorCode !== "0") {
     console.log("Failed to init device:", init.data);
     process.exit(1);
  }
  
  await ask("Press ENTER to scan your RIGHT THUMB...");
  console.log("Scanning...");
  const t1 = await capture();
  console.log("Template 1 Length:", t1 ? t1.length : 0);
  
  await ask("Press ENTER to lift and scan your RIGHT THUMB AGAIN...");
  console.log("Scanning...");
  const t2 = await capture();
  console.log("Template 2 Length:", t2 ? t2.length : 0);
  
  await ask("Press ENTER to scan a DIFFERENT finger (e.g. INDEX)...");
  console.log("Scanning...");
  const t3 = await capture();
  console.log("Template 3 Length:", t3 ? t3.length : 0);
  
  console.log("\n--- VERIFY RESULTS ---");
  if (t1 && t2) {
    const v1 = await post('verify', { GalleryTemplate: t1, ProbeTemplate: t2 });
    console.log("RIGHT THUMB vs RIGHT THUMB (Expected: MATCH):", v1.data);
  }
  
  if (t1 && t3) {
    const v2 = await post('verify', { GalleryTemplate: t1, ProbeTemplate: t3 });
    console.log("RIGHT THUMB vs INDEX (Expected: NO MATCH):", v2.data);
  }
  
  if (t1) {
    const v3 = await post('verify', { GalleryTemplate: t1, ProbeTemplate: t1 });
    console.log("RIGHT THUMB vs ITSELF (Exact same string):", v3.data);
  }
  
  await post('uninitdevice');
  process.exit(0);
}

run();
