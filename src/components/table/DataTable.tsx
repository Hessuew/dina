import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2,
  Search,
} from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  SortingState,
  Table as TanstackTable,
} from '@tanstack/react-table'
import type { ComponentType } from 'react'
import type { LinkProps } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/table/IconButton'

type ButtonConfig<TData> = {
  icon: ComponentType<{ className?: string }>
  label: string
  onClick?: (row: TData) => void
  to?: (row: TData) => LinkProps
  show?: (row: TData) => boolean
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// Approximate rendered heights, used to cap the scroll area to `maxRows` rows.
// A body row's tallest cell is the size-8 (32px) action button + py-3 padding;
// the header is h-11. Values rounded up so `maxRows` rows always fit without a
// scrollbar, and row `maxRows + 1` triggers the internal scroll.
const ROW_HEIGHT_PX = 58
const HEADER_HEIGHT_PX = 46

type DataTableProps<TData> = {
  columns: Array<ColumnDef<TData, any>>
  data: Array<TData>
  pageSize?: number
  initialPage?: number
  // Cap the table to this many rows tall; rows beyond scroll within the table.
  maxRows?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  searchPlaceholder?: string
  // Server-side mode (opt-in — omit these to keep default client-side behavior)
  rowCount?: number
  initialSearch?: string
  initialSortBy?: string
  initialSortDir?: 'asc' | 'desc'
  onSearchChange?: (search: string) => void
  onSortingChange?: (sortBy: string | null, sortDir: 'asc' | 'desc') => void
  isLoading?: boolean
  loadingLabel?: string
  emptyMessage?: string
  rowClassName?: (row: TData) => string
}

export function createButtonColumn<TData>(
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

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (isSorted === 'asc')
    return <ChevronUp className="ml-1.5 inline-block size-3 shrink-0" />
  if (isSorted === 'desc')
    return <ChevronDown className="ml-1.5 inline-block size-3 shrink-0" />
  return (
    <ChevronsUpDown className="ml-1.5 inline-block size-3 shrink-0 opacity-30" />
  )
}

function buildPageWindow(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3)
    return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

// Table-option fragments that differ between server-side and client-side modes.
function serverModeOptions(isServerMode: boolean, rowCount: number | undefined) {
  return isServerMode
    ? {
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        rowCount,
      }
    : {
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
      }
}

function emitSorting(
  next: SortingState,
  onSortingChange: (sortBy: string | null, sortDir: 'asc' | 'desc') => void,
) {
  if (next.length > 0) {
    onSortingChange(next[0].id, next[0].desc ? 'desc' : 'asc')
  } else {
    onSortingChange(null, 'desc')
  }
}

function SearchBar({
  value,
  onChange,
  placeholder,
  isLoading,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  isLoading: boolean
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#8E816D]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 border-white/10 bg-[#1A1716] pr-8 pl-8 text-[0.82rem] text-[#F8F4EC] placeholder:text-[#8E816D] focus-visible:border-[#C5A059]/40 focus-visible:ring-0"
      />
      {isLoading && (
        <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin text-[#C5A059]" />
      )}
    </div>
  )
}

function DataTableHead<TData>({
  table,
  maxRows,
}: {
  table: TanstackTable<TData>
  maxRows: number | undefined
}) {
  // React Compiler must not memoize this: it reads live `table` state
  // (headerGroups/sort) off a stable `table` ref that never changes identity.
  'use no memo'
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow
          key={headerGroup.id}
          className="border-b border-white/10 hover:bg-transparent"
        >
          {headerGroup.headers.map((header) => {
            const canSort = header.column.getCanSort()
            return (
              <TableHead
                key={header.id}
                className={cn(
                  'h-11 px-4 text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase',
                  maxRows &&
                    'sticky top-0 z-10 border-b border-white/10 bg-[#151515]',
                )}
              >
                {header.isPlaceholder ? null : (
                  <button
                    type="button"
                    disabled={!canSort}
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      'flex items-center',
                      canSort
                        ? 'cursor-pointer hover:text-[#D4B373]'
                        : 'cursor-default',
                    )}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {canSort && (
                      <SortIcon isSorted={header.column.getIsSorted()} />
                    )}
                  </button>
                )}
              </TableHead>
            )
          })}
        </TableRow>
      ))}
    </TableHeader>
  )
}

function DataTableRows<TData>({
  table,
  columnCount,
  emptyMessage,
  rowClassName,
}: {
  table: TanstackTable<TData>
  columnCount: number
  emptyMessage: string
  rowClassName?: (row: TData) => string
}) {
  // React Compiler must not memoize this: it reads live `table` state
  // (getRowModel) off a stable `table` ref that never changes identity.
  'use no memo'
  if (table.getRowModel().rows.length === 0) {
    return (
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell
            colSpan={columnCount}
            className="py-12 text-center text-sm text-[#8E816D]"
          >
            {emptyMessage}
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }
  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => (
        <TableRow
          key={row.id}
          className={cn(
            'border-b border-white/8 transition-colors last:border-b-0 hover:bg-white/4',
            rowClassName?.(row.original),
          )}
        >
          {row.getVisibleCells().map((cell) => (
            <TableCell
              key={cell.id}
              className="px-4 py-3 text-sm text-[#D6CCBE]"
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}

function DataTableContent<TData>({
  table,
  columnCount,
  maxRows,
  isLoading,
  loadingLabel,
  emptyMessage,
  rowClassName,
}: {
  table: TanstackTable<TData>
  columnCount: number
  maxRows: number | undefined
  isLoading: boolean
  loadingLabel: string
  emptyMessage: string
  rowClassName?: (row: TData) => string
}) {
  // React Compiler must not memoize this: it forwards a stable `table` ref to
  // children that read live table state.
  'use no memo'
  return (
    <div className="relative border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      {isLoading && (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 border-b border-[#C5A059]/20 bg-[#1A1716]/95 px-4 py-2 text-[0.68rem] font-medium tracking-[0.18em] text-[#D4B373] uppercase">
          <Loader2 className="size-3.5 animate-spin" />
          {loadingLabel}
        </div>
      )}
      <Table
        containerClassName={maxRows ? 'overflow-y-auto' : undefined}
        containerStyle={
          maxRows
            ? { maxHeight: HEADER_HEIGHT_PX + maxRows * ROW_HEIGHT_PX }
            : undefined
        }
      >
        <DataTableHead table={table} maxRows={maxRows} />
        <DataTableRows
          table={table}
          columnCount={columnCount}
          emptyMessage={emptyMessage}
          rowClassName={rowClassName}
        />
      </Table>
    </div>
  )
}

function PaginationFooter<TData>({
  table,
  pageIndex,
  pageSize,
  sizeOptions,
  pageWindow,
  start,
  end,
  filteredTotal,
}: {
  table: TanstackTable<TData>
  pageIndex: number
  pageSize: number
  sizeOptions: Array<number>
  pageWindow: Array<number | '…'>
  start: number
  end: number
  filteredTotal: number
}) {
  // React Compiler must not memoize this: it reads live `table` state
  // (getCanPreviousPage/getCanNextPage) off a stable `table` ref.
  'use no memo'
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
          {start}–{end} of {filteredTotal}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
            Per page
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
              table.setPageSize(Number(val))
            }}
          >
            <SelectTrigger className="h-7 w-16 rounded-sm border-white/10 bg-[#1A1716] text-[0.76rem] text-[#D6CCBE] focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-sm border border-white/10 bg-[#1A1716] text-[#F8F4EC]">
              {sizeOptions.map((size) => (
                <SelectItem
                  key={size}
                  value={String(size)}
                  className="text-[0.76rem]"
                >
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent className="gap-1.5">
          <PaginationItem>
            <PaginationPrevious
              onClick={() => table.previousPage()}
              aria-disabled={!table.getCanPreviousPage()}
              className={cn(
                'rounded-sm',
                !table.getCanPreviousPage() && 'pointer-events-none opacity-30',
              )}
            />
          </PaginationItem>

          {pageWindow.map((page, i) =>
            page === '…' ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis className="text-[#8E816D]/60" />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <button
                  type="button"
                  onClick={() => table.setPageIndex(Number(page) - 1)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-sm border text-[0.76rem] transition-all duration-200 active:scale-95',
                    page === pageIndex + 1
                      ? 'border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] shadow-[0_0_12px_-4px_rgba(197,160,89,0.15)]'
                      : 'border-white/8 bg-black/10 text-[#8E816D] hover:border-white/15 hover:bg-black/20 hover:text-black',
                  )}
                >
                  {page}
                </button>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => table.nextPage()}
              aria-disabled={!table.getCanNextPage()}
              className={cn(
                'rounded-sm',
                !table.getCanNextPage() && 'pointer-events-none opacity-30',
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export function DataTable<TData>({
  columns,
  data,
  pageSize: initialPageSize = 10,
  initialPage,
  maxRows,
  onPageChange,
  onPageSizeChange,
  searchPlaceholder = 'Search…',
  rowCount,
  initialSearch = '',
  initialSortBy,
  initialSortDir = 'desc',
  onSearchChange,
  onSortingChange,
  isLoading = false,
  loadingLabel = 'Loading…',
  emptyMessage = 'No results found',
  rowClassName,
}: DataTableProps<TData>) {
  const isServerMode = rowCount !== undefined
  const tableTopRef = useRef<HTMLDivElement>(null)

  const [sorting, setSorting] = useState<SortingState>(
    initialSortBy
      ? [{ id: initialSortBy, desc: initialSortDir === 'desc' }]
      : [],
  )
  const [globalFilter, setGlobalFilter] = useState(initialSearch)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialPage ? initialPage - 1 : 0,
    pageSize: initialPageSize,
  })

  useEffect(() => {
    setGlobalFilter(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setPagination({
      pageIndex: initialPage ? initialPage - 1 : 0,
      pageSize: initialPageSize,
    })
  }, [initialPage, initialPageSize])

  useEffect(() => {
    setSorting(
      initialSortBy
        ? [{ id: initialSortBy, desc: initialSortDir === 'desc' }]
        : [],
    )
  }, [initialSortBy, initialSortDir])

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    setSorting(next)
    if (isServerMode && onSortingChange) emitSorting(next, onSortingChange)
  }

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater
    setPagination(next)
    if (next.pageSize !== pagination.pageSize) {
      onPageSizeChange?.(next.pageSize)
    } else if (next.pageIndex !== pagination.pageIndex) {
      onPageChange?.(next.pageIndex + 1)
      tableTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  const table = useReactTable({
    columns,
    data,
    ...serverModeOptions(isServerMode, rowCount),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    onGlobalFilterChange: (value) => {
      setGlobalFilter(value)
      onSearchChange?.(value)
    },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    state: { globalFilter, pagination, sorting },
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const filteredTotal = isServerMode
    ? rowCount
    : table.getFilteredRowModel().rows.length
  const start =
    filteredTotal === 0 ? 0 : Math.min(pageIndex * pageSize + 1, filteredTotal)
  const end = Math.min((pageIndex + 1) * pageSize, filteredTotal)
  const pageWindow = buildPageWindow(pageIndex + 1, pageCount)
  const sizeOptions = PAGE_SIZE_OPTIONS.includes(pageSize)
    ? PAGE_SIZE_OPTIONS
    : [...PAGE_SIZE_OPTIONS, pageSize].sort((a, b) => a - b)

  return (
    <div
      ref={tableTopRef}
      className="flex flex-col gap-4"
      aria-busy={isLoading}
    >
      <SearchBar
        value={globalFilter}
        onChange={(value) => {
          table.setGlobalFilter(value)
          if (!isServerMode) table.setPageIndex(0)
        }}
        placeholder={searchPlaceholder}
        isLoading={isLoading}
      />

      <DataTableContent
        table={table}
        columnCount={columns.length}
        maxRows={maxRows}
        isLoading={isLoading}
        loadingLabel={loadingLabel}
        emptyMessage={emptyMessage}
        rowClassName={rowClassName}
      />

      <PaginationFooter
        table={table}
        pageIndex={pageIndex}
        pageSize={pageSize}
        sizeOptions={sizeOptions}
        pageWindow={pageWindow}
        start={start}
        end={end}
        filteredTotal={filteredTotal}
      />
    </div>
  )
}
