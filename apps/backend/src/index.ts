import { pathToFileURL } from 'node:url'
import { startServer } from './server'

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  startServer()
    .then((app) => {
      const address = app.server.address()
      const port = address && typeof address === 'object' ? address.port : 43124
      console.info(`[pitchside] backend listening on http://127.0.0.1:${port}`)
    })
    .catch((error: unknown) => {
      console.error('[pitchside] backend failed to start', error)
      process.exit(1)
    })
}
