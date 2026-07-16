import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` }, { status: 400 });
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

    // Convert file to base64 data URL — stored directly in DB, no filesystem needed
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Determine correct MIME type for the data URL prefix
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (fileExtension === 'pdf') mimeType = 'application/pdf';
      else if (fileExtension === 'jpg' || fileExtension === 'jpeg') mimeType = 'image/jpeg';
      else if (fileExtension === 'png') mimeType = 'image/png';
    }

    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Upsert: update if doc type exists, create otherwise
    const existingDoc = await prisma.employeeDocument.findFirst({
      where: { staffId: id, documentType }
    });

    let savedDoc;
    if (existingDoc) {
      savedDoc = await prisma.employeeDocument.update({
        where: { id: existingDoc.id },
        data: { fileUrl: dataUrl, uploadedAt: new Date() }
      });
    } else {
      savedDoc = await prisma.employeeDocument.create({
        data: {
          staffId: id,
          documentType,
          fileUrl: dataUrl
        }
      });
    }

    // Return without the huge base64 payload — client only needs the id/type to refresh
    return NextResponse.json({
      id: savedDoc.id,
      staffId: savedDoc.staffId,
      documentType: savedDoc.documentType,
      uploadedAt: savedDoc.uploadedAt
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Failed to upload document', details: error.message }, { status: 500 });
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
    // Return documents with fileUrl so the client can render the data URL directly
    return NextResponse.json(documents);
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ error: 'docId query param is required' }, { status: 400 });
    }

    // Ensure the document belongs to this staff member before deleting
    const doc = await prisma.employeeDocument.findFirst({
      where: { id: docId, staffId: id }
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
    }

    await prisma.employeeDocument.delete({ where: { id: docId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document', details: error.message }, { status: 500 });
  }
}

