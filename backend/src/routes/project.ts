import { Router } from 'express'
import { runGcloud } from '../gcloud'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const project = await runGcloud(['config', 'get-value', 'project'])
    res.json({ project })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
