import type { ReactNode } from 'react'
import type { FormFieldType } from '@/components/ui/form-field'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  FormFieldInput,
  FormFieldNumberInput,
  FormFieldSelect,
  FormFieldTextarea,
} from '@/components/ui/form-field'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useFieldContext } from '@/hooks/form-context'

interface BaseAppFieldProps {
  label: string
  required?: boolean
  description?: string
  className?: string
}

interface TextFieldProps extends BaseAppFieldProps {
  id: string
  type?: FormFieldType
  placeholder?: string
}

interface NumberFieldProps extends BaseAppFieldProps {
  id: string
  placeholder?: string
  min?: number
  max?: number
  step?: string
}

interface TextAreaFieldProps extends BaseAppFieldProps {
  id: string
  placeholder?: string
  rows?: number
}

interface SelectFieldProps extends BaseAppFieldProps {
  id: string
  placeholder?: string
  children: ReactNode
}

interface TextAreaFieldWithWordCountProps extends BaseAppFieldProps {
  id: string
  placeholder?: string
  rows?: number
  maxWords: number
}

function countWords(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

interface SwitchFieldProps {
  id: string
  label: string
  className?: string
}

function getFirstError(errors: Array<unknown>): string | undefined {
  const firstError = errors[0]

  if (!firstError) return undefined
  if (typeof firstError === 'string') return firstError
  if (firstError instanceof Error) return firstError.message
  if (
    typeof firstError === 'object' &&
    'message' in firstError &&
    typeof firstError.message === 'string'
  ) {
    return firstError.message
  }

  return String(firstError)
}

export function TextField(props: TextFieldProps) {
  const field = useFieldContext<string>()

  return (
    <FormFieldInput
      {...props}
      value={field.state.value}
      onChange={(value) => field.handleChange(value)}
      error={getFirstError(field.state.meta.errors)}
    />
  )
}

export function NumberField(props: NumberFieldProps) {
  const field = useFieldContext<number>()

  return (
    <FormFieldNumberInput
      {...props}
      value={field.state.value}
      onChange={(value) => field.handleChange(value)}
      error={getFirstError(field.state.meta.errors)}
    />
  )
}

export function TextAreaField(props: TextAreaFieldProps) {
  const field = useFieldContext<string>()

  return (
    <FormFieldTextarea
      {...props}
      value={field.state.value}
      onChange={(value) => field.handleChange(value)}
      error={getFirstError(field.state.meta.errors)}
    />
  )
}

export function SelectField(props: SelectFieldProps) {
  const field = useFieldContext<string>()

  return (
    <FormFieldSelect
      {...props}
      value={field.state.value}
      onChange={(value) => field.handleChange(value)}
      error={getFirstError(field.state.meta.errors)}
    />
  )
}

export function SwitchField({ id, label, className }: SwitchFieldProps) {
  const field = useFieldContext<boolean>()

  return (
    <Field className={className}>
      <div className="flex items-center gap-3">
        <Switch
          id={id}
          checked={field.state.value}
          onCheckedChange={(value) => field.handleChange(value)}
        />
        <FieldLabel htmlFor={id} className="text-sm text-[#AFA28F]">
          {label}
        </FieldLabel>
      </div>
    </Field>
  )
}

export function TextAreaFieldWithWordCount(
  props: TextAreaFieldWithWordCountProps,
) {
  const field = useFieldContext<string>()
  const wordCount = countWords(field.state.value)
  const error = getFirstError(field.state.meta.errors)

  return (
    <Field className={props.className}>
      <FieldLabel
        htmlFor={props.id}
        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
      >
        {props.label}{' '}
        {props.required && <span className="text-[#C5A059]">*</span>}
      </FieldLabel>
      <Textarea
        id={props.id}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={() => field.handleBlur()}
        placeholder={props.placeholder}
        rows={props.rows}
        className="w-full resize-none rounded-none border border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
      />
      <div className="flex items-start justify-between gap-4">
        {error ? (
          <p className="text-destructive text-[0.68rem]">{error}</p>
        ) : (
          <p className="text-xs text-[#8E816D]">
            Maximum {props.maxWords} words.
          </p>
        )}
        <span className="shrink-0 text-[0.62rem] text-[#5A5248]">
          {wordCount} words
        </span>
      </div>
    </Field>
  )
}
