import { cosine, embed } from './knowledge'

export interface DeckSlide {
  number: number
  text: string
}

export interface SlideHint {
  number: number
  title: string
  excerpt: string
  score: number
}

export interface DeckSlideSummary {
  number: number
  title: string
  excerpt: string
}

export function slideTitle(text: string): string {
  const first = text.split(/[.\n]/)[0]?.trim() ?? ''
  return first.slice(0, 80) || 'Untitled slide'
}

export function hintForSlides(slides: DeckSlide[], query: string): SlideHint | null {
  const clean = query.replace(/\s+/g, ' ').trim()
  if (clean.length < 12 || slides.length === 0) return null
  const queryVector = embed(clean)
  const ranked = slides
    .filter((slide) => slide.text.trim())
    .map((slide) => ({ slide, score: cosine(queryVector, embed(`${slideTitle(slide.text)}\n${slide.text}`)) }))
    .sort((left, right) => right.score - left.score)
  const best = ranked[0]
  if (!best || best.score < 0.18) return null
  const runnerUp = ranked[1]?.score ?? 0
  if (ranked.length > 1 && best.score - runnerUp < 0.015) return null
  return {
    number: best.slide.number,
    title: slideTitle(best.slide.text),
    excerpt: best.slide.text.replace(/\s+/g, ' ').trim().slice(0, 180),
    score: Number(best.score.toFixed(4)),
  }
}
