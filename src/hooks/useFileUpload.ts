import { useCallback, useRef, useState } from 'react'

interface UseFileUploadReturn {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  isUploading: boolean
  fileData: string | null
  fileObject: File | null
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  clearFile: () => void
  setUploading: (isUploading: boolean) => void
}

export function useFileUpload(): UseFileUploadReturn {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [fileData, setFileData] = useState<string | null>(null)
  const [fileObject, setFileObject] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (fileData) URL.revokeObjectURL(fileData)
    setFileData(URL.createObjectURL(file))
    setFileObject(file)
  }

  const clearFile = useCallback(() => {
    if (fileData) URL.revokeObjectURL(fileData)
    setFileData(null)
    setFileObject(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [fileData])

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
