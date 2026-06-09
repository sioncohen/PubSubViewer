import { useEffect, useRef, useState } from 'react'
import { fetchProject, fetchSubscriptions, fetchMessages } from './api'
import type { PubSubMessage } from './types'
import SubscriptionSelector from './components/SubscriptionSelector'
import MessageList from './components/MessageList'

const MAX_MESSAGES = 200
const POLL_INTERVAL = 2000

export default function App() {
  const [project, setProject] = useState('')
  const [subscriptions, setSubscriptions] = useState<string[]>([])
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null)
  const [messages, setMessages] = useState<PubSubMessage[]>([])
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seenIds = useRef<Set<string>>(new Set())
  const activeSubRef = useRef<string | null>(null)

  useEffect(() => {
    fetchProject()
      .then(({ project }) => setProject(project))
      .catch(err => setError(err.message))

    fetchSubscriptions()
      .then(({ subscriptions }) => setSubscriptions(subscriptions))
      .catch(err => setError(err.message))

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    activeSubRef.current = null
    setIsPolling(false)
  }

  function startPolling() {
    if (!selectedSubscription) return
    activeSubRef.current = selectedSubscription
    setError(null)
    setIsPolling(true)
    const sub = selectedSubscription
    intervalRef.current = setInterval(async () => {
      try {
        const { messages: incoming } = await fetchMessages(sub)
        if (activeSubRef.current !== sub) return
        const unique = incoming.filter(m => !seenIds.current.has(m.messageId))
        unique.forEach(m => seenIds.current.add(m.messageId))
        if (unique.length > 0) {
          setMessages(prev => [...unique, ...prev].slice(0, MAX_MESSAGES))
        }
      } catch (err: any) {
        if (activeSubRef.current !== sub) return
        setError(err.message)
        stopPolling()
      }
    }, POLL_INTERVAL)
  }

  function handleSelectSubscription(sub: string) {
    stopPolling()
    setMessages([])
    seenIds.current.clear()
    setSelectedSubscription(sub)
  }

  function handleClear() {
    setMessages([])
    seenIds.current.clear()
  }

  const loadError = !project && !subscriptions.length && !!error

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">PubSub Viewer</h1>
        {project && (
          <p className="text-sm text-gray-400 mt-1">Project: {project}</p>
        )}
      </header>

      {error && (
        <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-300 hover:text-red-100 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      <SubscriptionSelector
        subscriptions={subscriptions}
        selected={selectedSubscription}
        isPolling={isPolling}
        disabled={loadError}
        onSelect={handleSelectSubscription}
        onStart={startPolling}
        onStop={stopPolling}
      />

      <MessageList messages={messages} onClear={handleClear} />
    </div>
  )
}
