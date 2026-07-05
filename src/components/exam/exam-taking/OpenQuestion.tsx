import { Textarea } from '@/components/ui/textarea'

type OpenQuestionProps = {
  value: string
  onChange: (value: string) => void
}

export function OpenQuestion({ value, onChange }: OpenQuestionProps) {
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Write your answer…"
      rows={6}
    />
  )
}
