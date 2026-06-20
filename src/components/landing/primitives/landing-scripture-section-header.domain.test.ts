import { describe, expect, it } from 'vitest'
import { buildScriptureSectionHeaderViewModel } from '../primitives/landing-scripture-section-header.domain'

describe('buildScriptureSectionHeaderViewModel', () => {
  it('builds the headline className with the given max-width and no nowrap by default', () => {
    const vm = buildScriptureSectionHeaderViewModel({
      hasIntroText: false,
      scriptures: undefined,
      headlineMaxW: 'max-w-[14ch]',
      headlineNowrap: false,
    })

    expect(vm.headlineClassName).toContain('max-w-[14ch]')
    expect(vm.headlineClassName).not.toContain('whitespace-nowrap')
  })

  it('adds whitespace-nowrap to the headline className when headlineNowrap is set', () => {
    const vm = buildScriptureSectionHeaderViewModel({
      hasIntroText: false,
      scriptures: undefined,
      headlineMaxW: 'max-w-[20ch]',
      headlineNowrap: true,
    })

    expect(vm.headlineClassName).toContain('max-w-[20ch]')
    expect(vm.headlineClassName).toContain('whitespace-nowrap')
  })

  it('hides the body when there is neither intro text nor scriptures', () => {
    const vm = buildScriptureSectionHeaderViewModel({
      hasIntroText: false,
      scriptures: undefined,
      headlineMaxW: 'max-w-[14ch]',
      headlineNowrap: false,
    })

    expect(vm.showBody).toBe(false)
    expect(vm.showIntroScriptureSeparator).toBe(false)
    expect(vm.scriptureLines).toEqual([])
  })

  it('shows the body but no separator when only intro text is present', () => {
    const vm = buildScriptureSectionHeaderViewModel({
      hasIntroText: true,
      scriptures: undefined,
      headlineMaxW: 'max-w-[14ch]',
      headlineNowrap: false,
    })

    expect(vm.showBody).toBe(true)
    expect(vm.showIntroScriptureSeparator).toBe(false)
  })

  it('shows the body but no separator when only scriptures are present', () => {
    const vm = buildScriptureSectionHeaderViewModel({
      hasIntroText: false,
      scriptures: [{ quote: 'Be still', reference: 'Ps 46:10' }],
      headlineMaxW: 'max-w-[14ch]',
      headlineNowrap: false,
    })

    expect(vm.showBody).toBe(true)
    expect(vm.showIntroScriptureSeparator).toBe(false)
  })

  it('shows the intro/scripture separator when both intro text and scriptures are present', () => {
    const vm = buildScriptureSectionHeaderViewModel({
      hasIntroText: true,
      scriptures: [{ quote: 'Be still', reference: 'Ps 46:10' }],
      headlineMaxW: 'max-w-[14ch]',
      headlineNowrap: false,
    })

    expect(vm.showBody).toBe(true)
    expect(vm.showIntroScriptureSeparator).toBe(true)
  })

  it('treats an empty scriptures array as present (body shown, no lines)', () => {
    const vm = buildScriptureSectionHeaderViewModel({
      hasIntroText: false,
      scriptures: [],
      headlineMaxW: 'max-w-[14ch]',
      headlineNowrap: false,
    })

    expect(vm.showBody).toBe(true)
    expect(vm.scriptureLines).toEqual([])
  })

  it('marks the leading separator on every scripture line after the first', () => {
    const vm = buildScriptureSectionHeaderViewModel({
      hasIntroText: false,
      scriptures: [
        { quote: 'First', reference: 'A 1:1' },
        { quote: 'Second', reference: 'B 2:2' },
        { quote: 'Third', reference: 'C 3:3' },
      ],
      headlineMaxW: 'max-w-[14ch]',
      headlineNowrap: false,
    })

    expect(vm.scriptureLines).toEqual([
      { quote: 'First', reference: 'A 1:1', showLeadingSeparator: false },
      { quote: 'Second', reference: 'B 2:2', showLeadingSeparator: true },
      { quote: 'Third', reference: 'C 3:3', showLeadingSeparator: true },
    ])
  })
})
