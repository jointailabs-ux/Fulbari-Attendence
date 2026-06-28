// src/app/api/v1/fingerprint/enroll/route.ts

import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Accept both "template" (new) and "templateData" (legacy) field names
    const { staffId, template, templateData: legacyTemplate, fingerIndex, deviceInfo } = body;
    const templateValue = template || legacyTemplate;

    if (!staffId || !templateValue || !fingerIndex) {
      return NextResponse.json(
        { error: 'Missing required fields: staffId, template, fingerIndex' },
        { status: 400 }
      );
    }

    // 1. Verify staff profile exists
    const staff = await prisma.staffProfile.findUnique({
      where: { id: staffId }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
    }

    // 2. Enforce enrollment limit of maximum 3 templates
    const enrolledCount = await prisma.fingerprintTemplate.count({
      where: { staffId }
    });

    if (enrolledCount >= 3) {
      return NextResponse.json({ 
        error: 'Maximum limit of 3 active fingerprint templates reached for this employee.' 
      }, { status: 409 });
    }

    // 3. Create the template in the database
    const enrolledPrint = await prisma.fingerprintTemplate.create({
      data: {
        staffId,
        templateData: templateValue, // Base64 ISO template from MorFin gettemplate
        fingerIndex,
        deviceInfo: deviceInfo || 'MFS500-MorFin'
      }
    });

    // 4. Create an Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'BIOMETRIC_ENROLLED',
        entityType: 'FingerprintTemplate',
        entityId: enrolledPrint.id,
        newValue: JSON.stringify({ fingerIndex, enrolledAt: enrolledPrint.enrolledAt }),
        performedBy: 'Admin'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Fingerprint enrolled successfully',
      id: enrolledPrint.id
    }, { status: 201 });

  } catch (error: any) {
    console.error('Biometric Enrollment Error:', error);
    return NextResponse.json({ error: 'Failed to enrol biometric template', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing template ID query parameter' }, { status: 400 });
    }

    const template = await prisma.fingerprintTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return NextResponse.json({ error: 'Biometric template not found' }, { status: 404 });
    }

    // Delete the template
    await prisma.fingerprintTemplate.delete({
      where: { id }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'BIOMETRIC_DELETED',
        entityType: 'FingerprintTemplate',
        entityId: id,
        oldValue: JSON.stringify(template),
        performedBy: 'Admin'
      }
    });

    return NextResponse.json({ success: true, message: 'Biometric template deleted successfully' });
  } catch (error: any) {
    console.error('Biometric Purge Error:', error);
    return NextResponse.json({ error: 'Failed to delete template', details: error.message }, { status: 500 });
  }
}
