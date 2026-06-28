const { PrismaClient } = require('@prisma/client');
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

const prisma = new PrismaClient();

async function run() {
  const templates = await prisma.fingerprintTemplate.findMany();
  
  await post('uninitdevice');
  await post('initdevice', { ConnectedDvc: 'MFS500-MorFin', ClientKey: '' });
  
  console.log("Capturing fresh template...");
  const capture = await post('gettemplate', { TmpFormat: 0 });
  if (!capture.data || capture.data.ErrorCode !== 0 && capture.data.ErrorCode !== "0") {
     console.log("Capture failed:", capture.data);
     await post('uninitdevice');
     return;
  }
  
  const freshTemplate = capture.data.TemplateBase64 || capture.data.TemplateData || capture.data.ImgData;
  console.log("Fresh template length:", freshTemplate.length);
  
  const verify = await post('verify', { GalleryTemplate: freshTemplate, ProbeTemplate: freshTemplate });
  console.log("Verify fresh vs fresh:", verify.data);
  
  await post('uninitdevice');
  await prisma.$disconnect();
}

run();
