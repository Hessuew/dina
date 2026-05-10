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
