import type {
  FormDialogMaxWidth,
  FormDialogMode,
} from '@/components/ui/form-dialog/form-dialog.domain'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { buildFormDialogViewModel } from '@/components/ui/form-dialog/form-dialog.domain'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: FormDialogMode
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: FormDialogMaxWidth
  showCloseButton?: boolean
  className?: string
  onSubmit?: () => void
  isSubmitting?: boolean
  submitLabel?: string
  loadingLabel?: string
}

export function FormDialog({
  open,
  onOpenChange,
  mode,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '2xl',
  showCloseButton = false,
  className,
  onSubmit,
  isSubmitting = false,
  submitLabel,
  loadingLabel,
}: FormDialogProps) {
  const viewModel = buildFormDialogViewModel({
    mode,
    maxWidth,
    hasSubmitHandler: Boolean(onSubmit),
    isSubmitting,
    submitLabel,
    loadingLabel,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]',
          viewModel.maxWidthClass,
          className,
        )}
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={showCloseButton}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <div className="mb-1">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                {viewModel.modeLabel}
              </div>
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
              {title}
            </DialogTitle>
            {subtitle && (
              <DialogDescription className="text-[#AFA28F]">
                {subtitle}
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogBody>{children}</DialogBody>

          <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
            {footer || (
              <>
                <Button
                  variant="outline"
                  theme="dark"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                {viewModel.showSubmitButton && (
                  <Button
                    theme="dark"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                  >
                    {viewModel.submitButtonLabel}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
