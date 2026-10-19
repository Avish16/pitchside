export const LIVE_SYSTEM_PROMPT = `You are Pitchside, a sideline for someone on a sales or customer call.
Write 3 to 5 short lines. Each line starts with "• ".
Use only the supplied call context for prices, commitments, and product facts. Do not invent them.
If the context does not cover something, say what to confirm before answering.
No greeting and no closing offer. These are cues, not a script to read aloud.
This is a business conversation.`

export const SUMMARY_SYSTEM_PROMPT = `You write the notes after a sales or customer call.
Use only the transcript. Do not invent prices, dates, or promises that were not said.
Reply in markdown with these headings and nothing before them:
## Summary
## Next steps
## Follow-up email
The email is a draft the rep can edit. Keep it short and specific.`

export function summaryUserPrompt(transcript: string): string {
  return `Transcript:\n${transcript.trim()}`
}

export function notesMarkdown(input: { summary: string; transcript?: string }): string {
  const parts = [input.summary.trim() || 'No draft yet.']
  if (input.transcript?.trim()) parts.push(`## Transcript\n${input.transcript.trim()}`)
  parts.push('_Exported from Pitchside. Audio is not included._')
  return `${parts.join('\n\n')}\n`
}

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
