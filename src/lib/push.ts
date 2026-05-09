import { savePushSubscription, deletePushSubscription } from './db'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export function isStandaloneInstalled(): boolean {
  if (typeof window === 'undefined') return false
  // Standard PWA detection
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari (legacy)
  const nav = navigator as Navigator & { standalone?: boolean }
  return !!nav.standalone
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !('MSStream' in window)
}

export type PushEnableResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: 'unsupported' | 'denied' | 'no-vapid' | 'no-sw' | 'subscribe-failed' | 'save-failed'; detail?: string }

export async function enablePush(userId: string): Promise<PushEnableResult> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' }
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'no-vapid' }

  // Permission
  let permission = Notification.permission
  if (permission === 'default') permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  // Service worker
  const reg = await navigator.serviceWorker.ready.catch(() => null)
  if (!reg) return { ok: false, reason: 'no-sw' }

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    } catch (e) {
      return { ok: false, reason: 'subscribe-failed', detail: String(e) }
    }
  }

  const saved = await savePushSubscription(userId, sub)
  if (!saved.ok) return { ok: false, reason: 'save-failed', detail: saved.error }

  return { ok: true, subscription: sub }
}

export async function disablePush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return true
  const reg = await navigator.serviceWorker.ready.catch(() => null)
  if (!reg) return true
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return true
  await deletePushSubscription(userId, sub.endpoint)
  await sub.unsubscribe().catch(() => {})
  return true
}
