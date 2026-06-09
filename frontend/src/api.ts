import type { PubSubMessage } from './types'

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`)
  return data as T
}

export const fetchProject = () =>
  apiFetch<{ project: string }>('/project')

export const fetchSubscriptions = () =>
  apiFetch<{ subscriptions: string[] }>('/subscriptions')

export const fetchMessages = (subscription: string) =>
  apiFetch<{ messages: PubSubMessage[] }>(
    `/messages?subscription=${encodeURIComponent(subscription)}`
  )
