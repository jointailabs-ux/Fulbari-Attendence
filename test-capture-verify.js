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
      try { resolve({ data: JSON.parse(bodyStr) }); } catch(e) { resolve({ data: bodyStr }); }
    });
    client.on('error', () => resolve({ data: null }));
  });
}

async function run() {
  const devList = await post('connecteddevicelist');
  let deviceName = devList.data.DeviceList ? devList.data.DeviceList[0] : null;
  if (!deviceName && devList.data.ErrorDescription) {
    const parts = devList.data.ErrorDescription.split(":");
    if (parts.length > 1) {
      deviceName = parts[1].trim().split(",")[0];
    }
  }
  
  if (!deviceName) {
    console.log("No device connected!");
    return;
  }
  console.log("Found device:", deviceName);

  await post('uninitdevice');
  console.log('Init:', await post('initdevice', { ConnectedDvc: deviceName, ClientKey: '' }));
  
  console.log("Please scan finger NOW...");
  await new Promise(r => setTimeout(r, 2000));
  
  const cap = await post('capture', { Quality: 40, TimeOut: 15 });
  console.log("Capture:", cap.data.ErrorCode, cap.data.ErrorDescription);
  
  const capRes = await post('gettemplate', { TmpFormat: 0 });
  const tpl1 = capRes.data.TemplateBase64 || capRes.data.TemplateData || capRes.data.ImgData;
  console.log("Tpl1 length:", tpl1 ? tpl1.length : 0);
  
  if (tpl1) {
      const verify = await post('verify', { GalleryTemplate: tpl1, ProbeTemplate: tpl1 });
      console.log("Verify Tpl1 vs Tpl1:", verify.data);
  }
  
  await post('uninitdevice');
}

run();
