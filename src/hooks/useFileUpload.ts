import { useCallback, useEffect, useRef, useState } from 'react'

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
  const objectUrlRef = useRef<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [fileData, setFileData] = useState<string | null>(null)
  const [fileObject, setFileObject] = useState<File | null>(null)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const objectUrl = URL.createObjectURL(file)
      objectUrlRef.current = objectUrl
      setFileData(objectUrl)
      setFileObject(file)
    },
    [],
  )

  const clearFile = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setFileData(null)
    setFileObject(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    [],
  )

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
