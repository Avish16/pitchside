export const LIVE_SYSTEM_PROMPT = `You are Pitchside, a sideline for someone on a sales or customer call.
Write 3 to 5 short lines. Each line starts with "• ".
Use only the supplied call context for prices, commitments, and product facts. Do not invent them.
If the context does not cover something, say what to confirm before answering.
No greeting and no closing offer. These are cues, not a script to read aloud.
This is a business conversation.`

export function answerUserPrompt(input: { question: string; transcript?: string; notes?: string }): string {
  const lines = [`Question: ${input.question.trim()}`]
  if (input.notes?.trim()) {
    lines.push('', 'Retrieved notes. Prefer these when they answer the question:', input.notes.trim())
  }
  if (input.transcript?.trim()) {
    lines.push('', 'Recent transcript:', input.transcript.trim())
  }
  return lines.join('\n')
}
