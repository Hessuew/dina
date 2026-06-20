import { describe, expect, it } from 'vitest'
import { resolveAwardRowStyle } from '../about/about.domain'

describe('resolveAwardRowStyle', () => {
  it('styles the first-place row with the highest border opacity and gold text', () => {
    expect(resolveAwardRowStyle(1)).toEqual({
      borderOpacity: '50',
      textColor: '#E9D9B4',
      paddingBottom: '3',
      borderBottom: 'border-b',
    })
  })

  it('styles the second-place row with medium border opacity', () => {
    expect(resolveAwardRowStyle(2)).toEqual({
      borderOpacity: '40',
      textColor: '#D3CAC0',
      paddingBottom: '3',
      borderBottom: 'border-b',
    })
  })

  it('styles the third-place row without a bottom border and tighter padding', () => {
    expect(resolveAwardRowStyle(3)).toEqual({
      borderOpacity: '30',
      textColor: '#C9C0B6',
      paddingBottom: '1',
      borderBottom: 'border-b-0',
    })
  })

  it('falls back to the lowest tier styling for ranks beyond third', () => {
    expect(resolveAwardRowStyle(4)).toEqual({
      borderOpacity: '30',
      textColor: '#C9C0B6',
      paddingBottom: '3',
      borderBottom: 'border-b',
    })
  })
})
