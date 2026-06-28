const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.fingerprintTemplate.findMany();
  
  if(templates.length >= 2) { 
      const t1 = templates[templates.length-2].templateData; 
      const t2 = templates[templates.length-1].templateData; 
      
      const payload = JSON.stringify({
          endpoint: "verify",
          payload: {
              GalleryTemplate: t1,
              ProbeTemplate: t2
          }
      });
      
      const res = await fetch("http://localhost:3000/api/v1/proxy/morfin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload
      });
      
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Body:', text);
  }
}

main().then(() => prisma.$disconnect());
