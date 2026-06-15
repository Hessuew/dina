import { describe, expect, it } from 'vitest'
import { parseEnrollmentsSearch } from './enrollments-search.domain'

describe('parseEnrollmentsSearch', () => {
  it('defaults every field for an empty search', () => {
    expect(parseEnrollmentsSearch({})).toEqual({
      page: 1,
      pageSize: 10,
      search: '',
      sortBy: 'createdAt',
      sortDir: 'desc',
      review: undefined,
      viewAll: false,
    })
  })

  it('keeps a positive numeric page', () => {
    expect(parseEnrollmentsSearch({ page: 4 }).page).toBe(4)
  })

  it('falls back to page 1 for a non-positive page', () => {
    expect(parseEnrollmentsSearch({ page: 0 }).page).toBe(1)
    expect(parseEnrollmentsSearch({ page: -3 }).page).toBe(1)
  })

  it('falls back to page 1 for a non-numeric page', () => {
    expect(parseEnrollmentsSearch({ page: '2' }).page).toBe(1)
  })

  it('keeps a valid page size', () => {
    expect(parseEnrollmentsSearch({ pageSize: 50 }).pageSize).toBe(50)
  })

  it('coerces a numeric-string page size', () => {
    expect(parseEnrollmentsSearch({ pageSize: '20' }).pageSize).toBe(20)
  })

  it('falls back to page size 10 for an unsupported size', () => {
    expect(parseEnrollmentsSearch({ pageSize: 999 }).pageSize).toBe(10)
  })

  it('keeps a string search term', () => {
    expect(parseEnrollmentsSearch({ search: 'ada' }).search).toBe('ada')
  })

  it('falls back to an empty search term for a non-string', () => {
    expect(parseEnrollmentsSearch({ search: 42 }).search).toBe('')
  })

  it('keeps a valid sort key', () => {
    expect(parseEnrollmentsSearch({ sortBy: 'fullLegalName' }).sortBy).toBe(
      'fullLegalName',
    )
  })

  it('falls back to createdAt for an unknown sort key', () => {
    expect(parseEnrollmentsSearch({ sortBy: 'bogus' }).sortBy).toBe('createdAt')
  })

  it('keeps an ascending sort direction', () => {
    expect(parseEnrollmentsSearch({ sortDir: 'asc' }).sortDir).toBe('asc')
  })

  it('keeps a descending sort direction', () => {
    expect(parseEnrollmentsSearch({ sortDir: 'desc' }).sortDir).toBe('desc')
  })

  it('falls back to descending for an invalid sort direction', () => {
    expect(parseEnrollmentsSearch({ sortDir: 'sideways' }).sortDir).toBe('desc')
  })

  it('keeps a string review id', () => {
    expect(parseEnrollmentsSearch({ review: 'abc' }).review).toBe('abc')
  })

  it('leaves review undefined for a non-string', () => {
    expect(parseEnrollmentsSearch({ review: 123 }).review).toBeUndefined()
  })

  it('keeps a boolean viewAll', () => {
    expect(parseEnrollmentsSearch({ viewAll: true }).viewAll).toBe(true)
  })

  it('falls back to false viewAll for a non-boolean', () => {
    expect(parseEnrollmentsSearch({ viewAll: 'yes' }).viewAll).toBe(false)
  })
})
