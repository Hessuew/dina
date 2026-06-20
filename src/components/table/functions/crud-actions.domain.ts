import { EyeIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { LinkProps } from '@tanstack/react-router'

export type ButtonConfig<TData> = {
  icon: ComponentType<{ className?: string }>
  label: string
  onClick?: (row: TData) => void
  to?: (row: TData) => LinkProps
  show?: (row: TData) => boolean
}

export type CrudActionsConfig<TData> = {
  onView?: (row: TData) => void
  viewTo?: (row: TData) => LinkProps
  onEdit?: (row: TData) => void
  onDelete?: (row: TData) => void
  canManage?: (row: TData) => boolean
  viewIcon?: ComponentType<{ className?: string }>
  editIcon?: ComponentType<{ className?: string }>
  deleteIcon?: ComponentType<{ className?: string }>
  viewLabel?: string
  editLabel?: string
  deleteLabel?: string
}

/*
  createCrudActions: Helper for standard CRUD action buttons

  Creates View/Edit/Delete button configurations for use with createButtonColumn.

  Usage:
    createButtonColumn(
      createCrudActions<Student>({
        onView: (student) => router.navigate({ to: '/students/$id', params: { id: student.id } }),
        onEdit: (student) => openDialog('edit', student),
        onDelete: (student) => openDialog('delete', student),
        canManage: (student) => user.role === 'admin' || student.teacherId === user.id,
      })
    )

  Features:
    - Default icons (Eye, Pencil, Trash) and labels
    - Optional icon/label override per action
    - Optional canManage predicate for Edit+Delete visibility
    - Returns ButtonConfig[] for createButtonColumn
    - Mix with custom buttons: [...createCrudActions(...), customButton]

  Note: Use with explicit generic: createCrudActions<YourType>({ ... })
*/
export function createCrudActions<TData>(
  config: CrudActionsConfig<TData>,
): Array<ButtonConfig<TData>> {
  const actions: Array<ButtonConfig<TData>> = []

  const {
    onView,
    viewTo,
    onEdit,
    onDelete,
    canManage,
    viewIcon = EyeIcon,
    editIcon = PencilIcon,
    deleteIcon = Trash2Icon,
    viewLabel = 'View',
    editLabel = 'Edit',
    deleteLabel = 'Delete',
  } = config

  if (viewTo) {
    actions.push({
      icon: viewIcon,
      label: viewLabel,
      to: viewTo,
    })
  } else if (onView) {
    actions.push({
      icon: viewIcon,
      label: viewLabel,
      onClick: onView,
    })
  }

  if (onEdit) {
    actions.push({
      icon: editIcon,
      label: editLabel,
      onClick: onEdit,
      show: canManage,
    })
  }

  if (onDelete) {
    actions.push({
      icon: deleteIcon,
      label: deleteLabel,
      onClick: onDelete,
      show: canManage,
    })
  }

  return actions
}
