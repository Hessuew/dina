import { createFormHook } from '@tanstack/react-form'
import { fieldContext, formContext } from './form-context'
import {
  NumberField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextAreaFieldWithWordCount,
  TextField,
} from '@/components/ui/app-form-fields'

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField,
    SelectField,
    TextAreaField,
    TextAreaFieldWithWordCount,
    NumberField,
    SwitchField,
  },
  formComponents: {},
  fieldContext,
  formContext,
})
