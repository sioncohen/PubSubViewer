import express from 'express'
import cors from 'cors'
import projectRouter from './routes/project'
import subscriptionsRouter from './routes/subscriptions'
import messagesRouter from './routes/messages'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/project', projectRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/messages', messagesRouter)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})

export default app
