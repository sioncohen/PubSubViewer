import express from 'express'
import cors from 'cors'
import projectRouter from './routes/project'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/project', projectRouter)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})

export default app
