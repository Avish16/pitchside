import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { hintForSlides, slideTitle, type DeckSlide, type DeckSlideSummary, type SlideHint } from '@pitchside/shared'

export class DeckStore {
  private slides: DeckSlide[] = []

  constructor(private readonly filePath: string) {
    this.slides = readSlides(filePath)
  }

  list(): DeckSlideSummary[] {
    return this.slides.map(summarize)
  }

  hint(query: string): SlideHint | null {
    return hintForSlides(this.slides, query)
  }

  replace(slides: DeckSlide[]): DeckSlideSummary[] {
    this.slides = slides
      .filter((slide) => Number.isInteger(slide.number) && slide.number > 0 && typeof slide.text === 'string')
      .slice(0, 200)
      .map((slide) => ({ number: slide.number, text: slide.text.trim().slice(0, 8000) }))
    this.persist()
    return this.list()
  }

  clear(): void {
    this.slides = []
    this.persist()
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(this.slides, null, 2))
  }
}

function summarize(slide: DeckSlide): DeckSlideSummary {
  return {
    number: slide.number,
    title: slideTitle(slide.text),
    excerpt: slide.text.replace(/\s+/g, ' ').trim().slice(0, 160),
  }
}

function readSlides(filePath: string): DeckSlide[] {
  if (!existsSync(filePath)) return []
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((value) => {
      if (!value || typeof value !== 'object') return []
      const slide = value as DeckSlide
      if (!Number.isInteger(slide.number) || typeof slide.text !== 'string') return []
      return [{ number: slide.number, text: slide.text }]
    })
  } catch {
    return []
  }
}
