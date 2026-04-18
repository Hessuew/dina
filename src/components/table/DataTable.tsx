import { useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type DataTableProps<TData> = {
  columns: Array<ColumnDef<TData, any>>
  data: Array<TData>
  pageSize?: number
  searchPlaceholder?: string
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

export function DataTable<TData>({
  columns,
  data,
  pageSize = 10,
  searchPlaceholder = 'Search…',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
    initialState: { pagination: { pageSize } },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    state: { globalFilter, sorting },
  })

  const { pageIndex } = table.getState().pagination
  const pageCount = table.getPageCount()
  const filteredTotal = table.getFilteredRowModel().rows.length
  const start = pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, filteredTotal)
  const pageWindow = buildPageWindow(pageIndex + 1, pageCount)

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#8E816D]" />
        <Input
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value)
            table.setPageIndex(0)
          }}
          placeholder={searchPlaceholder}
          className="h-9 border-white/10 bg-[#1A1716] pl-8 text-[0.82rem] text-[#F8F4EC] placeholder:text-[#8E816D] focus-visible:border-[#C5A059]/40 focus-visible:ring-0"
        />
      </div>

      {/* Table */}
      <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
        <Table>
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
                      className="h-11 px-4 text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase"
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
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-[#8E816D]"
                >
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-white/8 transition-colors last:border-b-0 hover:bg-white/4"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-4 py-3 text-sm text-[#D6CCBE]"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer: count + pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
            {start}–{end} of {filteredTotal}
          </span>

          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent className="gap-0">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => table.previousPage()}
                  aria-disabled={!table.getCanPreviousPage()}
                  className={cn(
                    'h-8 border border-white/10 bg-[#1A1716] text-[0.72rem] tracking-[0.15em] text-[#D6CCBE] uppercase transition-colors hover:border-[#C5A059]/40 hover:bg-white/6 hover:text-[#F8F4EC]',
                    !table.getCanPreviousPage() &&
                      'pointer-events-none opacity-40',
                  )}
                />
              </PaginationItem>

              {pageWindow.map((page, i) =>
                page === '…' ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis className="text-[#8E816D]" />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <button
                      type="button"
                      onClick={() => table.setPageIndex(Number(page) - 1)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center border text-[0.78rem] transition-colors',
                        page === pageIndex + 1
                          ? 'border-[#C5A059]/40 bg-[#1A1716] text-[#E9D9B4]'
                          : 'border-white/10 bg-transparent text-[#8E816D] hover:border-white/20 hover:text-[#D6CCBE]',
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
                    'h-8 border border-white/10 bg-[#1A1716] text-[0.72rem] tracking-[0.15em] text-[#D6CCBE] uppercase transition-colors hover:border-[#C5A059]/40 hover:bg-white/6 hover:text-[#F8F4EC]',
                    !table.getCanNextPage() && 'pointer-events-none opacity-40',
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
