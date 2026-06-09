interface Props {
  subscriptions: string[]
  selected: string | null
  isPolling: boolean
  disabled: boolean
  onSelect: (sub: string) => void
  onStart: () => void
  onStop: () => void
}

function shortName(full: string): string {
  return full.split('/').pop() ?? full
}

export default function SubscriptionSelector({
  subscriptions,
  selected,
  isPolling,
  disabled,
  onSelect,
  onStart,
  onStop
}: Props) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <select
        value={selected ?? ''}
        onChange={e => onSelect(e.target.value)}
        disabled={isPolling || disabled}
        className="bg-gray-800 border border-gray-600 text-gray-100 rounded px-3 py-2 text-sm min-w-72 disabled:opacity-50"
      >
        <option value="" disabled>Select a subscription…</option>
        {subscriptions.map(sub => (
          <option key={sub} value={sub}>{shortName(sub)}</option>
        ))}
      </select>

      <button
        onClick={isPolling ? onStop : onStart}
        disabled={!selected || disabled}
        className={`px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isPolling
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {isPolling ? 'Stop' : 'Start'}
      </button>

      {isPolling && (
        <span className="text-xs text-green-400 animate-pulse">● Polling</span>
      )}
    </div>
  )
}
