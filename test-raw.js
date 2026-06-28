const net = require('net');
const fs = require('fs');

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
      resolve(responseData);
    });
    client.on('error', () => resolve(null));
  });
}

async function run() {
  await post('uninitdevice');
  await post('initdevice', { ConnectedDvc: 'MFS500-MorFin', ClientKey: '' });
  
  console.log("Please scan finger now...");
  await new Promise(r => setTimeout(r, 2000));
  
  const cap = await post('capture', { Quality: 40, TimeOut: 15 });
  console.log("Capture raw:", cap);
  
  const tpl = await post('gettemplate', { TmpFormat: 0 });
  fs.writeFileSync('gettemplate_raw.txt', tpl);
  console.log("Wrote gettemplate_raw.txt");
  
  await post('uninitdevice');
}

run();
