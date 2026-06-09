import { Router } from 'express'
import { runGcloud } from '../gcloud'

const router = Router()

interface GcloudMessage {
  ackId: string
  message: {
    messageId: string
    publishTime: string
    data?: string
    attributes?: Record<string, string>
  }
}

interface NormalizedMessage {
  messageId: string
  publishTime: string
  data: string
  attributes: Record<string, string>
}

router.get('/', async (req, res) => {
  const subscription = req.query.subscription as string
  if (!subscription) {
    return res.status(400).json({ error: 'subscription query param required' })
  }
  try {
    const output = await runGcloud([
      'pubsub', 'subscriptions', 'pull', subscription,
      '--no-auto-ack',
      '--limit=10',
      '--format=json'
    ])
    const raw: GcloudMessage[] = output ? JSON.parse(output) : []
    const messages: NormalizedMessage[] = raw.map(item => ({
      messageId: item.message.messageId,
      publishTime: item.message.publishTime,
      data: item.message.data
        ? Buffer.from(item.message.data, 'base64').toString('utf-8')
        : '',
      attributes: item.message.attributes ?? {}
    }))
    res.json({ messages })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
