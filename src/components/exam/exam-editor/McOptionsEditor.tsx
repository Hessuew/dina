import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type OptionDraft = {
  id?: string
  label: string
  isCorrect: boolean
}

type McOptionsEditorProps = {
  options: Array<OptionDraft>
  optionGroupName: string
  onChange: (options: Array<OptionDraft>) => void
  readOnly: boolean
}

export function McOptionsEditor({
  options,
  optionGroupName,
  onChange,
  readOnly,
}: McOptionsEditorProps) {
  const setLabel = (index: number, label: string) =>
    onChange(options.map((o, i) => (i === index ? { ...o, label } : o)))
  const setCorrect = (index: number) =>
    onChange(options.map((o, i) => ({ ...o, isCorrect: i === index })))
  const remove = (index: number) =>
    onChange(options.filter((_, i) => i !== index))

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-[#8E816D]">
            <input
              type="radio"
              name={optionGroupName}
              checked={option.isCorrect}
              onChange={() => setCorrect(index)}
              disabled={readOnly}
            />
            Correct
          </label>
          <Input
            value={option.label}
            onChange={(event) => setLabel(index, event.target.value)}
            placeholder={`Option ${index + 1}`}
            disabled={readOnly}
            className="w-full sm:max-w-md sm:flex-1"
          />
          {!readOnly && options.length > 2 && (
            <Button
              size="xs"
              variant="ghost"
              className="self-start sm:self-auto"
              onClick={() => remove(index)}
            >
              Remove
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button
          size="xs"
          variant="outline"
          onClick={() =>
            onChange([...options, { label: '', isCorrect: false }])
          }
        >
          Add option
        </Button>
      )}
    </div>
  )
}
