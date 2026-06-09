import { execSync } from 'child_process'

export function runGcloud(args: string[]): string {
  try {
    return execSync(`gcloud ${args.join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error('gcloud CLI not found')
    }
    const stderr = err.stderr?.toString().trim()
    throw new Error(stderr || err.message)
  }
}
