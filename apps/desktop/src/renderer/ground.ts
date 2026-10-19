import { formatRetrieved, speakerLabel, type AnswerMode, type PitchsideBridge } from '@pitchside/shared'

export async function askGrounded(
  bridge: PitchsideBridge,
  question: string,
  mode: AnswerMode,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const [hits, context, lines] = await Promise.all([
    bridge.searchKnowledge(question),
    bridge.knowledgeContext(),
    bridge.getTranscript(),
  ])
  const transcript = lines
    .slice(-12)
    .map((line) => `${speakerLabel(line.speaker)}: ${line.text}`)
    .join('\n')
  return bridge.ask({
    question,
    mode,
    context: context || undefined,
    notes: formatRetrieved(hits) || undefined,
    transcript: transcript || undefined,
    citations: hits.map(({ title, kind, excerpt }) => ({ title, kind, excerpt })),
  })
}
