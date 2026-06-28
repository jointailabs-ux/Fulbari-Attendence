import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    const { fileName } = await params;
    const filePath = join(UPLOAD_DIR, fileName);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (extension === 'pdf') contentType = 'application/pdf';
    else if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
    else if (extension === 'png') contentType = 'image/png';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        // In a real app, you'd add Auth headers check here
        'Cache-Control': 'private, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json({ error: 'Failed to serve document' }, { status: 500 });
  }
}
