import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;

    if (!file || !documentType) {
      return NextResponse.json({ error: 'File and documentType are required' }, { status: 400 });
    }

    // Validate file type (robust extension check as fallback for MIME-type mismatches)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

    const isValidMime = allowedTypes.includes(file.type);
    const isValidExt = allowedExtensions.includes(fileExtension || '');

    if (!isValidMime && !isValidExt) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' }, { status: 400 });
    }

    // Ensure upload directory exists
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch {
      // Ignore if directory already exists
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `${id}_${documentType}_${uuidv4()}.${fileExtension}`;
    const filePath = join(UPLOAD_DIR, fileName);

    await writeFile(filePath, buffer);

    // Check if document of this type already exists for this staff
    const existingDoc = await prisma.employeeDocument.findFirst({
      where: { staffId: id, documentType }
    });

    let savedDoc;
    if (existingDoc) {
      savedDoc = await prisma.employeeDocument.update({
        where: { id: existingDoc.id },
        data: { fileUrl: fileName, uploadedAt: new Date() }
      });
    } else {
      savedDoc = await prisma.employeeDocument.create({
        data: {
          staffId: id,
          documentType,
          fileUrl: fileName
        }
      });
    }

    return NextResponse.json(savedDoc);
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documents = await prisma.employeeDocument.findMany({
      where: { staffId: id }
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
