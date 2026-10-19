import { describe, expect, it } from 'vitest'
import { slidesFromPdf } from './pdf'

function buildPdf(pages: string[]): Uint8Array {
  const chunks: string[] = []
  const offsets = [0]
  const push = (text: string): void => {
    chunks.push(text)
  }
  push('%PDF-1.4\n')
  const objects: string[] = []
  const fontId = 3 + pages.length * 2
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`)
  pages.forEach((text, index) => {
    const pageId = 3 + index * 2
    const contentId = pageId + 1
    const stream = `BT /F1 18 Tf 48 700 Td (${text.replace(/[()\\]/g, '')}) Tj ET`
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\nendobj\n`,
    )
    objects.push(`${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`)
  })
  objects.push(`${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`)
  for (const object of objects) {
    offsets.push(chunks.join('').length)
    push(object)
  }
  const xrefAt = chunks.join('').length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  push(xref)
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`)
  return new Uint8Array(Buffer.from(chunks.join(''), 'latin1'))
}

describe('pdf slides', () => {
  it('reads one text block per page', async () => {
    const slides = await slidesFromPdf(buildPdf(['Pricing overview', 'London rollout']))
    expect(slides).toEqual([
      { number: 1, text: 'Pricing overview' },
      { number: 2, text: 'London rollout' },
    ])
  })
})
