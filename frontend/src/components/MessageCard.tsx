import type { PubSubMessage } from '../types'

interface Props {
  message: PubSubMessage
}

export default function MessageCard({ message }: Props) {
  let parsedData: unknown = null
  let isJson = false
  try {
    parsedData = JSON.parse(message.data)
    isJson = true
  } catch {
    // isJson remains false
  }

  const hasAttributes = Object.keys(message.attributes).length > 0

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-center mb-3 text-xs text-gray-400">
        <span className="font-mono">ID: {message.messageId}</span>
        <span>{new Date(message.publishTime).toLocaleString()}</span>
      </div>

      <div className="mb-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Data</p>
        <pre className="bg-gray-900 rounded p-3 text-sm text-gray-200 overflow-x-auto whitespace-pre-wrap break-all font-mono">
          {isJson ? JSON.stringify(parsedData, null, 2) : message.data}
        </pre>
      </div>

      {hasAttributes && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Attributes</p>
          <table className="text-xs w-full">
            <tbody>
              {Object.entries(message.attributes).map(([k, v]) => (
                <tr key={k} className="border-t border-gray-700">
                  <td className="py-1 pr-4 text-gray-400 font-mono">{k}</td>
                  <td className="py-1 text-gray-200 font-mono">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
