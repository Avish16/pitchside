export function createUtteranceTracker(): {
  pushFinal: (text: string, speechFinal: boolean) => string | null
  flush: () => string | null
} {
  let buffer = ''

  const flush = (): string | null => {
    const utterance = buffer.trim()
    buffer = ''
    return utterance || null
  }

  const pushFinal = (text: string, speechFinal: boolean): string | null => {
    const piece = text.trim()
    if (piece) buffer = buffer ? `${buffer} ${piece}` : piece
    if (!speechFinal) return null
    return flush()
  }

  return { pushFinal, flush }
}
