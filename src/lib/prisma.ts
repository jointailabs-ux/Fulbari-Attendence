import { PrismaClient } from '@prisma/client';

// Auto-clean and format environment variables copied from .env into cloud host providers (like Vercel)
if (process.env.DATABASE_URL) {
  let url = process.env.DATABASE_URL.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }

  try {
    const lastAt = url.lastIndexOf('@');
    if (lastAt !== -1) {
      const hostAndDb = url.substring(lastAt + 1);
      const credentialsPart = url.substring(0, lastAt);
      
      const schemeMatch = credentialsPart.match(/^(postgre[sq]l:\/\/)(.*)$/i);
      if (schemeMatch) {
        const scheme = schemeMatch[1];
        const userPassPart = schemeMatch[2];
        const firstColon = userPassPart.indexOf(':');
        if (firstColon !== -1) {
          const username = userPassPart.substring(0, firstColon);
          const rawPassword = userPassPart.substring(firstColon + 1);
          
          // Only URL-encode if it isn't already encoded (does not contain '%')
          const encodedPassword = rawPassword.includes('%') 
            ? rawPassword 
            : encodeURIComponent(rawPassword);
            
          url = `${scheme}${username}:${encodedPassword}@${hostAndDb}`;
        }
      }
    }
  } catch (e) {
    console.error("Failed to auto-encode DATABASE_URL password:", e);
  }

  process.env.DATABASE_URL = url;
}

const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
