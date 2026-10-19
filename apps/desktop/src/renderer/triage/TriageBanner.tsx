import type { TriageNotice } from '@pitchside/shared'

const labels: Record<TriageNotice['kind'], string> = {
  question: 'Question',
  objection: 'Objection',
  buying_signal: 'Buying signal',
  small_talk: 'Small talk',
  other: 'Other',
}

export function TriageBanner({ notice }: { notice: TriageNotice | null }) {
  if (!notice || !notice.text) return null
  return (
    <div className="triage">
      <div className="row">
        <span className="pill">{labels[notice.kind]}</span>
        <span className="pill">{notice.source === 'model' ? 'Fast model check' : 'Local rules'}</span>
      </div>
      {notice.battlecard ? (
        <div>
          <strong>{notice.battlecard.title}</strong>
          <p>{notice.battlecard.excerpt}</p>
        </div>
      ) : (
        <p className="fine">{notice.text}</p>
      )}
    </div>
  )
}
