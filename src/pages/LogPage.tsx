import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check, Link2, X } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import BloomOverlay from '../components/BloomOverlay'
import PhaseUnlockedOverlay from '../components/PhaseUnlockedOverlay'
import VerifyingOverlay from '../components/VerifyingOverlay'
import { verifyLog, generatePostDraft } from '../lib/gemini'
import type { VerificationResult } from '../lib/gemini'
import { createLog, getLogsForSprint, getAllActiveSprints, getTodayTask, getTasksForSprint, calculateDayNumber, createFeedPost, markLogPostedToFeed, updateLogDraft, createTasks, markPhaseGenerated, getPhaseBoundaries, getPhaseForDay, nextPhaseAfter } from '../lib/db'
import { generatePhaseTasks } from '../lib/gemini'
import { useAuth } from '../context/AuthContext'
import type { Sprint, Task, DailyLog } from '../lib/db'
import { track, Events, incrementPeople, setPeople } from '../lib/analytics'

const mockLog = {
  day: 14,
  totalDays: 30,
  verifiedCount: 11,
  todayTask: "Outline your go-to-market strategy for first 100 users",
  verificationAttempts: 0,
}

export default function LogPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const sprint = sprints[selectedIdx] ?? null
  const [logText, setLogText] = useState('')
  const [activeTab, setActiveTab] = useState('text')
  const [phase, setPhase] = useState<'input' | 'verifying' | 'verified' | 'honest' | 'honest_done' | 'done'>('input')
  const [showBloom, setShowBloom] = useState(false)
  const [todayTaskData, setTodayTaskData] = useState<Task | null>(null)
  const [dayNumber, setDayNumber] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [recentLogTexts, setRecentLogTexts] = useState<string[]>([])
  const [verifiedCountState, setVerifiedCountState] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [, setAlreadyLogged] = useState(false)
  const [existingLog, setExistingLog] = useState<DailyLog | null>(null)
  const [postDraft, setPostDraft] = useState('')
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [linkUrl, setLinkUrlParent] = useState('')
  const [linkCaption, setLinkCaptionParent] = useState('')
  const [imageFiles, setImageFiles] = useState<Array<{ file: File; preview: string; base64: string; mimeType: string; caption: string }>>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [sprintLogs, setSprintLogs] = useState<Array<{ day_number: number; log_type: string }>>([])
  const [lastLogId, setLastLogId] = useState<string | null>(null)
  const [phaseUnlock, setPhaseUnlock] = useState<null | { phase: 'build' | 'peak' | 'finish'; theme: string; status: 'generating' | 'done' | 'failed'; firstTaskText?: string }>(null)
  const [draftRestored, setDraftRestored] = useState(false)
  const DRAFT_KEY = 'stridewithme_draft_log'

  // Load all active sprints once
  useEffect(() => {
    if (!user) return
    getAllActiveSprints(user.id).then((list) => {
      setSprints(list)
      const incomingId = (location.state as { sprintId?: string } | null)?.sprintId
      if (incomingId) {
        const idx = list.findIndex((s) => s.id === incomingId)
        if (idx >= 0) setSelectedIdx(idx)
      }
    })
  }, [user, location.state])

  // Load per-sprint data whenever selected sprint changes
  useEffect(() => {
    if (!sprint) return
    // Reset per-sprint UI state
    setPhase('input')
    setLogText('')
    setActiveTab('text')
    setVerificationResult(null)
    setAttemptNumber(1)
    setImageFiles([])
    setLinkUrlParent('')
    setLinkCaptionParent('')
    setExistingLog(null)
    setAlreadyLogged(false)
    setPostDraft('')
    setDraftReady(false)
    setGeneratingDraft(false)
    setLastLogId(null)
    setDraftRestored(false)

    async function load() {
      if (!sprint) return
      const dn = calculateDayNumber(sprint.start_date)
      setDayNumber(dn)
      const task = await getTodayTask(sprint.id, dn)
      setTodayTaskData(task)
      const [logs, allTasks] = await Promise.all([
        getLogsForSprint(sprint.id),
        getTasksForSprint(sprint.id),
      ])
      const recent = logs.sort((a, b) => b.day_number - a.day_number).slice(0, 3).map(l => l.log_text ?? '').filter(Boolean)
      setRecentLogTexts(recent)
      setVerifiedCountState(logs.filter(l => l.log_type === 'VERIFIED').length)

      let streak = 0
      for (let d = dn; d >= 1; d--) {
        const dayLog = logs.find(l => l.day_number === d)
        if (dayLog) streak++
        else break
      }
      setCurrentStreak(streak)

      const todayLogData = logs.find(l => l.day_number === dn)
      if (todayLogData) {
        setAlreadyLogged(true)
        setExistingLog(todayLogData)
        setPhase('done')
      }

      setSprintLogs(logs.map(l => ({ day_number: l.day_number, log_type: l.log_type })))
      setUpcomingTasks(allTasks.filter(t => t.day_number > dn).slice(0, 5))
    }
    load()
  }, [sprint?.id])

  // Save draft as user types
  useEffect(() => {
    if (logText.length > 0 && sprint?.id && dayNumber > 0) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ text: logText, sprintId: sprint.id, dayNumber, savedAt: new Date().toISOString() }))
    }
  }, [logText, sprint?.id, dayNumber, DRAFT_KEY])

  // Restore draft on mount
  useEffect(() => {
    if (!sprint?.id || dayNumber === 0) return
    const saved = localStorage.getItem(DRAFT_KEY)
    if (!saved) return
    try {
      const draft = JSON.parse(saved)
      if (draft.sprintId === sprint.id && draft.dayNumber === dayNumber && draft.text?.length > 0) {
        setLogText(draft.text)
        setDraftRestored(true)
      }
    } catch { localStorage.removeItem(DRAFT_KEY) }
  }, [sprint?.id, dayNumber, DRAFT_KEY])

  /** When user logs the last day of a phase (and sprint is 15/30 days), trigger
   *  background generation of the next phase + show a celebratory unlock overlay. */
  const triggerPhaseUnlockIfDue = async () => {
    if (!sprint) return
    if (sprint.sprint_length < 14) return // 7-day sprints: full plan already exists
    const boundaries = getPhaseBoundaries(sprint.sprint_length)
    const currentPhase = getPhaseForDay(dayNumber, sprint.sprint_length)
    const nextPhase = nextPhaseAfter(currentPhase, sprint.sprint_length)
    if (!nextPhase || nextPhase === 'foundation') return // Foundation is generated at onboarding
    if (boundaries[currentPhase].to !== dayNumber) return // not last day of phase
    if (sprint.last_generated_phase === nextPhase || sprint.last_generated_phase === 'finish') return // already generated

    const next = nextPhase as 'build' | 'peak' | 'finish'
    const theme = (sprint.phase_themes as Record<string, string> | undefined)?.[next] ?? `${next.charAt(0).toUpperCase() + next.slice(1)} phase`
    setPhaseUnlock({ phase: next, theme, status: 'generating' })

    try {
      const allTasks = await getTasksForSprint(sprint.id)
      const allLogs = await getLogsForSprint(sprint.id)
      const completedTasks = allTasks
        .filter((t) => t.day_number <= dayNumber)
        .map((t) => ({ day_number: t.day_number, task_text: t.task_text }))

      const newTasks = await generatePhaseTasks({
        goalText: sprint.goal_text,
        sprintLength: sprint.sprint_length,
        phase: next,
        fromDay: boundaries[next].from,
        toDay: boundaries[next].to,
        phaseTheme: theme,
        completedTasks,
        recentLogs: allLogs.map((l) => ({ day_number: l.day_number, log_type: l.log_type, log_text: l.log_text })),
      })
      if (newTasks.length === 0) {
        setPhaseUnlock((p) => p ? { ...p, status: 'failed' } : null)
        return
      }
      const rows = newTasks.map((t, idx) => ({
        sprint_id: sprint.id,
        day_number: boundaries[next].from + idx,
        task_text: t.task_text,
        task_type: t.task_type ?? 'build',
        ongoing_habits: t.ongoing_habits ?? [],
        rationale: t.rationale ?? null,
      }))
      await createTasks(rows)
      await markPhaseGenerated(sprint.id, next)
      // Reflect in local sprints array so dashboard doesn't re-trigger
      setSprints((list) => list.map((s) => s.id === sprint.id ? { ...s, last_generated_phase: next } : s))
      setPhaseUnlock({ phase: next, theme, status: 'done', firstTaskText: rows[0]?.task_text })
    } catch (e) {
      console.error('[phase-unlock]', e)
      setPhaseUnlock((p) => p ? { ...p, status: 'failed' } : null)
    }
  }

  const handleVerify = async () => {
    if (!sprint || !user) return
    const canVerify = (activeTab === 'text' && logText.length >= 20) || (activeTab === 'image' && imageFiles.length > 0) || (activeTab === 'link' && linkUrl.length > 0)
    if (!canVerify) return
    setVerifying(true)
    setVerificationResult(null)
    track(Events.LogVerifyAttempted, { tab: activeTab, day_number: dayNumber, attempt: attemptNumber })

    const result = await verifyLog({
      goalText: sprint.goal_text,
      todayTask: todayTaskData?.task_text ?? '',
      logText: activeTab === 'text' ? logText : '',
      dayNumber,
      sprintLength: sprint.sprint_length,
      attemptNumber,
      mediaType: activeTab === 'image' ? 'image' : activeTab === 'link' ? 'link' : null,
      linkUrl: activeTab === 'link' ? linkUrl : undefined,
      linkCaption: activeTab === 'link' ? linkCaption : undefined,
      recentLogs: recentLogTexts,
      images: activeTab === 'image' ? imageFiles.map(img => ({ base64: img.base64, mimeType: img.mimeType, caption: img.caption })) : [],
    })

    setVerifying(false)

    if (result.verified) {
      const newLog = await createLog({
        sprint_id: sprint.id,
        user_id: user.id,
        day_number: dayNumber,
        log_type: 'VERIFIED',
        log_text: activeTab === 'text' ? logText : activeTab === 'link' ? (linkCaption || linkUrl) : imageFiles[0]?.caption || 'Logged via ' + activeTab,
        media_url: null,
        ai_verification_result: { verified: result.verified, reason: result.reason, confidence: result.confidence },
        ai_draft_post: null,
        posted_to_feed: false,
        verification_attempts: attemptNumber,
      })
      if (newLog) setLastLogId(newLog.id)
      localStorage.removeItem(DRAFT_KEY)
      setVerificationResult(result)
      setShowBloom(true)
      track(Events.LogVerified, { tab: activeTab, day_number: dayNumber, attempt: attemptNumber, sprint_id: sprint.id, confidence: result.confidence })
      incrementPeople('total_verified_logs', 1)
      setPeople({ last_log_at: new Date().toISOString() })
      generateAndSaveDraft(newLog?.id)
      // Phase unlock — runs in background, shows overlay when done
      triggerPhaseUnlockIfDue()
    } else {
      setAttemptNumber(prev => prev + 1)
      setVerificationResult(result)
      track(Events.LogVerificationFailed, { tab: activeTab, day_number: dayNumber, attempt: attemptNumber, reason_excerpt: result.reason?.slice(0, 80) })
      if (attemptNumber >= 3) setPhase('honest')
    }
  }

  const handlePostToFeed = async () => {
    if (!sprint || !user || !lastLogId || !postDraft) return
    try {
      const created = await createFeedPost({
        log_id: lastLogId,
        sprint_id: sprint.id,
        user_id: user.id,
        post_text: postDraft,
      })
      if (!created) {
        alert("Couldn't post to feed. Your log is saved — try again in a moment.")
        return
      }
      await markLogPostedToFeed(lastLogId)
      track(Events.FeedPostCreated, { sprint_id: sprint.id, length: postDraft.length, visibility: sprint.visibility })
      incrementPeople('total_feed_posts', 1)
      navigate('/dashboard')
    } catch (e) {
      console.error('handlePostToFeed:', e)
      alert("Couldn't post to feed. Your log is saved — try again in a moment.")
    }
  }

  const generateAndSaveDraft = async (logId?: string) => {
    setGeneratingDraft(true)
    const draft = await generatePostDraft({
      goalText: sprint?.goal_text ?? '',
      logText: activeTab === 'text' ? logText : imageFiles[0]?.caption || '',
      dayNumber,
      sprintLength: sprint?.sprint_length ?? 30,
      isHonestDay: false,
      mediaType: activeTab === 'image' ? 'image' : activeTab === 'link' ? 'link' : null,
      linkUrl: activeTab === 'link' ? linkUrl : undefined,
      images: activeTab === 'image' ? imageFiles.map(img => ({ base64: img.base64, mimeType: img.mimeType, caption: img.caption })) : [],
    })
    setPostDraft(draft)
    setGeneratingDraft(false)
    setDraftReady(true)
    const id = logId ?? lastLogId
    if (id) updateLogDraft(id, draft)
  }

  const generateHonestDraft = async (honestText: string, logId: string) => {
    setGeneratingDraft(true)
    const draft = await generatePostDraft({
      goalText: sprint?.goal_text ?? '',
      logText: honestText,
      dayNumber,
      sprintLength: sprint?.sprint_length ?? 30,
      isHonestDay: true,
      mediaType: null,
      images: [],
    })
    setPostDraft(draft)
    setGeneratingDraft(false)
    setDraftReady(true)
    updateLogDraft(logId, draft)
  }

  return (
    <PageWrapper>
      {/* Sprint switcher pills (multi-sprint) */}
      {sprints.length > 1 && (
        <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '12px 16px 0', scrollbarWidth: 'none' }}>
          {sprints.map((s, i) => {
            const isActive = i === selectedIdx
            const dn = calculateDayNumber(s.start_date)
            const shortGoal = s.goal_text.split(' ').slice(0, 3).join(' ')
            return (
              <button
                key={s.id}
                onClick={() => setSelectedIdx(i)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  background: isActive ? 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)' : 'rgba(255,255,255,0.85)',
                  border: isActive ? 'none' : '1px solid #E8F0EC',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: isActive ? '#FFFFFF' : '#3D5949',
                  boxShadow: isActive ? '0 4px 12px rgba(107,176,72,0.25)' : 'none',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{shortGoal}</span>
                <span style={{ fontSize: '10px', opacity: 0.85 }}>· D{dn}</span>
              </button>
            )
          })}
        </div>
      )}
      {sprints.length > 1 && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', margin: '6px 16px 0' }}>
          Logging to: <span style={{ color: '#3D7A5F', fontWeight: 600 }}>{sprint?.goal_text}</span>
        </p>
      )}
      <div style={{ padding: '20px 16px' }}>
        {phase === 'input' && (
          <InputPhase
            logText={logText}
            setLogText={setLogText}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onVerify={handleVerify}
            onHonest={() => setPhase('honest')}
            taskText={todayTaskData?.task_text ?? mockLog.todayTask}
            dayNum={dayNumber || mockLog.day}
            verifying={verifying}
            verificationResult={verificationResult}
            attemptNumber={attemptNumber}
            onSetLinkUrl={setLinkUrlParent}
            onSetLinkCaption={setLinkCaptionParent}
            verifiedCount={verifiedCountState}
            upcomingTasks={upcomingTasks}
            currentDayNum={dayNumber}
            sprintLogs={sprintLogs}
            imageFiles={imageFiles}
            setImageFiles={setImageFiles}
            draftRestored={draftRestored}
            onDismissDraft={() => setDraftRestored(false)}
          />
        )}
        {phase === 'verifying' && <VerifyingPhase />}
        {phase === 'verified' && <VerifiedPhase logText={logText} onBack={() => navigate('/dashboard')} onPostToFeed={handlePostToFeed} postDraft={postDraft} setPostDraft={setPostDraft} generatingDraft={generatingDraft} draftReady={draftReady} taskText={todayTaskData?.task_text ?? mockLog.todayTask} dayNum={dayNumber || mockLog.day} verifiedCount={verifiedCountState} daysLeft={sprint ? sprint.sprint_length - dayNumber : 0} currentStreak={currentStreak} verificationResult={verificationResult} activeTab={activeTab} imageFiles={imageFiles} linkUrl={linkUrl} />}
        {phase === 'honest' && <HonestPhase onSubmit={async (honestText: string) => {
          if (!sprint || !user) return
          const newLog = await createLog({
            sprint_id: sprint.id,
            user_id: user.id,
            day_number: dayNumber,
            log_type: 'HONEST',
            log_text: honestText,
            media_url: null,
            ai_verification_result: null,
            ai_draft_post: null,
            posted_to_feed: false,
            verification_attempts: 0,
          })
          localStorage.removeItem('stridewithme_draft_log')
          track(Events.LogHonestSubmitted, { day_number: dayNumber, sprint_id: sprint.id, length: honestText.length })
          incrementPeople('total_honest_logs', 1)
          setPeople({ last_log_at: new Date().toISOString() })
          if (newLog) {
            setLastLogId(newLog.id)
            setLogText(honestText)
            setPhase('honest_done')
            generateHonestDraft(honestText, newLog.id)
            triggerPhaseUnlockIfDue()
          } else {
            navigate('/dashboard')
          }
        }} />}
        {phase === 'honest_done' && <HonestDonePhase
          honestText={logText}
          dayNum={dayNumber || mockLog.day}
          verifiedCount={verifiedCountState}
          currentStreak={currentStreak}
          daysLeft={sprint ? sprint.sprint_length - dayNumber : 0}
          postDraft={postDraft}
          setPostDraft={setPostDraft}
          generatingDraft={generatingDraft}
          draftReady={draftReady}
          onPostToFeed={handlePostToFeed}
          onBack={() => navigate('/dashboard')}
        />}
        {phase === 'done' && existingLog && (
          <DonePhase
            dayNum={dayNumber || 1}
            verifiedCount={verifiedCountState}
            currentStreak={currentStreak}
            daysLeft={sprint ? sprint.sprint_length - dayNumber : 0}
            existingLog={existingLog}
            taskText={todayTaskData?.task_text ?? mockLog.todayTask}
            onBack={() => navigate('/dashboard')}
            sprintId={sprint?.id}
            userId={user?.id}
          />
        )}
      </div>
      {verifying && <VerifyingOverlay />}
      {showBloom && (
        <BloomOverlay
          onComplete={() => {
            setShowBloom(false)
            setPhase('verified')
          }}
        />
      )}
      {phaseUnlock && !showBloom && (
        <PhaseUnlockedOverlay
          phase={phaseUnlock.phase}
          theme={phaseUnlock.theme}
          status={phaseUnlock.status}
          firstTaskText={phaseUnlock.firstTaskText}
          onContinue={() => { setPhaseUnlock(null); navigate('/dashboard') }}
        />
      )}
    </PageWrapper>
  )
}

function LogHeader({ dayNum, verifiedCount }: { dayNum: number; verifiedCount: number }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#7AB5A0' }}>
          DAILY LOG
        </span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', backgroundColor: '#D4EDE3', color: '#3D7A5F', borderRadius: '9999px', padding: '4px 10px' }}>
          {verifiedCount} verified ✓
        </span>
      </div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', color: '#1A3028', margin: '8px 0 16px' }}>
        Day {dayNum}
      </h1>
    </>
  )
}

function TodayTaskCard({ taskText }: { taskText: string }) {
  return (
    <div style={{ backgroundColor: '#EAF5F0', borderRadius: '0 16px 16px 0', padding: '16px', borderLeft: '4px solid #3D7A5F', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.12em', color: '#3D7A5F' }}>TODAY'S TASK</span>
      </div>
      <p style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 600, color: '#1A3028', margin: '4px 0 0' }}>{taskText}</p>
    </div>
  )
}

function VerifyingPhase() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #D4EDE3', borderTopColor: '#3D7A5F' }} />
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontStyle: 'italic', color: '#6B9E8A', marginTop: '16px' }}>
        Verifying your progress...
      </p>
    </div>
  )
}

function InputPhase({ logText, setLogText, activeTab, setActiveTab, onVerify, onHonest, taskText, dayNum, verifying, verificationResult, attemptNumber, onSetLinkUrl, onSetLinkCaption, verifiedCount, upcomingTasks, currentDayNum: _currentDayNum, sprintLogs, imageFiles, setImageFiles, draftRestored, onDismissDraft }: {
  logText: string; setLogText: (v: string) => void; activeTab: string; setActiveTab: (v: string) => void; onVerify: () => void; onHonest: () => void; taskText?: string; dayNum?: number; verifying?: boolean; verificationResult?: VerificationResult | null; attemptNumber?: number; onSetLinkUrl?: (v: string) => void; onSetLinkCaption?: (v: string) => void; verifiedCount?: number; upcomingTasks?: Task[]; currentDayNum?: number; sprintLogs?: Array<{ day_number: number; log_type: string }>; imageFiles?: Array<{ file: File; preview: string; base64: string; mimeType: string; caption: string }>; setImageFiles?: (files: Array<{ file: File; preview: string; base64: string; mimeType: string; caption: string }>) => void; draftRestored?: boolean; onDismissDraft?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkAdded, setLinkAdded] = useState(false)
  const [linkCaption, setLinkCaption] = useState('')
  const [linkError, setLinkError] = useState('')
  const [imageError, setImageError] = useState('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !setImageFiles) return

    const MAX_SIZE_BYTES = 3.5 * 1024 * 1024
    if (file.size > MAX_SIZE_BYTES) {
      setImageError(`File too large. Maximum size is 3.5MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`)
      return
    }
    setImageError('')

    let mimeType = file.type
    if (!mimeType || mimeType === '') {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/jpeg', heif: 'image/jpeg', bmp: 'image/png', tiff: 'image/jpeg', pdf: 'image/jpeg' }
      mimeType = mimeMap[ext ?? ''] ?? 'image/jpeg'
    }
    const claudeAccepted = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const finalMimeType = claudeAccepted.includes(mimeType) ? mimeType : 'image/jpeg'

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      setImageFiles([{ file, preview: result, base64, mimeType: finalMimeType, caption: '' }])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleAddLink = () => {
    if (!linkUrl.startsWith('http')) {
      setLinkError('Please enter a valid URL starting with http')
      return
    }
    setLinkError('')
    setLinkAdded(true)
  }

  const canVerify =
    (activeTab === 'text' && logText.length >= 20) ||
    (activeTab === 'image' && (imageFiles?.length ?? 0) > 0) ||
    (activeTab === 'link' && linkAdded)

  return (
    <>
      <LogHeader dayNum={dayNum ?? 1} verifiedCount={verifiedCount ?? 0} />
      <TodayTaskCard taskText={taskText ?? mockLog.todayTask} />

      {/* Encouragement */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
        <span>🌱</span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: 0 }}>
          You've shown up {dayNum ?? 1} days. Today is Day {dayNum ?? 1}. Write what happened — honestly.
        </p>
      </div>

      {draftRestored && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#EAF5F0', borderRadius: '10px', padding: '8px 12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px' }}>&#x1F4DD;</span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#3D7A5F', margin: 0, flex: 1 }}>Draft restored from your last session</p>
          <button onClick={onDismissDraft} style={{ background: 'none', border: 'none', color: '#9BBFB2', fontSize: '14px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>&#x2715;</button>
        </div>
      )}

      {/* Tab row */}
      <div style={{ display: 'flex', backgroundColor: '#EAF5F0', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
        {['Text', 'Image', 'Link'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              backgroundColor: activeTab === tab.toLowerCase() ? '#FFFFFF' : 'transparent',
              boxShadow: activeTab === tab.toLowerCase() ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              color: '#1A3028',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── TAB 1: TEXT ── */}
      {activeTab === 'text' && (
        <>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#1A3028', margin: '0 0 4px' }}>Today's progress log</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 8px' }}>What happened? What was hard? What moved?</p>
          <textarea
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
            placeholder="I worked on… The hardest was… I learned that…"
            style={{
              width: '100%',
              minHeight: '180px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #D4EDE3',
              padding: '14px',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#1A3028',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#7AB5A0')}
            onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
          />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'right', margin: '4px 0 16px' }}>
            {logText.length} / 20 min
          </p>
        </>
      )}

      {/* ── TAB 2: IMAGE ── */}
      {activeTab === 'image' && (
        <div style={{ marginBottom: '16px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf"
            capture="environment"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />

          {!(imageFiles?.length) ? (
            <div
              style={{
                border: '2px dashed #B8D9CC',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.6)',
              }}
            >
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>📸</span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Capture your work</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '6px 0 0' }}>
                Take a photo of your screen, notebook, or workspace
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  style={{
                    backgroundColor: '#3D7A5F',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '8px 16px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  Take a photo
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    backgroundColor: '#EAF5F0',
                    border: '1px solid #B8D9CC',
                    borderRadius: '9999px',
                    padding: '8px 16px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#3D7A5F',
                    cursor: 'pointer',
                  }}
                >
                  Choose from camera roll
                </button>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', marginTop: '8px' }}>Supports: JPG, PNG, WEBP, GIF, HEIC, PDF</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', marginTop: '2px' }}>Max size: 3.5MB</p>
              {imageError && <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#D97706', textAlign: 'center', marginTop: '8px' }}>{imageError}</p>}
            </div>
          ) : (
            <>
              <img
                src={imageFiles![0].preview}
                alt="Preview"
                style={{ width: '100%', borderRadius: '16px', maxHeight: '220px', objectFit: 'cover', border: '1.5px solid #D4EDE3', display: 'block' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={() => setImageFiles?.([])}
                  style={{ flex: 1, height: '36px', backgroundColor: '#FEF3E8', color: '#D97706', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Remove
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ flex: 1, height: '36px', backgroundColor: '#EAF5F0', color: '#3D7A5F', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Change photo
                </button>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', marginTop: '12px', marginBottom: '4px' }}>Add a caption (optional)</p>
              <input
                type="text"
                value={imageFiles?.[0]?.caption ?? ''}
                onChange={(e) => setImageFiles?.(imageFiles?.map((img, i) => i === 0 ? { ...img, caption: e.target.value } : img) ?? [])}
                placeholder="What does this show?"
                style={{
                  width: '100%',
                  border: '1px solid #D4EDE3',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: '#1A3028',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#7AB5A0')}
                onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
              />
            </>
          )}
        </div>
      )}

      {/* ── TAB 3: LINK ── */}
      {activeTab === 'link' && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: '0 0 4px' }}>Share a link as proof</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 12px' }}>
            A GitHub commit, Figma file, published post, or any work artifact.
          </p>

          {!linkAdded ? (
            <>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => { setLinkUrl(e.target.value); setLinkError(''); onSetLinkUrl?.(e.target.value) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddLink() }}
                  placeholder="https://github.com/you/project/commit/..."
                  style={{
                    flex: 1,
                    height: '44px',
                    border: '1.5px solid #D4EDE3',
                    borderRadius: '10px',
                    padding: '0 12px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: '#1A3028',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#3D7A5F')}
                  onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
                />
                <button
                  onClick={handleAddLink}
                  style={{
                    width: '48px',
                    height: '44px',
                    backgroundColor: '#3D7A5F',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    border: 'none',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
              {linkError && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#D97706', marginTop: '6px' }}>
                  ⚠ {linkError}
                </p>
              )}
            </>
          ) : (
            <>
              <div style={{
                backgroundColor: '#EAF5F0',
                border: '1px solid #B8D9CC',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <Link2 size={16} color="#3D7A5F" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#3D7A5F', margin: 0 }}>Link added ✓</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {linkUrl.length > 40 ? linkUrl.slice(0, 40) + '...' : linkUrl}
                  </p>
                </div>
                <button
                  onClick={() => { setLinkAdded(false); setLinkUrl('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                >
                  <X size={16} color="#9BBFB2" />
                </button>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', marginTop: '8px' }}>
                Your link will be included with your log for AI verification.
              </p>

              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: '#1A3028', marginTop: '14px', marginBottom: '6px' }}>What did you do? (recommended)</p>
              <textarea
                value={linkCaption}
                onChange={(e) => { setLinkCaption(e.target.value); onSetLinkCaption?.(e.target.value) }}
                placeholder="Describe what this link shows — what you built, researched, or completed today."
                style={{ width: '100%', minHeight: '100px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1.5px solid #D4EDE3', padding: '12px', fontFamily: 'var(--font-body)', fontSize: '13px', color: '#1A3028', fontStyle: 'italic', lineHeight: 1.6, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => (e.target.style.borderColor = '#3D7A5F')}
                onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
              />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', marginTop: '6px' }}>Strong links (GitHub, Figma, Notion, Vercel) verify without description.</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', marginTop: '2px' }}>All other links need context to verify.</p>
            </>
          )}
        </div>
      )}

      {/* Retry feedback */}
      {verificationResult && !verificationResult.verified && (
        <div style={{ backgroundColor: '#FEF3E8', border: '1px solid #F5D5A8', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: '#D97706', margin: 0 }}>{verificationResult.reason}</p>
          {verificationResult.guidanceForRetry && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '8px 0 0' }}>Try adding: {verificationResult.guidanceForRetry}</p>
          )}
          {(attemptNumber ?? 1) >= 3 && (
            <button onClick={onHonest} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#D97706', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', padding: 0 }}>Or log this as an honest day &rarr;</button>
          )}
        </div>
      )}

      {/* AI notice */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '12px', border: '1px solid #EDF2EF', marginBottom: '16px' }}>
        <span>🤖</span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: 0 }}>
          AI will read your entry, verify your progress, and share an insight. Takes ~3 seconds.
        </p>
      </div>

      {/* Primary CTA */}
      <button
        onClick={onVerify}
        disabled={!canVerify || verifying}
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)',
          color: '#FFFFFF',
          borderRadius: '9999px',
          border: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          fontWeight: 500,
          cursor: (!canVerify || verifying) ? 'not-allowed' : 'pointer',
          opacity: (!canVerify || verifying) ? 0.4 : 1,
          boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)',
        }}
      >
        {verifying ? 'Verifying...' : 'Verify with AI \u2192'}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#D4EDE3' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#9BBFB2' }}>or</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#D4EDE3' }} />
      </div>

      {/* Honest CTA */}
      <button
        onClick={onHonest}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#FEF3E8',
          color: '#D97706',
          borderRadius: '9999px',
          border: '1.5px solid #F59E4A',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        🤍 Today was hard — honest check-in
      </button>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', marginTop: '8px' }}>
        Honest days count. They're part of your story.
      </p>

      {/* Upcoming Plan */}
      {upcomingTasks && upcomingTasks.length > 0 && (
        <div style={{ marginTop: '24px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #EDF2EF', padding: '16px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028' }}>Coming up next</span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '2px 0 12px' }}>Your plan for the days ahead</p>
          {upcomingTasks.map((task) => {
            const log = sprintLogs?.find(l => l.day_number === task.day_number)
            return (
              <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: '1px solid #F5F5F5' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: log ? '#3D7A5F' : '#D4EDE3', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: log ? '#FFFFFF' : '#6B9E8A', boxSizing: 'border-box' }}>
                  {task.day_number}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#9BBFB2', fontStyle: 'italic', margin: '0 0 2px' }}>
                    Day {task.day_number}{log ? ' · ✓' : ''}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: log ? '#6B9E8A' : '#1A3028', margin: 0, textDecoration: log ? 'line-through' : 'none' }}>
                    {task.task_text}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function VerifiedPhase({ logText, onBack, onPostToFeed, postDraft, setPostDraft, generatingDraft, draftReady, taskText, dayNum, verifiedCount, daysLeft, currentStreak, verificationResult, activeTab, imageFiles, linkUrl }: { logText: string; onBack: () => void; onPostToFeed?: () => void; postDraft?: string; setPostDraft?: (v: string) => void; generatingDraft?: boolean; draftReady?: boolean; taskText?: string; dayNum?: number; verifiedCount?: number; daysLeft?: number; currentStreak?: number; verificationResult?: VerificationResult | null; activeTab?: string; imageFiles?: Array<{ file: File; preview: string; base64: string; mimeType: string; caption: string }>; linkUrl?: string }) {
  return (
    <>
      <LogHeader dayNum={dayNum ?? 1} verifiedCount={(verifiedCount ?? 0) + 1} />
      <TodayTaskCard taskText={taskText ?? mockLog.todayTask} />

      {/* Success card */}
      <div style={{ background: 'linear-gradient(135deg, #D4EDE3, #EAF5F0)', borderRadius: '24px', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 4px 16px rgba(61, 122, 95, 0.2)' }}>
          <Check size={28} color="#3D7A5F" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#1A3028', marginTop: '16px' }}>Day {dayNum ?? 1} verified.</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontStyle: 'italic', color: '#6B9E8A', margin: '4px 0 16px' }}>You showed up. That's the whole game.</p>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { value: String((verifiedCount ?? 0) + 1), label: 'Verified days' },
            { value: String((currentStreak ?? 0) + 1), emoji: '🔥', label: 'Day streak' },
            { value: String(daysLeft ?? 0), label: 'Days left' },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 700, color: '#1A3028' }}>
                {s.value}{s.emoji && <span style={{ marginLeft: '2px' }}>{s.emoji}</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#6B9E8A' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insight */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '16px', border: '1px solid #EDF2EF', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🤖</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '0.1em', color: '#7AB5A0' }}>AI INSIGHT</span>
          </div>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', backgroundColor: '#D4EDE3', color: '#3D7A5F', borderRadius: '9999px', padding: '3px 8px' }}>✓ Verified</span>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '0 0 8px' }}>Based on your Day {dayNum ?? 1} log</p>

        {verificationResult?.insight && (
          <div style={{ backgroundColor: '#EAF5F0', borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.6, fontStyle: 'italic', color: '#2D4A3E', margin: 0 }}>
              {verificationResult.insight}
            </p>
          </div>
        )}

        {verificationResult?.insightQuote && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '8px 0' }}>
            "{verificationResult.insightQuote}"
          </p>
        )}

        <div style={{ backgroundColor: '#F5FAF7', borderRadius: '8px', padding: '8px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: 0 }}>
            {activeTab === 'image' ? (imageFiles?.[0]?.caption || 'Image submitted as proof') : activeTab === 'link' ? (linkUrl ? (linkUrl.length > 50 ? linkUrl.slice(0, 50) + '...' : linkUrl) : 'Link submitted') : (logText.length > 80 ? logText.slice(0, 80) + '...' : logText)}
          </p>
        </div>
      </div>

      {/* Post Draft */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#7AB5A0', textTransform: 'uppercase' }}>YOUR POST DRAFT</span>
        {generatingDraft && (
          <div style={{ padding: '14px 16px', background: 'rgba(234,245,240,0.5)', borderRadius: '12px', border: '1px solid #D4EDE3', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '14px' }}>✍️</span>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#3D7A5F', fontStyle: 'italic', margin: 0, letterSpacing: '0.04em' }}>Drafting your post...</p>
            </div>
            {[100, 85, 60].map((width, i) => (
              <div key={i} style={{ height: '10px', width: `${width}%`, borderRadius: '4px', backgroundColor: '#D4EDE3', marginBottom: i < 2 ? '6px' : 0, animation: `shimmer 1.5s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        )}
        {draftReady && postDraft && setPostDraft && (
          <>
            <textarea
              value={postDraft}
              onChange={(e) => setPostDraft(e.target.value)}
              style={{ width: '100%', marginTop: '8px', backgroundColor: '#F5FAF7', borderRadius: '12px', border: '1px solid #D4EDE3', padding: '12px', fontFamily: 'var(--font-body)', fontSize: '13px', color: '#2D4A3E', fontStyle: 'italic', lineHeight: 1.6, minHeight: '80px', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: postDraft.length > 200 ? '#D97706' : '#9BBFB2', textAlign: 'right', margin: '4px 0 0' }}>{postDraft.length}/200</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <button onClick={onBack} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', background: 'none', border: 'none', cursor: 'pointer' }}>Skip</button>
              <button onClick={onPostToFeed ?? onBack} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#FFFFFF', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', border: 'none', borderRadius: '9999px', padding: '8px 16px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(107,176,72,0.25)' }}>Post to feed &rarr;</button>
            </div>
          </>
        )}
      </div>

      <button
        onClick={onBack}
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)',
          color: '#FFFFFF',
          borderRadius: '9999px',
          border: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)',
        }}
      >
        Back to my sprint &rarr;
      </button>
    </>
  )
}

function HonestPhase({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [honestText, setHonestText] = useState('')

  return (
    <div style={{ background: 'linear-gradient(180deg, #FEF8F0 0%, #FEF3E8 40%, #F5F0E8 100%)', margin: '-20px -16px', padding: '20px 16px', minHeight: '100vh' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#D97706' }}>HONEST CHECK-IN</span>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', color: '#1A3028', margin: '8px 0 12px' }}>Today was hard.</h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 24px', lineHeight: 1.6 }}>
        That's allowed here. Logging honestly is still showing up. Tell me what got in the way.
      </p>

      <textarea
        value={honestText}
        onChange={(e) => setHonestText(e.target.value)}
        placeholder="I didn't get to today's task because… What I did instead was… Tomorrow I want to…"
        style={{
          width: '100%',
          minHeight: '180px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1.5px solid #D4EDE3',
          padding: '14px',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          lineHeight: 1.6,
          color: '#1A3028',
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#F59E4A')}
        onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
      />

      <button
        onClick={() => onSubmit(honestText)}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#F59E4A',
          color: '#FFFFFF',
          borderRadius: '9999px',
          border: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          fontWeight: 500,
          cursor: 'pointer',
          marginTop: '16px',
        }}
      >
        Log my honest day →
      </button>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', marginTop: '8px' }}>
        This won't hurt your Sprint Record. Honesty is the point.
      </p>
    </div>
  )
}

function DonePhase({ dayNum, verifiedCount, currentStreak, daysLeft, existingLog, taskText, onBack, sprintId, userId }: {
  dayNum: number; verifiedCount: number; currentStreak: number; daysLeft: number;
  existingLog: DailyLog; taskText: string; onBack: () => void;
  sprintId?: string; userId?: string
}) {
  const logTime = new Date(existingLog.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const [draftText, setDraftText] = useState(existingLog.ai_draft_post ?? '')
  const [posted, setPosted] = useState(existingLog.posted_to_feed)
  const [posting, setPosting] = useState(false)
  const canShare = !!existingLog.ai_draft_post && !posted && !!sprintId && !!userId

  const handleShare = async () => {
    if (!sprintId || !userId || !draftText) return
    setPosting(true)
    await createFeedPost({ log_id: existingLog.id, sprint_id: sprintId, user_id: userId, post_text: draftText })
    await markLogPostedToFeed(existingLog.id)
    if (draftText !== existingLog.ai_draft_post) await updateLogDraft(existingLog.id, draftText)
    setPosted(true)
    setPosting(false)
  }

  return (
    <>
      <LogHeader dayNum={dayNum} verifiedCount={verifiedCount} />
      <TodayTaskCard taskText={taskText} />

      {/* Completion card */}
      <div style={{ background: 'linear-gradient(135deg, #D4EDE3, #EAF5F0)', borderRadius: '24px', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 4px 16px rgba(61, 122, 95, 0.2)' }}>
          <Check size={28} color="#3D7A5F" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: '#1A3028', marginTop: '16px' }}>You've logged today.</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', marginTop: '6px' }}>Come back tomorrow for Day {dayNum + 1}.</p>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {[
            { value: String(verifiedCount), label: 'Verified days' },
            { value: String(currentStreak), emoji: '🔥', label: 'Day streak' },
            { value: String(daysLeft), label: 'Days left' },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 700, color: '#1A3028' }}>
                {s.value}{s.emoji && <span style={{ marginLeft: '2px' }}>{s.emoji}</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#6B9E8A' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Existing log */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EDF2EF', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: existingLog.log_type === 'VERIFIED' ? '#3D7A5F' : '#D97706' }}>
            {existingLog.log_type === 'VERIFIED' ? '✅ Verified' : '🤍 Honest check-in'}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2' }}>{logTime}</span>
        </div>
        {existingLog.log_text && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.6, fontStyle: 'italic', color: '#2D4A3E', margin: 0 }}>
            {existingLog.log_text}
          </p>
        )}
        {existingLog.ai_verification_result?.reason && (
          <div style={{ borderLeft: '2px solid #B8D9CC', paddingLeft: '10px', marginTop: '10px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#7AB5A0', margin: 0 }}>
              AI: {existingLog.ai_verification_result.reason}
            </p>
          </div>
        )}
      </div>

      {/* Saved post draft — share later that day */}
      {canShare && (
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#7AB5A0', textTransform: 'uppercase' }}>YOUR POST DRAFT</span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '2px 0 6px' }}>Saved earlier — edit and share when you're ready.</p>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            style={{ width: '100%', backgroundColor: '#F5FAF7', borderRadius: '12px', border: '1px solid #D4EDE3', padding: '12px', fontFamily: 'var(--font-body)', fontSize: '13px', color: '#2D4A3E', fontStyle: 'italic', lineHeight: 1.6, minHeight: '80px', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: draftText.length > 200 ? '#D97706' : '#9BBFB2', textAlign: 'right', margin: '4px 0 0' }}>{draftText.length}/200</p>
          <button
            onClick={handleShare}
            disabled={posting || !draftText}
            style={{ width: '100%', marginTop: '8px', height: '44px', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: posting ? 'not-allowed' : 'pointer', opacity: posting ? 0.6 : 1, boxShadow: '0 4px 12px rgba(107,176,72,0.25)' }}
          >
            {posting ? 'Posting...' : 'Post to feed →'}
          </button>
        </div>
      )}
      {posted && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D7A5F', textAlign: 'center', marginBottom: '12px' }}>✓ Shared to feed</p>
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        style={{ width: '100%', height: '48px', backgroundColor: '#EAF5F0', color: '#2D5A47', border: '1px solid #B8D9CC', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
      >
        ← Back to dashboard
      </button>
    </>
  )
}

function HonestDonePhase({ honestText, dayNum, verifiedCount, currentStreak, daysLeft, postDraft, setPostDraft, generatingDraft, draftReady, onPostToFeed, onBack }: {
  honestText: string; dayNum: number; verifiedCount: number; currentStreak: number; daysLeft: number;
  postDraft: string; setPostDraft: (v: string) => void;
  generatingDraft: boolean; draftReady: boolean;
  onPostToFeed: () => void; onBack: () => void
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#D97706' }}>HONEST CHECK-IN</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', backgroundColor: '#FEF3E8', color: '#D97706', borderRadius: '9999px', padding: '4px 10px' }}>
          🤍 Logged
        </span>
      </div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', color: '#1A3028', margin: '8px 0 16px' }}>Day {dayNum}</h1>

      {/* Warm completion card */}
      <div style={{ background: 'linear-gradient(135deg, #FEF8F0 0%, #FEF3E8 100%)', borderRadius: '24px', padding: '24px', textAlign: 'center', marginBottom: '16px', border: '1px solid #F5D5A8' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 4px 16px rgba(245, 158, 74, 0.20)', fontSize: '28px' }}>
          🤍
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#1A3028', marginTop: '16px' }}>Day {dayNum} logged. Honestly.</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontStyle: 'italic', color: '#A66A2A', margin: '4px 0 16px' }}>Showing up imperfectly is still showing up.</p>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { value: String(verifiedCount), label: 'Verified days' },
            { value: String(currentStreak + 1), emoji: '🔥', label: 'Day streak' },
            { value: String(daysLeft), label: 'Days left' },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 700, color: '#1A3028' }}>
                {s.value}{s.emoji && <span style={{ marginLeft: '2px' }}>{s.emoji}</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#6B9E8A' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* What you wrote */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EDF2EF', padding: '14px 16px', marginBottom: '16px' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '0.1em', color: '#9BBFB2' }}>What you wrote</span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.6, fontStyle: 'italic', color: '#2D4A3E', margin: '6px 0 0' }}>
          {honestText}
        </p>
      </div>

      <div style={{ background: 'rgba(254, 243, 232, 0.6)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', border: '1px solid #F5D5A8' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#A66A2A', margin: 0, lineHeight: 1.6 }}>
          Honest days count toward your record. They tell the real story — and that's the one worth telling.
        </p>
      </div>

      {/* Post Draft */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#D97706', textTransform: 'uppercase' }}>SHARE YOUR HONEST DAY</span>
        {generatingDraft && (
          <div style={{ padding: '14px 16px', background: 'rgba(254,243,232,0.5)', borderRadius: '12px', border: '1px solid #F5D5A8', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '14px' }}>✍️</span>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#D97706', fontStyle: 'italic', margin: 0, letterSpacing: '0.04em' }}>Drafting your post...</p>
            </div>
            {[100, 85, 60].map((width, i) => (
              <div key={i} style={{ height: '10px', width: `${width}%`, borderRadius: '4px', backgroundColor: '#F5D5A8', marginBottom: i < 2 ? '6px' : 0, animation: `shimmer 1.5s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        )}
        {draftReady && (
          <>
            <textarea
              value={postDraft}
              onChange={(e) => setPostDraft(e.target.value)}
              style={{ width: '100%', marginTop: '8px', backgroundColor: '#FEF8F0', borderRadius: '12px', border: '1px solid #F5D5A8', padding: '12px', fontFamily: 'var(--font-body)', fontSize: '13px', color: '#2D4A3E', fontStyle: 'italic', lineHeight: 1.6, minHeight: '80px', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: postDraft.length > 200 ? '#D97706' : '#9BBFB2', textAlign: 'right', margin: '4px 0 0' }}>{postDraft.length}/200</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <button onClick={onBack} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', background: 'none', border: 'none', cursor: 'pointer' }}>Skip — keep it private</button>
              <button onClick={onPostToFeed} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#FFFFFF', background: 'linear-gradient(135deg, #F59E4A 0%, #D97706 100%)', border: 'none', borderRadius: '9999px', padding: '8px 16px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(217,119,6,0.25)' }}>Post to feed →</button>
            </div>
          </>
        )}
      </div>

      <button
        onClick={onBack}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)' }}
      >
        Back to my sprint →
      </button>
    </>
  )
}
