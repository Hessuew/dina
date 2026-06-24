import { useCallback, useRef, useState } from 'react'
import { fileToBase64 } from '@/utils/imageUpload'

interface UseFileUploadReturn {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  isUploading: boolean
  fileData: string | null
  fileObject: File | null
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  clearFile: () => void
  setUploading: (isUploading: boolean) => void
}

export function useFileUpload(): UseFileUploadReturn {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [fileData, setFileData] = useState<string | null>(null)
  const [fileObject, setFileObject] = useState<File | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // No client-side validation - server is single source of truth
    const base64 = await fileToBase64(file)
    setFileData(base64)
    setFileObject(file)
  }

  const clearFile = useCallback(() => {
    setFileData(null)
    setFileObject(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return {
    fileInputRef,
    isUploading,
    fileData,
    fileObject,
    handleFileChange,
    clearFile,
    setUploading: setIsUploading,
  }
}
