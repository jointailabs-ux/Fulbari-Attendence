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
  await post('uninitdevice');
  await post('initdevice', { ConnectedDvc: 'MFS500', ClientKey: '' });
  
  const templates = await prisma.fingerprintTemplate.findMany();
  if (templates.length < 3) return;
  const t1 = templates[1].templateData;
  const t2 = templates[2].templateData;
  
  const variations = [
    { GalleryTemplate: t1, ProbeTemplate: t2 },
    { galleryTemplate: t1, probeTemplate: t2 },
    { GalleryTemplateData: t1, ProbeTemplateData: t2 },
    { galleryTemplateData: t1, probeTemplateData: t2 },
    { Template1: t1, Template2: t2 },
    { template1: t1, template2: t2 },
    { Temp1: t1, Temp2: t2 },
    { temp1: t1, temp2: t2 },
    { Base64Gallery: t1, Base64Probe: t2 },
    { gallery: t1, probe: t2 },
    { Gallery: t1, Probe: t2 }
  ];
  
  for (let i = 0; i < variations.length; i++) {
     const res = await post('verify', variations[i]);
     console.log(`Variation ${i}:`, res.data);
  }
  
  await post('uninitdevice');
  await prisma.$disconnect();
}

run();
