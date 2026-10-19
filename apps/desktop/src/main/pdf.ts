import { readFileSync } from 'node:fs'
import type { DeckSlide } from '@pitchside/shared'

interface PdfTextItem {
  str?: string
}

interface PdfDoc {
  numPages: number
  getPage: (pageNumber: number) => Promise<{ getTextContent: () => Promise<{ items: PdfTextItem[] }> }>
  cleanup: () => Promise<void>
}

export async function slidesFromPdf(data: Uint8Array): Promise<DeckSlide[]> {
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as {
    getDocument: (src: { data: Uint8Array; verbosity?: number }) => { promise: Promise<PdfDoc> }
  }
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise
  const slides: DeckSlide[] = []
  try {
    for (let number = 1; number <= doc.numPages; number += 1) {
      const page = await doc.getPage(number)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => item.str ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      slides.push({ number, text: text || `Slide ${number}` })
    }
  } finally {
    await doc.cleanup()
  }
  return slides
}

export function readPdfFile(filePath: string): Uint8Array {
  return new Uint8Array(readFileSync(filePath))
}
