export interface PubSubMessage {
  messageId: string
  publishTime: string
  data: string
  attributes: Record<string, string>
}
