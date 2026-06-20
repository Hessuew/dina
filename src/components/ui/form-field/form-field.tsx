import * as React from 'react'
import { cn } from '@/lib/utils'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatNumberFieldValue,
  parseNumberFieldValue,
  resolveFieldFootnote,
} from '@/components/ui/form-field/form-field.domain'

interface BaseFormFieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  description?: string
  className?: string
}

export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'tel'
  | 'number'
  | 'datetime-local'

interface FormFieldTextInputProps extends BaseFormFieldProps {
  type?: FormFieldType
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function FormFieldInput({
  id,
  label,
  required = false,
  error,
  description,
  className,
  type = 'text',
  value,
  onChange,
  placeholder,
}: FormFieldTextInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const inputClassName = cn(
    'rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50',
    error && 'border-red-500/60',
  )

  return (
    <Field className={className}>
      <FieldLabel
        htmlFor={id}
        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
      >
        {label} {required && <span className="text-[#C5A059]">*</span>}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={inputClassName}
      />
      {error && <p className="text-destructive text-[0.68rem]">{error}</p>}
      {description && !error && (
        <p className="text-xs text-[#8E816D]">{description}</p>
      )}
    </Field>
  )
}

interface FormFieldNumberInputProps extends BaseFormFieldProps {
  type?: 'number'
  value: number
  onChange: (value: number) => void
  placeholder?: string
  min?: number
  max?: number
  step?: string
}

export function FormFieldNumberInput({
  id,
  label,
  required = false,
  error,
  description,
  className,
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
}: FormFieldNumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseNumberFieldValue(e.target.value))
  }

  const inputClassName = cn(
    'rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50',
    error && 'border-red-500/60',
  )

  const footnote = resolveFieldFootnote(error, description)

  return (
    <Field className={className}>
      <FieldLabel
        htmlFor={id}
        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
      >
        {label} {required && <span className="text-[#C5A059]">*</span>}
      </FieldLabel>
      <Input
        id={id}
        type="number"
        value={formatNumberFieldValue(value)}
        onChange={handleChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={inputClassName}
      />
      {footnote && <p className={footnote.className}>{footnote.text}</p>}
    </Field>
  )
}

interface FormFieldTextareaProps extends BaseFormFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function FormFieldTextarea({
  id,
  label,
  required = false,
  error,
  description,
  className,
  value,
  onChange,
  placeholder,
  rows = 5,
}: FormFieldTextareaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const textareaClassName = cn(
    'rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50',
    error && 'border-red-500/60',
  )

  return (
    <Field className={className}>
      <FieldLabel
        htmlFor={id}
        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
      >
        {label} {required && <span className="text-[#C5A059]">*</span>}
      </FieldLabel>
      <Textarea
        id={id}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className={textareaClassName}
      />
      {error && <p className="text-destructive text-[0.68rem]">{error}</p>}
      {description && !error && (
        <p className="text-xs text-[#8E816D]">{description}</p>
      )}
    </Field>
  )
}

interface FormFieldSelectProps extends BaseFormFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  children: React.ReactNode
  renderValue?: (value: string) => React.ReactNode
}

export function FormFieldSelect({
  id,
  label,
  required = false,
  error,
  description,
  className,
  value,
  onChange,
  placeholder,
  children,
  renderValue,
}: FormFieldSelectProps) {
  const selectTriggerClassName = cn(
    'w-full rounded-none border-white/12 bg-white/6 text-[#F8F4EC]',
    error && 'border-red-500/60',
  )

  return (
    <Field className={className}>
      <FieldLabel
        htmlFor={id}
        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
      >
        {label} {required && <span className="text-[#C5A059]">*</span>}
      </FieldLabel>
      <Select
        value={value}
        onValueChange={(selectedValue) => onChange(selectedValue as string)}
      >
        <SelectTrigger className={selectTriggerClassName} id={id}>
          <SelectValue placeholder={placeholder}>
            {renderValue && value ? renderValue(value) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-none border-white/12 bg-white">
          {children}
        </SelectContent>
      </Select>
      {error && <p className="text-destructive text-[0.68rem]">{error}</p>}
      {description && !error && (
        <p className="text-xs text-[#8E816D]">{description}</p>
      )}
    </Field>
  )
}
