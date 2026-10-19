import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadConfig, loadEnvFile } from './config'
import { startServer } from './server'

loadEnvFile(join(process.cwd(), '.env'))

const isMain = Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)

if (isMain) {
  const config = loadConfig()
  startServer(config.port)
    .then(() => {
      console.info(
        `[pitchside] backend listening on http://127.0.0.1:${config.port} (provider ${config.provider}, fast ${config.fastModel}, deep ${config.deepModel})`,
      )
    })
    .catch((error: unknown) => {
      console.error('[pitchside] backend failed to start', error)
      process.exit(1)
    })
}
