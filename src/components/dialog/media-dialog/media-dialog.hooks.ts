import { useCallback, useRef, useState } from 'react'

export type VideoFilePick = {
  file: File | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  isUploading: boolean
  setUploading: (value: boolean) => void
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  clearFile: () => void
}

export function useVideoFilePick(): VideoFilePick {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setUploading] = useState(false)
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.files?.[0]
      if (next) setFile(next)
    },
    [],
  )
  const clearFile = useCallback(() => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  return {
    file,
    fileInputRef,
    isUploading,
    setUploading,
    handleFileChange,
    clearFile,
  }
}
