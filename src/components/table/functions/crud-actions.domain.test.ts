import { describe, expect, it, vi } from 'vitest'
import { EyeIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { createCrudActions } from './crud-actions.domain'
import type { LinkProps } from '@tanstack/react-router'

type Row = { id: string }

const link = (): LinkProps => ({ to: '/' })

describe('createCrudActions', () => {
  it('returns no actions for an empty config', () => {
    expect(createCrudActions<Row>({})).toEqual([])
  })

  it('emits a link view button when viewTo is provided', () => {
    const viewTo = vi.fn(link)
    const [view] = createCrudActions<Row>({ viewTo })

    expect(view.icon).toBe(EyeIcon)
    expect(view.label).toBe('View')
    expect(view.to).toBe(viewTo)
    expect(view.onClick).toBeUndefined()
  })

  it('emits an onClick view button when only onView is provided', () => {
    const onView = vi.fn()
    const [view] = createCrudActions<Row>({ onView })

    expect(view.onClick).toBe(onView)
    expect(view.to).toBeUndefined()
  })

  it('prefers viewTo over onView when both are provided', () => {
    const viewTo = vi.fn(link)
    const onView = vi.fn()
    const [view] = createCrudActions<Row>({ viewTo, onView })

    expect(view.to).toBe(viewTo)
    expect(view.onClick).toBeUndefined()
  })

  it('emits an edit button with canManage as its show predicate', () => {
    const onEdit = vi.fn()
    const canManage = vi.fn(() => true)
    const [edit] = createCrudActions<Row>({ onEdit, canManage })

    expect(edit.icon).toBe(PencilIcon)
    expect(edit.label).toBe('Edit')
    expect(edit.onClick).toBe(onEdit)
    expect(edit.show).toBe(canManage)
  })

  it('emits a delete button with canManage as its show predicate', () => {
    const onDelete = vi.fn()
    const canManage = vi.fn(() => false)
    const [del] = createCrudActions<Row>({ onDelete, canManage })

    expect(del.icon).toBe(Trash2Icon)
    expect(del.label).toBe('Delete')
    expect(del.onClick).toBe(onDelete)
    expect(del.show).toBe(canManage)
  })

  it('leaves show undefined on edit/delete when canManage is omitted', () => {
    const [edit, del] = createCrudActions<Row>({
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    })

    expect(edit.show).toBeUndefined()
    expect(del.show).toBeUndefined()
  })

  it('orders actions view → edit → delete', () => {
    const actions = createCrudActions<Row>({
      onView: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    })

    expect(actions.map((a) => a.label)).toEqual(['View', 'Edit', 'Delete'])
  })

  it('applies icon and label overrides for every action', () => {
    const Custom = () => null
    const actions = createCrudActions<Row>({
      viewTo: vi.fn(link),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      viewIcon: Custom,
      editIcon: Custom,
      deleteIcon: Custom,
      viewLabel: 'See',
      editLabel: 'Change',
      deleteLabel: 'Remove',
    })

    expect(actions.map((a) => a.icon)).toEqual([Custom, Custom, Custom])
    expect(actions.map((a) => a.label)).toEqual(['See', 'Change', 'Remove'])
  })
})
