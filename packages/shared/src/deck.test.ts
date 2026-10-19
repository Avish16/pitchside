import { describe, expect, it } from 'vitest'
import { hintForSlides } from './deck'

const slides = [
  { number: 1, text: 'Agenda for the discovery call and introductions.' },
  { number: 2, text: 'Pricing overview. A seat is $40 a month for the first ten people.' },
  { number: 3, text: 'London rollout takes three weeks with a shared workspace.' },
]

describe('deck hints', () => {
  it('jumps to the matching slide without calling a model', () => {
    const hint = hintForSlides(slides, 'Can you show me the pricing for a seat?')
    expect(hint?.number).toBe(2)
    expect(hint?.title).toContain('Pricing')
    const london = hintForSlides(slides, 'How long is the London rollout for the team?')
    expect(london?.number).toBe(3)
    expect(hintForSlides(slides, 'thanks')).toBeNull()
    expect(hintForSlides([], 'What is the seat price on the pricing slide?')).toBeNull()
  })
})
