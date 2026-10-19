import { speakerLabel, type TranscriptLine } from '@pitchside/shared'

export function TranscriptList({ lines, limit }: { lines: TranscriptLine[]; limit?: number }) {
  const visible = limit ? lines.slice(-limit) : lines
  if (visible.length === 0) {
    return <p className="fine">Lines from you and the client show up here. Nothing leaves this computer.</p>
  }
  return (
    <ol className="transcript">
      {visible.map((line) => (
        <li key={line.id} className={line.final ? 'line' : 'line partial'}>
          <span className={`speaker ${line.speaker}`}>{speakerLabel(line.speaker)}</span>
          <span>{line.text}</span>
        </li>
      ))}
    </ol>
  )
}
