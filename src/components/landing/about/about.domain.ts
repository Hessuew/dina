export type AwardRowStyle = {
  borderOpacity: string
  textColor: string
  paddingBottom: string
  borderBottom: string
}

export function resolveAwardRowStyle(rank: number): AwardRowStyle {
  return {
    borderOpacity: rank === 1 ? '50' : rank === 2 ? '40' : '30',
    textColor: rank === 1 ? '#E9D9B4' : rank === 2 ? '#D3CAC0' : '#C9C0B6',
    paddingBottom: rank === 3 ? '1' : '3',
    borderBottom: rank === 3 ? 'border-b-0' : 'border-b',
  }
}
