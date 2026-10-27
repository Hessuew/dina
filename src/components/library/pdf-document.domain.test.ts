import { describe, expect, it, vi } from 'vitest'
import { createPdfDocumentLoad } from './pdf-document.domain'
import type { PdfDocumentTask } from './pdf-document.domain'

type Doc = { numPages: number }

function fakeTask(
  destroyImpl: () => Promise<unknown> = () => Promise.resolve(),
) {
  let resolveTask!: (doc: Doc) => void
  let rejectTask!: (error: unknown) => void
  const promise = new Promise<Doc>((resolve, reject) => {
    resolveTask = resolve
    rejectTask = reject
  })
  const task: PdfDocumentTask<Doc> = { promise, destroy: vi.fn(destroyImpl) }
  return { task, resolveTask, rejectTask }
}

function fakeCallbacks() {
  return { onLoaded: vi.fn(), onFailed: vi.fn() }
}

describe('createPdfDocumentLoad', () => {
  it('reports a loaded document', async () => {
    const { task, resolveTask } = fakeTask()
    const callbacks = fakeCallbacks()
    createPdfDocumentLoad(task, callbacks)

    resolveTask({ numPages: 7 })
    await task.promise

    expect(callbacks.onLoaded).toHaveBeenCalledWith({ numPages: 7 })
    expect(callbacks.onFailed).not.toHaveBeenCalled()
  })

  it('reports a failed load', async () => {
    const { task, rejectTask } = fakeTask()
    const callbacks = fakeCallbacks()
    createPdfDocumentLoad(task, callbacks)

    rejectTask(new Error('network'))
    await task.promise.catch(() => {})

    expect(callbacks.onFailed).toHaveBeenCalledTimes(1)
    expect(callbacks.onLoaded).not.toHaveBeenCalled()
  })

  it('ignores a stale rejection after cancel so a new document keeps loading', async () => {
    const first = fakeTask()
    const firstCallbacks = fakeCallbacks()
    createPdfDocumentLoad(first.task, firstCallbacks).cancel()

    const second = fakeTask()
    const secondCallbacks = fakeCallbacks()
    createPdfDocumentLoad(second.task, secondCallbacks)

    // The destroyed task's rejection lands after the new load reset state.
    first.rejectTask(new Error('Worker was destroyed'))
    second.resolveTask({ numPages: 3 })
    await first.task.promise.catch(() => {})
    await second.task.promise

    expect(firstCallbacks.onFailed).not.toHaveBeenCalled()
    expect(secondCallbacks.onLoaded).toHaveBeenCalledWith({ numPages: 3 })
    expect(secondCallbacks.onFailed).not.toHaveBeenCalled()
  })

  it('ignores a stale resolution so an obsolete document is not installed', async () => {
    const first = fakeTask()
    const firstCallbacks = fakeCallbacks()
    createPdfDocumentLoad(first.task, firstCallbacks).cancel()

    first.resolveTask({ numPages: 99 })
    await first.task.promise

    expect(firstCallbacks.onLoaded).not.toHaveBeenCalled()
    expect(firstCallbacks.onFailed).not.toHaveBeenCalled()
  })

  it('destroys the task on cancel', () => {
    const { task } = fakeTask()
    const callbacks = fakeCallbacks()
    const load = createPdfDocumentLoad(task, callbacks)

    load.cancel()

    expect(task.destroy).toHaveBeenCalledTimes(1)
    expect(callbacks.onLoaded).not.toHaveBeenCalled()
    expect(callbacks.onFailed).not.toHaveBeenCalled()
  })

  it('swallows a destroy failure instead of leaking a rejection', async () => {
    const { task } = fakeTask(() => Promise.reject(new Error('teardown')))
    const callbacks = fakeCallbacks()
    const load = createPdfDocumentLoad(task, callbacks)

    expect(() => load.cancel()).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
  })
})
