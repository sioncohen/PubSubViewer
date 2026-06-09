import type { PubSubMessage } from '../types'
import MessageCard from './MessageCard'

interface Props {
  messages: PubSubMessage[]
  onClear: () => void
}

export default function MessageList({ messages, onClear }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </span>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-12">
          No messages yet. Select a subscription and click Start.
        </p>
      ) : (
        <div>
          {messages.map(m => (
            <MessageCard key={m.messageId} message={m} />
          ))}
        </div>
      )}
    </div>
  )
}
