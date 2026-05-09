import { toast } from 'sonner'
import { toUserError } from '@/utils/errors'

export function toastErrorHandler<TError>(error: TError): void {
  toast.error(toUserError(error).message)
}
