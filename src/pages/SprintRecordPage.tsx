import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Share2, Camera, Link2 } from 'lucide-react'
import ExampleRecordContent from '../components/ExampleRecordContent'

export default function SprintRecordPage() {
  const navigate = useNavigate()
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setToast('Copied to clipboard!')
  }

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', maxWidth: '430px', margin: '0 auto', borderTop: '3px solid #3D7A5F' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#6B9E8A', fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', letterSpacing: '0.01em' }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      <ExampleRecordContent />

      {/* Action buttons */}
      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={() => navigate(window.location.pathname + '/full')}
          style={{ width: '100%', height: '44px', backgroundColor: '#EAF5F0', color: '#2D5A47', border: '1.5px solid #B8D9CC', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em' }}
        >
          View full sprint →
        </button>
        <button
          onClick={() => setShowShareSheet(true)}
          style={{ width: '100%', height: '44px', backgroundColor: '#3D7A5F', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', letterSpacing: '0.02em' }}
        >
          <Share2 size={14} /> Share this record
        </button>
      </div>

      {/* Share Sheet */}
      {showShareSheet && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 }} onClick={() => setShowShareSheet(false)}>
          <div
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: '430px', margin: '0 auto', backgroundColor: '#FFFFFF', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '40px', height: '4px', backgroundColor: '#E0E0E0', borderRadius: '2px', margin: '0 auto 20px' }} />
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028', margin: '0 0 6px' }}>Share your Sprint Record</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', margin: '0 0 20px', letterSpacing: '0.01em' }}>Let the world see what you built.</p>

            <div onClick={() => window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.href), '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>in</div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>LinkedIn</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Share to your profile or network</p>
              </div>
            </div>

            <div onClick={() => { navigator.clipboard.writeText(window.location.href); setToast('Link copied! Paste in Instagram.') }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Camera size={18} color="#FFFFFF" /></div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Instagram</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Copy link — paste in your bio or story</p>
              </div>
            </div>

            <div onClick={() => { navigator.clipboard.writeText(window.location.href); setToast('Link copied! Paste on Naukri profile.'); window.open('https://www.naukri.com', '_blank') }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#FF7555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>N</div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Naukri.com</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Share as proof of work to recruiters</p>
              </div>
            </div>

            <div onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', cursor: 'pointer' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#EAF5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Link2 size={18} color="#3D7A5F" /></div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Copy link</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Works anywhere — WhatsApp, email, Notion</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1C3D30', color: '#FFFFFF', fontFamily: 'var(--font-body)', fontSize: '12px', borderRadius: '9999px', padding: '10px 20px', zIndex: 9999 }}>{toast}</div>
      )}
    </div>
  )
}
