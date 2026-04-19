import { Toaster as Sonner } from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import type { ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#4ADE80]" />,
        info: <InfoIcon className="size-4 text-[#60A5FA]" />,
        warning: <TriangleAlertIcon className="size-4 text-[#FBBF24]" />,
        error: <OctagonXIcon className="size-4 text-[#F87171]" />,
        loading: <Loader2Icon className="size-4 animate-spin text-[#D4B373]" />,
      }}
      style={
        {
          '--normal-bg': '#1A1716',
          '--normal-text': '#F8F4EC',
          '--normal-border': 'rgba(255,255,255,0.1)',
          '--success-bg': 'rgba(74,222,128,0.1)',
          '--success-text': '#4ADE80',
          '--success-border': 'rgba(74,222,128,0.3)',
          '--error-bg': 'rgba(248,113,113,0.1)',
          '--error-text': '#F87171',
          '--error-border': 'rgba(248,113,113,0.3)',
          '--info-bg': 'rgba(96,165,250,0.1)',
          '--info-text': '#60A5FA',
          '--info-border': 'rgba(96,165,250,0.3)',
          '--warning-bg': 'rgba(251,191,36,0.1)',
          '--warning-text': '#FBBF24',
          '--warning-border': 'rgba(251,191,36,0.3)',
          '--border-radius': '0px',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
