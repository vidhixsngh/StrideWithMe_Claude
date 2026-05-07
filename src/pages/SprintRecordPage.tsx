import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Share2, Camera, Link2, ShieldCheck, Download } from 'lucide-react'
import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isSprintLocked } from '../lib/db'
import { generateSprintNarrative } from '../lib/gemini'
import type { Sprint, DailyLog, Profile } from '../lib/db'

function getRecordDayColor(day: number, logs: DailyLog[], sprintLength: number): { bg: string; border?: string } {
  if (day > sprintLength) return { bg: 'transparent' }
  const log = logs.find(l => l.day_number === day)
  if (log?.log_type === 'VERIFIED') return { bg: '#3D7A5F' }
  if (log?.log_type === 'HONEST') return { bg: '#F59E4A' }
  return { bg: '#FFFFFF', border: '1.5px solid #D4EDE3' }
}

export default function SprintRecordPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [stillLocked, setStillLocked] = useState(false)
  const [narrative, setNarrative] = useState('')
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t) }
  }, [toast])

  useEffect(() => { loadRecord() }, [id])

  async function loadRecord() {
    if (!id) return

    const { data: sprintData } = await supabase.from('sprints').select('*').eq('id', id).single()

    if (!sprintData) {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    if (isSprintLocked(sprintData.end_date)) {
      setStillLocked(true)
      setLoading(false)
      return
    }

    const isOwner = user?.id === sprintData.user_id
    if (sprintData.visibility === 'PRIVATE' && !isOwner) {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    const [{ data: logsData }, { data: profileData }] = await Promise.all([
      supabase.from('daily_logs').select('*').eq('sprint_id', id).order('day_number', { ascending: true }),
      supabase.from('profiles').select('*').eq('id', sprintData.user_id).single(),
    ])

    setSprint(sprintData)
    setLogs(logsData ?? [])
    setProfile(profileData)
    setLoading(false)

    // Generate narrative
    if (logsData && logsData.length > 0) {
      setNarrativeLoading(true)
      const text = await generateSprintNarrative({
        goalText: sprintData.goal_text,
        logs: logsData,
        sprintLength: sprintData.sprint_length,
        verifiedCount: logsData.filter((l: DailyLog) => l.log_type === 'VERIFIED').length,
        honestCount: logsData.filter((l: DailyLog) => l.log_type === 'HONEST').length,
      })
      setNarrative(text)
      setNarrativeLoading(false)
    }
  }

  const recordRef = useRef<HTMLDivElement>(null)

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); setToast('Copied to clipboard!') }

  const handleDownloadPDF = async () => {
    if (!recordRef.current || !sprint) return
    setToast('Generating PDF...')
    try {
      const canvas = await html2canvas(recordRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdfWidth = 210 // A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight])
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

      const fileName = `sprint-record-${(profile?.display_name ?? 'record').toLowerCase().replace(/\s+/g, '-')}.pdf`
      pdf.save(fileName)
      setToast('PDF downloaded!')
    } catch (err) {
      console.error('PDF generation error:', err)
      setToast('Failed to generate PDF')
    }
  }

  // Loading
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #D4EDE3', borderTopColor: '#3D7A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  // Access denied
  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #EAF5F0 0%, #F0F7F4 35%, #F5F0E8 100%)', padding: '24px', textAlign: 'center' }}>
        <span style={{ fontSize: '40px' }}>🔒</span>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: '#1A3028', marginTop: '16px' }}>This record is private</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', marginTop: '8px' }}>The owner hasn't made this record public.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '24px', height: '48px', padding: '0 24px', backgroundColor: '#3D7A5F', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Back to home →</button>
      </div>
    )
  }

  // Still locked
  if (stillLocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #EAF5F0 0%, #F0F7F4 35%, #F5F0E8 100%)', padding: '24px', textAlign: 'center' }}>
        <span style={{ fontSize: '40px' }}>⏳</span>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: '#1A3028', marginTop: '16px' }}>This sprint is still in progress</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', marginTop: '8px' }}>The Sprint Record unlocks when the sprint ends.</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '24px', height: '48px', padding: '0 24px', backgroundColor: '#EAF5F0', color: '#3D7A5F', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Back →</button>
      </div>
    )
  }

  if (!sprint) return null

  // Derived values
  const verifiedCount = logs.filter(l => l.log_type === 'VERIFIED').length
  const completionPercent = Math.round((logs.length / sprint.sprint_length) * 100)
  const displayName = profile?.display_name ?? 'Anonymous'
  const initials = displayName.slice(0, 2).toUpperCase()

  // Highlights from real logs
  const highlights = (() => {
    const verified = logs.filter(l => l.log_type === 'VERIFIED').sort((a, b) => a.day_number - b.day_number)
    if (verified.length === 0) {
      const honest = logs.filter(l => l.log_type === 'HONEST').sort((a, b) => a.day_number - b.day_number).slice(0, 4)
      return honest.map(l => ({ day: l.day_number, text: l.log_text?.slice(0, 80) ?? 'Showed up today.', color: '#F59E4A' }))
    }
    const picks: DailyLog[] = []
    if (verified.length > 0) picks.push(verified[0])
    if (verified.length > 2) picks.push(verified[Math.floor(verified.length / 3)])
    if (verified.length > 4) picks.push(verified[Math.floor(2 * verified.length / 3)])
    if (verified.length > 1) picks.push(verified[verified.length - 1])
    const unique = [...new Map(picks.map(p => [p.id, p])).values()].slice(0, 4)
    return unique.map(l => ({ day: l.day_number, text: l.log_text?.slice(0, 80) ?? 'Showed up today.', color: '#3D7A5F' }))
  })()

  // Heatmap
  const totalCells = Math.ceil(sprint.sprint_length / 15) * 15
  const heatmapDays = Array.from({ length: totalCells }, (_, i) => i + 1)

  // No logs state
  const hasNoLogs = logs.length === 0

  return (
    <div ref={recordRef} style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', maxWidth: '430px', margin: '0 auto', borderTop: '3px solid #3D7A5F' }}>
      {/* Back button */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#6B9E8A', fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', letterSpacing: '0.01em' }}>
        <ChevronLeft size={16} /> Back
      </button>

      {/* Header bar */}
      <div style={{ backgroundColor: '#2D5A47', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.15em', color: '#7AB5A0', margin: '0 0 4px', textTransform: 'uppercase' }}>SPRINT RECORD</p>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 500, color: '#FFFFFF', margin: 0 }}>StrideWithMe</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#7AB5A0', margin: '0 0 4px' }}>Verified</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#7AB5A0' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#FFFFFF' }}>AI + public record</span>
          </div>
        </div>
      </div>

      {/* Color strip */}
      <div style={{ display: 'flex', height: '4px', width: '100%' }}>
        <div style={{ flex: 3, backgroundColor: '#3D7A5F' }} />
        <div style={{ flex: 0.5, backgroundColor: '#F59E4A' }} />
        <div style={{ flex: 0.5, backgroundColor: '#7B6FA0' }} />
      </div>

      {/* User section */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #F0F0F0', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#D4EDE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#3D7A5F', flexShrink: 0 }}>{initials}</div>
        <div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 600, color: '#1A2E25', margin: 0 }}>{displayName}</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.1em', color: '#9BBFB2', margin: '10px 0 4px', textTransform: 'uppercase' }}>GOAL COMMITTED</p>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontStyle: 'italic', color: '#1A2E25', lineHeight: 1.5, margin: 0 }}>"{sprint.goal_text}"</p>
        </div>
      </div>

      {/* Credential badge */}
      <div style={{ background: 'linear-gradient(90deg, #1C3D30, #2D5A47)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="#FFFFFF" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#FFFFFF' }}>AI-Verified Sprint Record</span>
        </div>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '9999px', padding: '4px 10px' }}>✓ Authentic</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #F0F0F0', backgroundColor: '#FAFAFA' }}>
        {[
          { label: 'Days committed', value: String(sprint.sprint_length), color: '#1A2E25', cellBg: 'transparent' },
          { label: 'Days logged', value: String(logs.length), color: '#1A2E25', cellBg: '#EAF5F0' },
          { label: 'Completion', value: completionPercent + '%', color: '#3D7A5F', cellBg: '#EAF5F0' },
          { label: 'Verified', value: String(verifiedCount), color: '#3D7A5F', cellBg: 'transparent' },
        ].map((stat, i) => (
          <div key={stat.label} style={{ padding: '14px 8px', textAlign: 'center', borderRight: i < 3 ? '1px solid #F0F0F0' : 'none', backgroundColor: stat.cellBg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.05em', color: '#9BBFB2', whiteSpace: 'nowrap' }}>{stat.label}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '22px', fontWeight: 700, color: stat.color, whiteSpace: 'nowrap' }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {hasNoLogs ? (
        /* No logs state */
        <div style={{ backgroundColor: '#FEF3E8', borderRadius: '16px', padding: '20px', margin: '20px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028', marginBottom: '8px' }}>This sprint ended without any logs.</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', marginBottom: '16px' }}>That's okay. Every unfinished sprint is still a decision you made. Start a new one when you're ready.</p>
          <button onClick={() => navigate('/onboarding')} style={{ height: '44px', padding: '0 20px', backgroundColor: '#3D7A5F', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Start a new sprint →</button>
        </div>
      ) : (
        <>
          {/* Heatmap */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.05em', color: '#9BBFB2', margin: '0 0 10px' }}>Daily activity — {sprint.sprint_length} day sprint</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: '3px' }}>
              {heatmapDays.map((d, i) => {
                if (d > sprint.sprint_length) return <div key={i} style={{ width: '22px', height: '22px' }} />
                const { bg, border } = getRecordDayColor(d, logs, sprint.sprint_length)
                return <div key={i} style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: bg, border: border || 'none', boxSizing: 'border-box' }} />
              })}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              {[
                { color: '#3D7A5F', label: 'Verified' },
                { color: '#F59E4A', label: 'Honest day' },
                { color: '#FFFFFF', label: 'Missed', border: '1.5px solid #D4EDE3' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: item.color, border: item.border || 'none', boxSizing: 'border-box' }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#9BBFB2' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Narrative */}
          <div style={{ padding: '20px 20px', borderBottom: '1px solid #F0F0F0' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.12em', color: '#D97706', margin: '0 0 12px', textTransform: 'uppercase' }}>✦ AI-GENERATED SPRINT NARRATIVE</p>
            {narrativeLoading ? (
              <div>
                <div style={{ height: '14px', width: '100%', backgroundColor: '#EAF5F0', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ height: '14px', width: '90%', backgroundColor: '#EAF5F0', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ height: '14px', width: '70%', backgroundColor: '#EAF5F0', borderRadius: '4px' }} />
              </div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #EAF5F0 0%, #FEF8F0 100%)', borderRadius: '16px', padding: '18px', border: '1px solid #D4EDE3' }}>
                {narrative.split('\n\n').map((para, i) => (
                  <p key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#1A2E25', lineHeight: 1.75, margin: i > 0 ? '12px 0 0' : '0' }}>{para}</p>
                ))}
              </div>
            )}
          </div>

          {/* Sprint Highlights */}
          {highlights.length > 0 && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.12em', color: '#9BBFB2', margin: '0 0 12px', textTransform: 'uppercase' }}>SPRINT HIGHLIGHTS</p>
              {highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', padding: '6px 0 6px 4px', borderBottom: i < highlights.length - 1 ? '1px solid #F7F7F7' : 'none', borderLeft: `3px solid ${h.color}`, paddingLeft: '12px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: h.color, minWidth: '44px' }}>Day {h.day}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#1A2E25', lineHeight: 1.4 }}>{h.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => navigate(window.location.pathname + '/full')} style={{ width: '100%', height: '44px', backgroundColor: '#EAF5F0', color: '#2D5A47', border: '1.5px solid #B8D9CC', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em' }}>
              View full sprint →
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowShareSheet(true)} style={{ flex: 1, height: '44px', backgroundColor: '#3D7A5F', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', letterSpacing: '0.02em' }}>
                <Share2 size={14} /> Share
              </button>
              <button onClick={handleDownloadPDF} style={{ flex: 1, height: '44px', backgroundColor: '#EAF5F0', color: '#2D5A47', border: '1.5px solid #B8D9CC', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', letterSpacing: '0.02em' }}>
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
        </>
      )}

      {/* Share Sheet */}
      {showShareSheet && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 }} onClick={() => setShowShareSheet(false)}>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: '430px', margin: '0 auto', backgroundColor: '#FFFFFF', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '40px', height: '4px', backgroundColor: '#E0E0E0', borderRadius: '2px', margin: '0 auto 20px' }} />
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028', margin: '0 0 6px' }}>Share your Sprint Record</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', margin: '0 0 20px', letterSpacing: '0.01em' }}>Let the world see what you built.</p>
            <div onClick={() => window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.href), '_blank')} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>in</div>
              <div><p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>LinkedIn</p><p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Share to your profile or network</p></div>
            </div>
            <div onClick={() => { navigator.clipboard.writeText(window.location.href); setToast('Link copied! Paste in Instagram.') }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Camera size={18} color="#FFFFFF" /></div>
              <div><p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Instagram</p><p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Copy link — paste in your bio or story</p></div>
            </div>
            <div onClick={() => { navigator.clipboard.writeText(window.location.href); setToast('Link copied! Paste on Naukri profile.'); window.open('https://www.naukri.com', '_blank') }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#FF7555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>N</div>
              <div><p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Naukri.com</p><p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Share as proof of work to recruiters</p></div>
            </div>
            <div onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#EAF5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Link2 size={18} color="#3D7A5F" /></div>
              <div><p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Copy link</p><p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Works anywhere — WhatsApp, email, Notion</p></div>
            </div>
            <div onClick={() => { setShowShareSheet(false); handleDownloadPDF() }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', cursor: 'pointer' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#1C3D30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Download size={18} color="#FFFFFF" /></div>
              <div><p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Download as PDF</p><p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Save your Sprint Record as a document</p></div>
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
