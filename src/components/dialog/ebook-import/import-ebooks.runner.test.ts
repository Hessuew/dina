import { describe, expect, it, vi } from 'vitest'
import { initialImportRows, scanSelectedFiles } from './import-ebooks.domain'
import { runImportQueue } from './import-ebooks.runner'

function rows(count: number) {
  return initialImportRows(
    scanSelectedFiles(
      Array.from(
        { length: count },
        (_, index) =>
          new File(['pdf'], `${index}.pdf`, { type: 'application/pdf' }),
      ),
    ),
  )
}

describe('import queue', () => {
  it('limits concurrency to three and transitions every row', async () => {
    let active = 0
    let maximum = 0
    const updates: Array<string> = []
    const io = {
      upload: vi.fn(async (row) => {
        active++
        maximum = Math.max(maximum, active)
        await Promise.resolve()
        active--
        return `owned/${row.file.name}`
      }),
      create: vi.fn(async () => {}),
    }
    await runImportQueue({
      rows: rows(5),
      settings: { category: 'Wisdom', isPublished: false },
      io,
      update: (id, update) => updates.push(`${id}:${update.status}`),
      shouldStop: () => false,
    })
    expect(maximum).toBe(3)
    expect(io.create).toHaveBeenCalledTimes(5)
    expect(
      updates.filter((value) => value.endsWith(':succeeded')),
    ).toHaveLength(5)
  })

  it('keeps uploaded path after create failure and reuses it on retry', async () => {
    const source = rows(1)[0]
    const state = { ...source }
    const upload = vi.fn(async () => 'owned/0.pdf')
    let shouldFail = true
    const create = vi.fn(async () => {
      if (shouldFail) throw new Error('row failed')
    })
    const update = (_id: string, patch: Partial<typeof state>) =>
      Object.assign(state, patch)
    await runImportQueue({
      rows: [source],
      settings: { category: 'Faith', isPublished: true },
      io: { upload, create },
      update,
      shouldStop: () => false,
      concurrency: 1,
    })
    expect(state).toMatchObject({
      status: 'failed',
      uploadedPath: 'owned/0.pdf',
      error: 'Something went wrong. Please try again.',
    })
    shouldFail = false
    await runImportQueue({
      rows: [state],
      settings: { category: 'Faith', isPublished: true },
      io: { upload, create },
      update,
      shouldStop: () => false,
      concurrency: 1,
    })
    expect(upload).toHaveBeenCalledTimes(1)
    expect(state.status).toBe('succeeded')
  })

  it('stops before queued work and handles non-Error failures', async () => {
    let stop = false
    const state = rows(2)
    await runImportQueue({
      rows: state,
      settings: { category: 'Wisdom', isPublished: false },
      concurrency: 1,
      io: {
        upload: async () => {
          stop = true
          throw 'nope'
        },
        create: async () => {},
      },
      update: (id, patch) =>
        Object.assign(
          state.find((row) => row.id === id)!,
          patch,
        ),
      shouldStop: () => stop,
    })
    expect(state[0]).toMatchObject({
      status: 'failed',
      error: 'Something went wrong. Please try again.',
    })
    expect(state[1].status).toBe('queued')
  })
})
