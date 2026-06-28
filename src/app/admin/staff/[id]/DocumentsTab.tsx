"use client";

import React, { useState, useEffect } from "react";

export default function DocumentsTab({ staffId }: { staffId: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/v1/staff/${staffId}/documents`);
      const data = await res.json();
      setDocuments(data);
    } catch (e) {
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

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', type);

    try {
      const res = await fetch(`/api/v1/staff/${staffId}/documents`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchDocuments();
      } else {
        const err = await res.json();
        alert(err.error || 'Upload failed');
      }
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const docTypes = [
    { id: 'PAN', label: 'PAN Card', icon: '💳' },
    { id: 'AADHAAR', label: 'Aadhaar Card', icon: '🆔' },
    { id: 'VOTER_ID', label: 'Voter ID', icon: '🗳️' },
  ];

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Decrypting document storage...</div>;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {docTypes.map((type) => {
          const doc = documents.find(d => d.documentType === type.id);
          return (
            <div key={type.id} className="glass" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{type.icon}</span>
                <h3 style={{ fontSize: '1.25rem' }}>{type.label}</h3>
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
                    {doc.fileUrl.match(/\.(jpg|jpeg|png)$/i) ? (
                      <img 
                        src={`/api/v1/documents/${doc.fileUrl}`} 
                        alt={type.label} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                      />
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📄</div>
                        <p style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PDF Archive</p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <a 
                      href={`/api/v1/documents/${doc.fileUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-modern btn-primary" 
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem' }}
                    >
                      View Digital Copy
                    </a>
                    <label className="btn-modern btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem', cursor: 'pointer' }}>
                      Update
                      <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUpload(e, type.id)} disabled={uploading} />
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
                  <label className="btn-modern btn-primary" style={{ fontSize: '0.75rem', padding: '0.6rem 1.25rem', cursor: 'pointer' }}>
                    Upload {type.id}
                    <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUpload(e, type.id)} disabled={uploading} />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {uploading && (
        <div className="glass" style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 2rem', background: 'var(--brand-primary)', color: 'white', fontWeight: '700', borderRadius: '100px', boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)', zIndex: 2000 }}>
          ⚡ Processing Secure Upload...
        </div>
      )}
    </div>
  );
}
