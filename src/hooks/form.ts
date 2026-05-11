import { createFormHook } from '@tanstack/react-form'
import { fieldContext, formContext } from './form-context'
import {
  NumberField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from '@/components/ui/app-form-fields'

export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    SelectField,
    TextAreaField,
    NumberField,
    SwitchField,
  },
  formComponents: {},
  fieldContext,
  formContext,
})
