import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import type { ComponentType } from 'react'
import type { LinkProps } from '@tanstack/react-router'
import { IconButton } from '@/components/table/IconButton'
import { TooltipProvider } from '@/components/ui/tooltip'

type TableRow = Record<string, unknown>

type ButtonConfig<TData extends TableRow> = {
  icon: ComponentType<{ className?: string }>
  label: string
  onClick?: (row: TData) => void
  to?: (row: TData) => LinkProps
  show?: (row: TData) => boolean
}

export function createButtonColumn<TData extends TableRow>(
  buttons: Array<ButtonConfig<TData>>,
): ColumnDef<TData, any> {
  const columnHelper = createColumnHelper<TData>()
  return columnHelper.display({
    cell: (info) => {
      const row = info.row.original
      return (
        <TooltipProvider delay={200}>
          <div className="flex items-center justify-end gap-1">
            {buttons
              .filter((btn) => !btn.show || btn.show(row))
              .map((btn, index) => (
                <IconButton
                  key={index}
                  icon={btn.icon}
                  label={btn.label}
                  to={btn.to ? btn.to(row) : undefined}
                  onClick={btn.onClick ? () => btn.onClick!(row) : undefined}
                />
              ))}
          </div>
        </TooltipProvider>
      )
    },
    enableSorting: false,
    header: 'Actions',
    id: 'actions',
  })
}
