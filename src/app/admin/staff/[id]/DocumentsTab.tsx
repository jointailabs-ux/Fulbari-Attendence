"use client";

import React, { useState, useEffect } from "react";

export default function DocumentsTab({ staffId }: { staffId: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/v1/staff/${staffId}/documents`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setDocuments(data);
      } else {
        setError(data.error || 'Failed to load documents');
      }
    } catch (e) {
      setError('Network error loading documents');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [staffId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-uploaded if needed
    e.target.value = '';

    setUploading(type);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', type);

    try {
      const res = await fetch(`/api/v1/staff/${staffId}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDocuments();
      } else {
        setError(data.error || data.details || 'Upload failed');
      }
    } catch (e) {
      console.error(e);
      setError('Network error during upload. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const openDocument = (fileUrl: string) => {
    if (fileUrl.startsWith('data:application/pdf')) {
      // Convert data URL to blob and open in new tab
      const byteString = atob(fileUrl.split(',')[1]);
      const mimeString = fileUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mimeString });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  const docTypes = [
    { id: 'PAN', label: 'PAN Card', icon: '💳' },
    { id: 'AADHAAR', label: 'Aadhaar Card', icon: '🆔' },
    { id: 'VOTER_ID', label: 'Voter ID', icon: '🗳️' },
  ];

  if (loading) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Decrypting document storage...
    </div>
  );

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {error && (
        <div style={{
          padding: '1rem 1.5rem',
          background: 'rgba(244,63,94,0.08)',
          border: '1px solid rgba(244,63,94,0.2)',
          borderRadius: '12px',
          color: 'var(--brand-secondary)',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          ⚠️ {error}
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {docTypes.map((type) => {
          const doc = documents.find(d => d.documentType === type.id);
          const isUploading = uploading === type.id;
          const isImage = doc?.fileUrl?.startsWith('data:image');
          const isPdf = doc?.fileUrl?.startsWith('data:application/pdf');

          return (
            <div key={type.id} className="glass" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{type.icon}</span>
                <h3 style={{ fontSize: '1.25rem' }}>{type.label}</h3>
                {doc && (
                  <span style={{
                    marginLeft: 'auto',
                    padding: '0.15rem 0.6rem',
                    background: 'rgba(16,185,129,0.1)',
                    color: '#10b981',
                    borderRadius: '6px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase' as const
                  }}>Uploaded</span>
                )}
              </div>

              {doc ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{
                    height: '180px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
                  }}>
                    {isImage ? (
                      <img
                        src={doc.fileUrl}
                        alt={type.label}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📄</div>
                        <p style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {isPdf ? 'PDF Document' : 'Document on file'}
                        </p>
                        {doc.uploadedAt && (
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={() => openDocument(doc.fileUrl)}
                      className="btn-modern btn-primary"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem' }}
                    >
                      View Document
                    </button>
                    <label
                      className="btn-modern btn-secondary"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem', cursor: isUploading ? 'wait' : 'pointer', textAlign: 'center' as const }}
                    >
                      {isUploading ? 'Uploading...' : 'Replace'}
                      <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUpload(e, type.id)} disabled={!!uploading} />
                    </label>
                  </div>
                </div>
              ) : (
                <div style={{
                  height: '180px',
                  border: '2px dashed var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem',
                  background: 'rgba(255,255,255,0.01)'
                }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>No file on record</p>
                  <label
                    className="btn-modern btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.6rem 1.25rem', cursor: isUploading ? 'wait' : 'pointer' }}
                  >
                    {isUploading ? 'Uploading...' : `Upload ${type.label}`}
                    <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUpload(e, type.id)} disabled={!!uploading} />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {uploading && (
        <div className="glass" style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          padding: '1rem 2rem', background: 'var(--brand-primary)', color: 'white',
          fontWeight: '700', borderRadius: '100px',
          boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)', zIndex: 2000
        }}>
          ⚡ Processing Upload...
        </div>
      )}
    </div>
  );
}
