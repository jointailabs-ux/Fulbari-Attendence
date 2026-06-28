const net = require('net');

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

async function run() {
  await post('uninitdevice');
  await post('initdevice', { ConnectedDvc: 'MFS500', ClientKey: '' });
  
  const tpl = await post('gettemplate', { TmpFormat: 0 });
  console.log("Keys:", Object.keys(tpl.data));
  console.log("Raw:", tpl.raw.substring(0, 200));
  
  await post('uninitdevice');
}

run();
