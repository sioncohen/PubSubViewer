import { Router } from 'express'
import { runGcloud } from '../gcloud'

const router = Router()

interface GcloudSubscription {
  name: string
}

router.get('/', (_req, res) => {
  try {
    const output = runGcloud(['pubsub', 'subscriptions', 'list', '--format=json'])
    const raw: GcloudSubscription[] = output ? JSON.parse(output) : []
    const subscriptions = raw.map(s => s.name)
    res.json({ subscriptions })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
