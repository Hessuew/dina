import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/utils/errors'
import {
  decodeBase64DataUrl,
  extractStorageObjectName,
  resolveFileExtension,
  shouldConvertToWebP,
  validateImageUpload,
} from '@/utils/imageUpload/domain/imageUpload.domain'

describe('validateImageUpload', () => {
  it('passes for an allowed type within the size limit', () => {
    expect(() => validateImageUpload(1024, 'image/png')).not.toThrow()
  })

  it('passes at exactly the 2MB boundary', () => {
    expect(() =>
      validateImageUpload(2 * 1024 * 1024, 'image/jpeg'),
    ).not.toThrow()
  })

  it('throws when the file exceeds 2MB', () => {
    expect(() => validateImageUpload(2 * 1024 * 1024 + 1, 'image/png')).toThrow(
      'File size must be less than 2MB',
    )
  })

  it('throws for a disallowed file type', () => {
    expect(() => validateImageUpload(1024, 'application/pdf')).toThrow(
      'Only JPEG, PNG, WebP, and GIF images are allowed',
    )
  })
})

describe('shouldConvertToWebP', () => {
  it('returns false for GIF to preserve animation', () => {
    expect(shouldConvertToWebP('image/gif')).toBe(false)
  })

  it('returns true for other image types', () => {
    expect(shouldConvertToWebP('image/png')).toBe(true)
  })
})

describe('resolveFileExtension', () => {
  it('returns webp when the file was converted', () => {
    expect(resolveFileExtension('image/webp', 'photo.gif')).toBe('webp')
  })

  it('keeps the original extension when not converted', () => {
    expect(resolveFileExtension('image/gif', 'photo.gif')).toBe('gif')
  })

  it('returns the whole name when there is no extension', () => {
    expect(resolveFileExtension('image/gif', 'photo')).toBe('photo')
  })
})

describe('decodeBase64DataUrl', () => {
  it('decodes a data-URL prefixed payload', () => {
    const expected = Buffer.from('hello')
    const dataUrl = `data:image/png;base64,${expected.toString('base64')}`
    expect(decodeBase64DataUrl(dataUrl)).toEqual(expected)
  })

  it('decodes a raw base64 string without a prefix', () => {
    const expected = Buffer.from('world')
    expect(decodeBase64DataUrl(expected.toString('base64'))).toEqual(expected)
  })

  it('throws when the base64 content is missing after the comma', () => {
    expect(() => decodeBase64DataUrl('data:image/png;base64,')).toThrow(
      ValidationError,
    )
  })

  it('throws when the payload is empty', () => {
    expect(() => decodeBase64DataUrl('')).toThrow(ValidationError)
  })
})

describe('extractStorageObjectName', () => {
  it('returns the last path segment of a URL', () => {
    expect(extractStorageObjectName('https://host/bucket/user-123.webp')).toBe(
      'user-123.webp',
    )
  })
})
