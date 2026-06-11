import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/upload-image')({
  component: UploadImageAPI,
})

function UploadImageAPI() {
  // This is a server-side API route
  // The actual handling is done by the uploadImageFn server function
  // Client components can call uploadImageFn directly
  return null
}
