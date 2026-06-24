import { cn } from '@/lib/utils'

export type ScriptureItem = {
  quote: string
  reference: string
}

export type ScriptureLine = ScriptureItem & {
  showLeadingSeparator: boolean
}

export type ScriptureSectionHeaderViewModelInput = {
  hasIntroText: boolean
  scriptures: Array<ScriptureItem> | undefined
  headlineMaxW: string
  headlineNowrap: boolean
}

export type ScriptureSectionHeaderViewModel = {
  headlineClassName: string
  showBody: boolean
  showIntroScriptureSeparator: boolean
  scriptureLines: Array<ScriptureLine>
}

export function buildScriptureSectionHeaderViewModel({
  hasIntroText,
  scriptures,
  headlineMaxW,
  headlineNowrap,
}: ScriptureSectionHeaderViewModelInput): ScriptureSectionHeaderViewModel {
  const hasScriptures = scriptures != null

  return {
    headlineClassName: cn(
      'block font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em]',
      headlineMaxW,
      headlineNowrap && 'whitespace-nowrap',
    ),
    showBody: hasIntroText || hasScriptures,
    showIntroScriptureSeparator: hasIntroText && hasScriptures,
    scriptureLines: (scriptures ?? []).map((scripture, index) => ({
      quote: scripture.quote,
      reference: scripture.reference,
      showLeadingSeparator: index > 0,
    })),
  }
}
