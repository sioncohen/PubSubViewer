import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
const isWindows = process.platform === 'win32'

export async function runGcloud(args: string[]): Promise<string> {
  // On Windows, .cmd files can't be spawned directly — route through cmd.exe
  const [bin, binArgs]: [string, string[]] = isWindows
    ? ['cmd', ['/d', '/s', '/c', 'gcloud', ...args]]
    : ['gcloud', args]

  try {
    const { stdout } = await execFileAsync(bin, binArgs, {
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024
    })
    return stdout.trim()
  } catch (err: any) {
    if (err.code === 'ENOENT') throw new Error('gcloud CLI not found')
    if (err.killed || err.code === 'ETIMEDOUT') throw new Error('gcloud command timed out after 30s')
    const stderr = err.stderr?.toString().trim()
    throw new Error(stderr || err.message)
  }
}
