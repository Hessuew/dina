import { describe, expect, it } from 'vitest'
import { getFirstError } from './app-form/app-form-fields.domain'

describe('getFirstError', () => {
  it('returns undefined when there are no errors', () => {
    expect(getFirstError([])).toBeUndefined()
  })

  it('returns undefined when the first error is falsy', () => {
    expect(getFirstError([undefined])).toBeUndefined()
    expect(getFirstError([null])).toBeUndefined()
    expect(getFirstError([''])).toBeUndefined()
  })

  it('returns a string error as-is', () => {
    expect(getFirstError(['Required'])).toBe('Required')
  })

  it('returns the message of an Error instance', () => {
    expect(getFirstError([new Error('boom')])).toBe('boom')
  })

  it('returns the message of an object that has a string message', () => {
    expect(getFirstError([{ message: 'invalid' }])).toBe('invalid')
  })

  it('stringifies an object whose message is not a string', () => {
    expect(getFirstError([{ message: 42 }])).toBe('[object Object]')
  })

  it('stringifies a non-string, non-object error', () => {
    expect(getFirstError([42])).toBe('42')
  })

  it('only considers the first error', () => {
    expect(getFirstError(['first', 'second'])).toBe('first')
  })
})
