import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { loadEnvFile } from './env'

describe('loadEnvFile', () => {
  it('fills missing variables and leaves existing ones alone', () => {
    const directory = mkdtempSync(join(tmpdir(), 'call-copilot-env-'))
    const filePath = join(directory, '.env')
    writeFileSync(
      filePath,
      ['# comment', 'DEEPGRAM_API_KEY="from-file"', 'OPENROUTER_MODEL=already', 'NOT VALID=x', ''].join(
        '\n',
      ),
    )
    const env: NodeJS.ProcessEnv = { OPENROUTER_MODEL: 'from-process' }
    loadEnvFile(filePath, env)
    expect(env.DEEPGRAM_API_KEY).toBe('from-file')
    expect(env.OPENROUTER_MODEL).toBe('from-process')
    expect(env['NOT VALID']).toBeUndefined()
  })
})
