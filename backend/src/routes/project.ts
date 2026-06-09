import { Router } from 'express'
import { runGcloud } from '../gcloud'

const router = Router()

router.get('/', (_req, res) => {
  try {
    const project = runGcloud(['config', 'get-value', 'project'])
    res.json({ project })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
