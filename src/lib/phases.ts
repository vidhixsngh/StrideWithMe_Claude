export interface PhaseInfo {
  name: 'Foundation' | 'Build' | 'Peak' | 'Finish'
  tag: string
  from: number
  to: number
  emoji: string
  color: string
  accent: string
}

/** Phase metadata for UI. Day ranges match db.ts getPhaseBoundaries. */
export function getPhases(total: number): PhaseInfo[] {
  if (total < 10) {
    const F = Math.max(1, Math.round(total * 0.3))
    const B = Math.max(F + 1, Math.round(total * 0.75))
    return [
      { name: 'Foundation', tag: 'Plant the roots', from: 1, to: F, emoji: '🌱', color: '#65D454', accent: '#A7F3A0' },
      { name: 'Build', tag: 'Stack the wins', from: F + 1, to: B, emoji: '🌿', color: '#14B8A6', accent: '#5EEAD4' },
      { name: 'Finish', tag: 'Land it', from: B + 1, to: total, emoji: '🌻', color: '#8B5CF6', accent: '#C4B5FD' },
    ]
  }
  const F = Math.max(1, Math.round(total * 0.2))
  const B = Math.max(F + 1, Math.round(total * 0.6))
  const P = Math.max(B + 1, Math.round(total * 0.85))
  return [
    { name: 'Foundation', tag: 'Plant the roots', from: 1, to: F, emoji: '🌱', color: '#65D454', accent: '#A7F3A0' },
    { name: 'Build', tag: 'Stack the wins', from: F + 1, to: B, emoji: '🌿', color: '#14B8A6', accent: '#5EEAD4' },
    { name: 'Peak', tag: 'Send it', from: B + 1, to: P, emoji: '⚡', color: '#F59E0B', accent: '#FCD34D' },
    { name: 'Finish', tag: 'Land it', from: P + 1, to: total, emoji: '🌻', color: '#8B5CF6', accent: '#C4B5FD' },
  ]
}
