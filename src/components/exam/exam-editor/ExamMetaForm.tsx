import type { ExamMetaDraft } from '@/components/exam/exam-editor/exam-editor.domain'
import { Input } from '@/components/ui/input'

export function ExamMetaForm({
  draft,
  onChange,
}: {
  draft: ExamMetaDraft
  onChange: (draft: ExamMetaDraft) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 border border-[#1A1A1A]/10 bg-white/70 p-5">
      <MetaField label="Title">
        <Input
          value={draft.title}
          onChange={(event) =>
            onChange({ ...draft, title: event.target.value })
          }
          required
          className="w-56"
        />
      </MetaField>
      <MetaField label="Duration (min)">
        <Input
          type="number"
          min={1}
          value={draft.durationMinutes}
          onChange={(event) =>
            onChange({ ...draft, durationMinutes: Number(event.target.value) })
          }
          className="w-28"
        />
      </MetaField>
      <MetaWindowFields
        opensAt={draft.opensAt}
        closesAt={draft.closesAt}
        onOpensAtChange={(opensAt) => onChange({ ...draft, opensAt })}
        onClosesAtChange={(closesAt) => onChange({ ...draft, closesAt })}
      />
    </div>
  )
}

function MetaWindowFields({
  opensAt,
  closesAt,
  onOpensAtChange,
  onClosesAtChange,
}: {
  opensAt: string
  closesAt: string
  onOpensAtChange: (value: string) => void
  onClosesAtChange: (value: string) => void
}) {
  return (
    <>
      <MetaField label="Opens">
        <Input
          type="datetime-local"
          value={opensAt}
          onChange={(event) => onOpensAtChange(event.target.value)}
          required
        />
      </MetaField>
      <MetaField label="Closes">
        <Input
          type="datetime-local"
          value={closesAt}
          onChange={(event) => onClosesAtChange(event.target.value)}
          required
        />
      </MetaField>
    </>
  )
}

function MetaField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-1">
      <span className="block text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}
