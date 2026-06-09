import { execFileSync } from 'child_process'

export function runGcloud(args: string[]): string {
  try {
    return execFileSync('gcloud', args, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000
    }).trim()
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error('gcloud CLI not found')
    }
    const stderr = err.stderr?.toString().trim()
    throw new Error(stderr || err.message)
  }
}
