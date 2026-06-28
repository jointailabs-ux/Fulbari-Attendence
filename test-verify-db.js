const net = require('net');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  
  const templates = await prisma.fingerprintTemplate.findMany();
  console.log(`Found ${templates.length} templates in DB.`);
  
  if (templates.length > 2) {
    const t1 = templates[1].templateData;
    const t2 = templates[2].templateData;
    const verifyDiff = await post('verify', { GalleryTemplate: t1, ProbeTemplate: t2 });
    console.log(`Template 1 vs Template 2:`, verifyDiff.data);
  }
  
  await post('uninitdevice');
  await prisma.$disconnect();
}

run();
