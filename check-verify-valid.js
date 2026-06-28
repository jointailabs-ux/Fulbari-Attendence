const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.fingerprintTemplate.findMany();
  
  const t2 = templates[2].templateData; 

  console.log('Verifying...');
  const res = await fetch("http://localhost:3000/api/v1/proxy/morfin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
          endpoint: "verify",
          payload: {
              GalleryTemplate: t2,
              ProbeTemplate: t2
          }
      })
  });
  
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

main().then(() => prisma.$disconnect());
