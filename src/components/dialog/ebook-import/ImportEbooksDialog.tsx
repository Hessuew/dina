import { useRef } from 'react'
import { FilesIcon, FolderOpenIcon, UploadIcon } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { useImportEbooks } from './use-import-ebooks'
import type { ChangeEvent, RefObject } from 'react'
import type { LibraryTopic } from '@/lib/library-topics'
import type { MediaLibraryRow } from '@/utils/library'
import type { ImportRow, SkippedFile } from './import-ebooks.domain'
import { createLibraryMedia } from '@/utils/library'
import { LIBRARY_TOPICS, isLibraryTopic } from '@/lib/library-topics'
import { uploadMediaFileDirect } from '@/components/dialog/media-dialog/media-dialog.logic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  DATA_TABLE_BODY_CELL_CLASS,
  DATA_TABLE_BODY_ROW_CLASS,
  DATA_TABLE_FRAME_CLASS,
  DATA_TABLE_HEADER_CELL_CLASS,
  DATA_TABLE_HEADER_ROW_CLASS,
  DATA_TABLE_STICKY_HEADER_CELL_CLASS,
} from '@/components/table/data-table.styles'
import { cn } from '@/lib/utils'

function fileForUpload(row: ImportRow): File {
  if (row.file.type === row.mimeType) return row.file
  return new File([row.file], row.file.name, {
    type: row.mimeType,
    lastModified: row.file.lastModified,
  })
}

const importIo = {
  async upload(row: ImportRow) {
    const result = await uploadMediaFileDirect(fileForUpload(row), 'document')
    return result.fileUrl
  },
  async create(payload: Parameters<typeof createLibraryMedia>[0]['data']) {
    await createLibraryMedia({ data: payload })
  },
}

function FolderInput({
  inputRef,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  const directoryProps = { webkitdirectory: '', directory: '' }
  return (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      multiple
      className="hidden"
      onChange={onChange}
      {...directoryProps}
    />
  )
}

function StepIndicator({ step }: { step: 'select' | 'review' | 'upload' }) {
  const steps = ['Choose files', 'Review', 'Import']
  const activeIndex = step === 'select' ? 0 : step === 'review' ? 1 : 2
  return (
    <ol className="flex gap-2 text-[0.68rem] tracking-[0.12em] uppercase">
      {steps.map((label, index) => (
        <li
          key={label}
          className={index <= activeIndex ? 'text-[#D4B373]' : 'text-[#716657]'}
        >
          {index + 1}. {label}
        </li>
      ))}
    </ol>
  )
}

function CategorySelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: LibraryTopic) => void
}) {
  return (
    <label className="grid gap-2 text-xs text-[#AFA28F]">
      Library Topic
      <Select
        value={value || null}
        onValueChange={(topic) =>
          topic && isLibraryTopic(topic) && onChange(topic)
        }
      >
        <SelectTrigger className="w-full rounded-none border-white/14 bg-black/20 text-[#F8F4EC]">
          <SelectValue placeholder="Choose a topic" />
        </SelectTrigger>
        <SelectContent>
          {LIBRARY_TOPICS.map((topic) => (
            <SelectItem key={topic} value={topic}>
              {topic}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function FilePickerButtons({
  folderRef,
  filesRef,
}: {
  folderRef: RefObject<HTMLInputElement | null>
  filesRef: RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        type="button"
        theme="dark"
        onClick={() => folderRef.current?.click()}
      >
        <FolderOpenIcon className="size-4" /> Choose Folder
      </Button>
      <Button
        type="button"
        variant="outline"
        theme="dark"
        onClick={() => filesRef.current?.click()}
      >
        <FilesIcon className="size-4" /> Choose PDF Files
      </Button>
    </div>
  )
}

function SelectStep({
  importer,
  folderRef,
  filesRef,
}: {
  importer: ReturnType<typeof useImportEbooks>
  folderRef: RefObject<HTMLInputElement | null>
  filesRef: RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="grid gap-5">
      <CategorySelect
        value={importer.category}
        onChange={importer.setCategory}
      />
      <FilePickerButtons folderRef={folderRef} filesRef={filesRef} />
      {importer.selectionError && (
        <p className="text-sm text-red-300">{importer.selectionError}</p>
      )}
      {importer.rows.length > 0 && (
        <p className="text-sm text-[#AFA28F]">
          Found {importer.rows.length} PDF files. Validation runs locally.
        </p>
      )}
      {importer.skipped.length > 0 && <SkippedFiles files={importer.skipped} />}
    </div>
  )
}

function SkippedFiles({ files }: { files: ReadonlyArray<SkippedFile> }) {
  return (
    <details className="border border-white/10 p-3 text-xs text-[#AFA28F]">
      <summary>{files.length} non-PDF files skipped</summary>
      <ul className="mt-2 grid gap-1">
        {files.map((file) => (
          <li key={file.path}>
            {file.path} — {file.reason}
          </li>
        ))}
      </ul>
    </details>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function RowState({ row }: { row: ImportRow }) {
  const message = row.validationMessage || row.duplicateMessage
  if (message) return <span className="text-amber-300">{message}</span>
  return <span className="text-[#AFA28F] capitalize">{row.validation}</span>
}

function ReviewRow({
  row,
  importer,
}: {
  row: ImportRow
  importer: ReturnType<typeof useImportEbooks>
}) {
  const canInclude = row.validation === 'valid' && row.title.trim().length > 0
  return (
    <TableRow className={DATA_TABLE_BODY_ROW_CLASS}>
      <TableCell className={DATA_TABLE_BODY_CELL_CLASS}>
        <input
          aria-label={`Include ${row.relativePath}`}
          type="checkbox"
          checked={row.included}
          disabled={!canInclude}
          onChange={(event) =>
            importer.setIncluded(row.id, event.target.checked)
          }
        />
      </TableCell>
      <TableCell
        className={cn(DATA_TABLE_BODY_CELL_CLASS, 'max-w-64 truncate')}
        title={row.relativePath}
      >
        {row.relativePath}
      </TableCell>
      <TableCell className={DATA_TABLE_BODY_CELL_CLASS}>
        {formatBytes(row.file.size)}
      </TableCell>
      <TableCell className={DATA_TABLE_BODY_CELL_CLASS}>
        <Input
          theme="dark"
          value={row.title}
          aria-invalid={!row.title.trim()}
          onChange={(event) => importer.updateTitle(row.id, event.target.value)}
        />
      </TableCell>
      <TableCell
        className={cn(DATA_TABLE_BODY_CELL_CLASS, 'whitespace-normal')}
      >
        <RowState row={row} />
      </TableCell>
    </TableRow>
  )
}

function ReviewStep({
  importer,
}: {
  importer: ReturnType<typeof useImportEbooks>
}) {
  return (
    <div className="grid gap-4">
      <label className="flex items-center gap-3 text-sm text-[#F8F4EC]">
        <Switch
          checked={importer.isPublished}
          onCheckedChange={importer.setPublished}
        />
        Publish every imported eBook
      </label>
      <div className={DATA_TABLE_FRAME_CLASS}>
        <Table containerClassName="max-h-[52vh] overflow-y-auto">
          <TableHeader>
            <TableRow className={DATA_TABLE_HEADER_ROW_CLASS}>
              {['Include', 'Path', 'Size', 'Title', 'Validation'].map(
                (label) => (
                  <TableHead
                    key={label}
                    className={cn(
                      DATA_TABLE_HEADER_CELL_CLASS,
                      DATA_TABLE_STICKY_HEADER_CELL_CLASS,
                      label === 'Title' && 'min-w-56',
                    )}
                  >
                    {label}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {importer.rows.map((row) => (
              <ReviewRow key={row.id} row={row} importer={importer} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function UploadStep({
  importer,
}: {
  importer: ReturnType<typeof useImportEbooks>
}) {
  const visible = importer.rows.filter(
    (row) => row.included || row.status !== 'queued',
  )
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="border border-white/10 p-3">
          <b className="block text-xl text-[#D4B373]">
            {importer.counts.imported}
          </b>
          Imported
        </div>
        <div className="border border-white/10 p-3">
          <b className="block text-xl text-red-300">{importer.counts.failed}</b>
          Failed
        </div>
        <div className="border border-white/10 p-3">
          <b className="block text-xl text-[#AFA28F]">
            {importer.counts.skipped}
          </b>
          Skipped
        </div>
      </div>
      <div className="max-h-[48vh] overflow-y-auto border border-white/10">
        {visible.map((row) => (
          <div
            key={row.id}
            className="flex justify-between gap-4 border-b border-white/8 p-3 text-sm"
          >
            <span className="truncate text-[#F8F4EC]">{row.title}</span>
            <span
              className={
                row.status === 'failed' ? 'text-red-300' : 'text-[#AFA28F]'
              }
            >
              {row.error || row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

type DialogActionsProps = {
  importer: ReturnType<typeof useImportEbooks>
  onClose: () => void
}

function SelectActions({ importer, onClose }: DialogActionsProps) {
  const validating = importer.rows.some(
    (row) => row.validation === 'pending' || row.validation === 'validating',
  )
  const included = importer.rows.filter((row) => row.included).length
  return (
    <>
      <Button variant="outline" theme="dark" onClick={onClose}>
        Cancel
      </Button>
      <Button
        theme="dark"
        disabled={!importer.category || validating || included === 0}
        onClick={() => importer.setStep('review')}
      >
        Review {included} eBooks
      </Button>
    </>
  )
}

function ReviewActions({ importer }: DialogActionsProps) {
  const included = importer.rows.filter((row) => row.included).length
  return (
    <>
      <Button
        variant="outline"
        theme="dark"
        onClick={() => importer.setStep('select')}
      >
        Back
      </Button>
      <Button
        theme="dark"
        disabled={included === 0}
        onClick={() => void importer.start()}
      >
        <UploadIcon className="size-4" />
        Import {included}
      </Button>
    </>
  )
}

function RetryButton({ importer }: Pick<DialogActionsProps, 'importer'>) {
  if (importer.counts.failed === 0 || importer.active) return null
  return (
    <Button theme="dark" onClick={() => void importer.retry()}>
      Retry failed
    </Button>
  )
}

function UploadActions({ importer, onClose }: DialogActionsProps) {
  return (
    <>
      <Button variant="outline" theme="dark" onClick={onClose}>
        {importer.active ? 'Close import' : 'Close'}
      </Button>
      <RetryButton importer={importer} />
    </>
  )
}

const ACTIONS = {
  select: SelectActions,
  review: ReviewActions,
  upload: UploadActions,
}

function DialogActions(props: DialogActionsProps) {
  const Actions = ACTIONS[props.importer.step]
  return <Actions {...props} />
}

function useImportDialogController(params: {
  media: ReadonlyArray<MediaLibraryRow>
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const folderRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef<HTMLInputElement>(null)
  const importer = useImportEbooks({
    media: params.media,
    io: importIo,
    onComplete: () => router.invalidate(),
  })
  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length > 0) void importer.selectFiles(files)
  }
  const close = () => {
    if (
      importer.active &&
      !window.confirm(
        'Stop queued imports? Files already in progress will finish.',
      )
    )
      return
    if (importer.active) importer.stop()
    else importer.reset()
    params.onOpenChange(false)
  }
  return { importer, folderRef, filesRef, handleFiles, close }
}

export function ImportEbooksDialog({
  open,
  onOpenChange,
  media,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  media: ReadonlyArray<MediaLibraryRow>
}) {
  const c = useImportDialogController({ media, onOpenChange })
  return (
    <Dialog open={open} onOpenChange={(next) => !next && c.close()}>
      <DialogContent
        showCloseButton={false}
        className="border border-white/10 bg-[#17130F] text-[#F8F4EC] sm:max-w-6xl"
      >
        <DialogHeader>
          <StepIndicator step={c.importer.step} />
          <DialogTitle className="font-serif text-2xl">
            Import eBooks
          </DialogTitle>
          <DialogDescription className="text-[#AFA28F]">
            Add up to 100 private PDFs to one Library Topic.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {c.importer.step === 'select' ? (
            <SelectStep
              importer={c.importer}
              folderRef={c.folderRef}
              filesRef={c.filesRef}
            />
          ) : c.importer.step === 'review' ? (
            <ReviewStep importer={c.importer} />
          ) : (
            <UploadStep importer={c.importer} />
          )}
        </DialogBody>
        <DialogFooter className="border-white/8 bg-white/3">
          <DialogActions importer={c.importer} onClose={c.close} />
        </DialogFooter>
        <FolderInput inputRef={c.folderRef} onChange={c.handleFiles} />
        <input
          ref={c.filesRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={c.handleFiles}
        />
      </DialogContent>
    </Dialog>
  )
}
