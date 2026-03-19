import { Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { CourseCard } from './CourseCard'
import { Button } from '@/components/ui/button'

type Course = {
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  isPublished: boolean
  lessons: Array<{ id: string }>
  teacher?: {
    fullName: string
  }
  completedLessons?: number
  totalLessons?: number
}

type CourseListProps = {
  courses: Array<Course>
  role: 'student' | 'teacher' | 'admin'
}

export function CourseList({ courses, role }: CourseListProps) {
  const isTeacher = role === 'teacher' || role === 'admin'

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="mb-2 text-lg font-semibold">
          {isTeacher ? 'No courses yet' : 'No enrolled courses'}
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {isTeacher
            ? 'Create your first course to get started'
            : 'You are not enrolled in any courses yet'}
        </p>
        {isTeacher && (
          <Link to="/courses/$courseId" params={{ courseId: 'new' }}>
            <Button>
              <PlusIcon className="size-4" />
              Create Course
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div className="flex justify-end">
          <Link to="/courses/$courseId" params={{ courseId: 'new' }}>
            <Button>
              <PlusIcon className="size-4" />
              Create Course
            </Button>
          </Link>
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course as any} role={role} />
        ))}
      </div>
    </div>
  )
}

// import { createFileRoute, useRouter } from '@tanstack/react-router'
// import { createServerFn } from '@tanstack/react-start'
// import {
//   CalendarIcon,
//   ClockIcon,
//   EditIcon,
//   PlusIcon,
//   TrashIcon,
//   UploadIcon,
//   VideoIcon,
//   XIcon,
// } from 'lucide-react'
// import { and, eq } from 'drizzle-orm'
// import { useRef, useState } from 'react'
// import { toast } from 'sonner'
// import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from '@/components/ui/card'
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog'
// import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
// import { Input } from '@/components/ui/input'
// import { Progress } from '@/components/ui/progress'
// import { Switch } from '@/components/ui/switch'
// import { Textarea } from '@/components/ui/textarea'
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from '@/components/ui/accordion'
// import { Alert, AlertDescription } from '@/components/ui/alert'
// import { db } from '@/db'
// import { courses, enrollments, lessonProgress, profiles } from '@/db/schema'
// import { getCurrentUser } from '@/utils/auth'
// import { useMutation } from '@/hooks/useMutation'
// import {
//   createCourse,
//   createLesson,
//   deleteCourse,
//   deleteLesson,
//   updateCourse,
// } from '@/utils/courses'
// import { fileToBase64, uploadImageFn } from '@/utils/imageUpload'

// const getCourseData = createServerFn({ method: 'GET' })
//   .inputValidator((d: { courseId: string }) => d)
//   .handler(async ({ data }) => {
//     const user = await getCurrentUser()

//     if (data.courseId === 'new') {
//       const profile = await db.query.profiles.findFirst({
//         where: eq(profiles.id, user.id),
//       })

//       if (!profile) {
//         throw new Error('Profile not found')
//       }

//       return {
//         isNew: true,
//         role: profile.role,
//         course: null,
//         isEnrolled: false,
//         completedLessonIds: [],
//       }
//     }

//     const course = await db.query.courses.findFirst({
//       where: eq(courses.id, data.courseId),
//       with: {
//         teacher: true,
//         lessons: {
//           orderBy: (lessons, { asc }) => [asc(lessons.orderIndex)],
//         },
//       },
//     })

//     if (!course) {
//       throw new Error('Course not found')
//     }

//     const profile = await db.query.profiles.findFirst({
//       where: eq(profiles.id, user.id),
//     })

//     if (!profile) {
//       throw new Error('Profile not found')
//     }

//     let enrollment = null
//     let progress: Array<any> = []

//     if (profile.role === 'student') {
//       enrollment = await db.query.enrollments.findFirst({
//         where: and(
//           eq(enrollments.studentId, user.id),
//           eq(enrollments.courseId, data.courseId),
//         ),
//       })

//       progress = await db.query.lessonProgress.findMany({
//         where: and(
//           eq(lessonProgress.studentId, user.id),
//           eq(lessonProgress.completed, true),
//         ),
//       })
//     }

//     const completedLessonIds = new Set(progress.map((p) => p.lessonId))

//     return {
//       isNew: false,
//       course,
//       role: profile.role,
//       isEnrolled: !!enrollment,
//       completedLessonIds: Array.from(completedLessonIds),
//     }
//   })

// export const Route = createFileRoute('/_authed/courses/$courseId')({
//   loader: async ({ params }) => {
//     const data = await getCourseData({ data: { courseId: params.courseId } })
//     return data
//   },
//   component: UnifiedCourseComponent,
// })

// // Sub-components for better readability
// function PageHeader({
//   isNew,
//   isEditMode,
//   course,
//   canEdit,
//   onEditModeToggle,
//   onDeleteClick,
//   createMutationStatus,
//   updateMutationStatus,
//   isUploading,
//   onCancel,
// }: any) {
//   if (isNew) {
//     return (
//       <div className="mb-6 flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-bold">Create New Course</h1>
//           <p className="text-muted-foreground mt-1">
//             Set up a new course with up to 3 lessons
//           </p>
//         </div>
//         <div className="flex gap-2">
//           <Button
//             type="submit"
//             form="courseForm"
//             disabled={createMutationStatus === 'pending' || isUploading}
//           >
//             {isUploading
//               ? 'Uploading images...'
//               : createMutationStatus === 'pending'
//                 ? 'Creating...'
//                 : 'Create Course'}
//           </Button>
//           <Button type="button" variant="outline" onClick={onCancel}>
//             Cancel
//           </Button>
//         </div>
//       </div>
//     )
//   }

//   if (isEditMode) {
//     return (
//       <div className="mb-6 flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-bold">Edit Course</h1>
//           <p className="text-muted-foreground mt-1">
//             Manage course details and lessons
//           </p>
//         </div>
//         <div className="flex gap-2">
//           <Button
//             type="submit"
//             form="courseForm"
//             disabled={updateMutationStatus === 'pending'}
//           >
//             {updateMutationStatus === 'pending' ? 'Saving...' : 'Save Changes'}
//           </Button>
//           <Button type="button" variant="destructive" onClick={onDeleteClick}>
//             <TrashIcon className="mr-2 size-4" />
//             Delete
//           </Button>
//           <Button
//             type="button"
//             variant="outline"
//             onClick={() => onEditModeToggle(false)}
//           >
//             Cancel
//           </Button>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="mb-6 flex items-center justify-between">
//       <div>
//         <h1 className="text-3xl font-bold">{course.title}</h1>
//         <p className="text-muted-foreground mt-1">
//           By {course.teacher.fullName}
//         </p>
//       </div>
//       <div className="flex gap-2">
//         {canEdit && (
//           <Button type="button" onClick={() => onEditModeToggle(true)}>
//             <EditIcon className="mr-2 size-4" />
//             Edit Mode
//           </Button>
//         )}
//         <Button type="button" variant="outline" onClick={onCancel}>
//           Back to Dashboard
//         </Button>
//       </div>
//     </div>
//   )
// }

// function CourseThumbnailField({ formData, setFormData, fileInputRef }: any) {
//   return (
//     <Field>
//       <FieldLabel>Course Thumbnail</FieldLabel>
//       <div className="space-y-2">
//         <input
//           ref={fileInputRef}
//           type="file"
//           accept="image/jpeg,image/png,image/webp,image/gif"
//           onChange={async (e) => {
//             const file = e.target.files?.[0]
//             if (!file) return

//             if (file.size > 2 * 1024 * 1024) {
//               toast.error('File size must be less than 2MB')
//               return
//             }

//             const fileData = await fileToBase64(file)
//             setFormData((prev: any) => ({
//               ...prev,
//               thumbnailUrl: fileData,
//               thumbnailFile: file,
//             }))
//           }}
//           className="hidden"
//         />
//         {formData.thumbnailUrl ? (
//           <div className="relative aspect-video w-full overflow-hidden rounded-lg">
//             <img
//               src={formData.thumbnailUrl}
//               alt="Course thumbnail"
//               className="size-full object-cover"
//             />
//             <Button
//               type="button"
//               variant="outline"
//               size="sm"
//               className="absolute right-2 top-2"
//               onClick={() => {
//                 setFormData((prev: any) => ({
//                   ...prev,
//                   thumbnailUrl: null,
//                   thumbnailFile: null,
//                 }))
//                 if (fileInputRef.current) fileInputRef.current.value = ''
//               }}
//             >
//               <XIcon className="size-4" />
//             </Button>
//           </div>
//         ) : (
//           <Button
//             type="button"
//             variant="outline"
//             onClick={() => fileInputRef.current?.click()}
//             className="w-full"
//           >
//             <UploadIcon className="mr-2 size-4" />
//             Upload Thumbnail
//           </Button>
//         )}
//         <p className="text-muted-foreground text-xs">
//           JPG, PNG, WebP or GIF. Max 2MB.
//         </p>
//       </div>
//     </Field>
//   )
// }

// function CourseFormFields({ isNew, formData, setFormData, fileInputRef }: any) {
//   return (
//     <FieldGroup>
//       <CourseThumbnailField
//         formData={formData}
//         setFormData={setFormData}
//         fileInputRef={fileInputRef}
//       />
//       <Field>
//         <FieldLabel htmlFor="title">Course Title</FieldLabel>
//         <Input
//           id="title"
//           name="title"
//           type="text"
//           required
//           placeholder="Introduction to Programming"
//           value={formData.title}
//           onChange={(e) =>
//             setFormData((prev: any) => ({
//               ...prev,
//               title: e.target.value,
//             }))
//           }
//         />
//       </Field>
//       <Field>
//         <FieldLabel htmlFor="description">Description</FieldLabel>
//         <Textarea
//           id="description"
//           name="description"
//           placeholder="Describe what students will learn in this course"
//           rows={4}
//           value={formData.description}
//           onChange={(e) =>
//             setFormData((prev: any) => ({
//               ...prev,
//               description: e.target.value,
//             }))
//           }
//         />
//       </Field>
//       {!isNew && (
//         <Field>
//           <div className="flex items-center gap-2">
//             <Switch
//               id="isPublished"
//               name="isPublished"
//               checked={formData.isPublished}
//               onCheckedChange={(checked) =>
//                 setFormData((prev: any) => ({
//                   ...prev,
//                   isPublished: checked,
//                 }))
//               }
//             />
//             <FieldLabel htmlFor="isPublished">Publish course</FieldLabel>
//           </div>
//         </Field>
//       )}
//     </FieldGroup>
//   )
// }

// function CourseViewContent({ course, totalLessons }: any) {
//   return (
//     <>
//       {course.thumbnailUrl && (
//         <div className="aspect-video w-full overflow-hidden rounded-lg">
//           <img
//             src={course.thumbnailUrl}
//             alt={course.title}
//             className="size-full object-cover"
//           />
//         </div>
//       )}
//       {course.description && (
//         <div>
//           <h3 className="mb-2 font-semibold">Description</h3>
//           <p className="text-muted-foreground text-sm">{course.description}</p>
//         </div>
//       )}
//       <div>
//         <h3 className="mb-2 font-semibold">Course Information</h3>
//         <div className="space-y-2 text-sm">
//           <div className="flex justify-between">
//             <span className="text-muted-foreground">Total Lessons</span>
//             <span className="font-medium">{totalLessons}</span>
//           </div>
//           <div className="flex justify-between">
//             <span className="text-muted-foreground">Instructor</span>
//             <span className="font-medium">{course.teacher.fullName}</span>
//           </div>
//         </div>
//       </div>
//     </>
//   )
// }

// function LessonEditForm({ lessons, setLessons, handleDeleteLesson }: any) {
//   if (lessons.length === 0) {
//     return (
//       <div className="text-muted-foreground py-8 text-center">
//         <p className="mb-4">No lessons added yet</p>
//         <Button type="button" variant="outline" onClick={() => {}}>
//           <PlusIcon className="mr-2 size-4" />
//           Add Your First Lesson
//         </Button>
//       </div>
//     )
//   }

//   return (
//     <Accordion
//       type="multiple"
//       className="space-y-4"
//       defaultValue={lessons.map((_: any, i: number) => `lesson-${i}`)}
//     >
//       {lessons.map((lesson: any, index: number) => (
//         <AccordionItem key={index} value={`lesson-${index}`}>
//           <AccordionTrigger className="px-4">
//             <div className="flex flex-1 items-center justify-between pr-4">
//               <span className="flex items-center gap-2">
//                 Lesson {index + 1}
//                 {lesson.title && (
//                   <span className="text-muted-foreground text-sm font-normal">
//                     - {lesson.title}
//                   </span>
//                 )}
//               </span>
//               <Button
//                 type="button"
//                 variant="ghost"
//                 size="sm"
//                 onClick={(e) => {
//                   e.stopPropagation()
//                   handleDeleteLesson(index)
//                 }}
//                 className="hover:bg-destructive/10 hover:text-destructive"
//               >
//                 <TrashIcon className="size-4" />
//               </Button>
//             </div>
//           </AccordionTrigger>
//           <AccordionContent className="px-4 pb-4">
//             <div className="space-y-4">
//               <Field>
//                 <FieldLabel htmlFor={`lesson-title-${index}`}>Title</FieldLabel>
//                 <Input
//                   id={`lesson-title-${index}`}
//                   placeholder="Lesson title"
//                   value={lesson.title}
//                   onChange={(e) => {
//                     const newLessons = [...lessons]
//                     newLessons[index] = {
//                       ...newLessons[index],
//                       title: e.target.value,
//                     }
//                     setLessons(newLessons)
//                   }}
//                 />
//               </Field>
//               <Field>
//                 <FieldLabel htmlFor={`lesson-content-${index}`}>
//                   Content
//                 </FieldLabel>
//                 <Textarea
//                   id={`lesson-content-${index}`}
//                   placeholder="Lesson content or description"
//                   rows={3}
//                   value={lesson.content}
//                   onChange={(e) => {
//                     const newLessons = [...lessons]
//                     newLessons[index] = {
//                       ...newLessons[index],
//                       content: e.target.value,
//                     }
//                     setLessons(newLessons)
//                   }}
//                 />
//               </Field>
//               <div className="grid gap-4 sm:grid-cols-2">
//                 <Field>
//                   <FieldLabel htmlFor={`lesson-duration-${index}`}>
//                     Duration (minutes)
//                   </FieldLabel>
//                   <Input
//                     id={`lesson-duration-${index}`}
//                     type="number"
//                     placeholder="60"
//                     value={lesson.duration}
//                     onChange={(e) => {
//                       const newLessons = [...lessons]
//                       newLessons[index] = {
//                         ...newLessons[index],
//                         duration: e.target.value,
//                       }
//                       setLessons(newLessons)
//                     }}
//                   />
//                 </Field>
//                 <Field>
//                   <FieldLabel htmlFor={`lesson-time-${index}`}>
//                     Scheduled Time
//                   </FieldLabel>
//                   <Input
//                     id={`lesson-time-${index}`}
//                     type="datetime-local"
//                     value={lesson.scheduledTime}
//                     onChange={(e) => {
//                       const newLessons = [...lessons]
//                       newLessons[index] = {
//                         ...newLessons[index],
//                         scheduledTime: e.target.value,
//                       }
//                       setLessons(newLessons)
//                     }}
//                   />
//                 </Field>
//               </div>
//             </div>
//           </AccordionContent>
//         </AccordionItem>
//       ))}
//     </Accordion>
//   )
// }

// function LessonViewList({ course, role, isEnrolled, completedLessonIds }: any) {
//   if (course.lessons.length === 0) {
//     return (
//       <div className="text-muted-foreground py-8 text-center">
//         No lessons yet
//       </div>
//     )
//   }

//   return (
//     <div className="space-y-4">
//       {course.lessons.map((lesson: any, index: number) => {
//         const isCompleted = completedLessonIds.includes(lesson.id)
//         return (
//           <div
//             key={lesson.id}
//             className="flex items-start gap-4 rounded-lg border p-4"
//           >
//             <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
//               <span className="font-semibold">{index + 1}</span>
//             </div>
//             <div className="flex-1">
//               <h3 className="font-semibold">{lesson.title}</h3>
//               {lesson.content && (
//                 <p className="text-muted-foreground mt-1 text-sm">
//                   {lesson.content}
//                 </p>
//               )}
//               <div className="mt-2 flex flex-wrap gap-3 text-sm">
//                 {lesson.duration && (
//                   <div className="text-muted-foreground flex items-center gap-1">
//                     <ClockIcon className="size-4" />
//                     <span>{lesson.duration} min</span>
//                   </div>
//                 )}
//                 {lesson.scheduledTime && (
//                   <div className="text-muted-foreground flex items-center gap-1">
//                     <CalendarIcon className="size-4" />
//                     <span>
//                       {new Date(lesson.scheduledTime).toLocaleDateString()}
//                     </span>
//                   </div>
//                 )}
//                 {lesson.videoUrl && (
//                   <div className="text-muted-foreground flex items-center gap-1">
//                     <VideoIcon className="size-4" />
//                     <span>Video available</span>
//                   </div>
//                 )}
//               </div>
//             </div>
//             {role === 'student' && isEnrolled && (
//               <div>
//                 {isCompleted ? (
//                   <Badge variant="default">Completed</Badge>
//                 ) : (
//                   <Button size="sm">Start</Button>
//                 )}
//               </div>
//             )}
//           </div>
//         )
//       })}
//     </div>
//   )
// }

// function UnifiedCourseComponent() {
//   const loaderData = Route.useLoaderData()
//   const router = useRouter()

//   const { isNew, course, role, isEnrolled, completedLessonIds } = loaderData

//   const [isEditMode, setIsEditMode] = useState(false)
//   const [showDeleteDialog, setShowDeleteDialog] = useState(false)
//   const [lessonToDelete, setLessonToDelete] = useState<string | null>(null)
//   const fileInputRef = useRef<HTMLInputElement>(null)
//   const [isUploading, setIsUploading] = useState(false)

//   const [formData, setFormData] = useState({
//     title: course?.title || '',
//     description: course?.description || '',
//     thumbnailUrl: course?.thumbnailUrl || null,
//     thumbnailFile: null as File | null,
//     isPublished: course?.isPublished || false,
//   })

//   const [lessons, setLessons] = useState<
//     Array<{
//       id?: string
//       title: string
//       content: string
//       scheduledTime: string
//       duration: string
//     }>
//   >(
//     course?.lessons.map((l: any) => ({
//       id: l.id,
//       title: l.title,
//       content: l.content || '',
//       scheduledTime: l.scheduledTime
//         ? new Date(l.scheduledTime).toISOString().slice(0, 16)
//         : '',
//       duration: l.duration?.toString() || '',
//     })) || [],
//   )

//   const canEdit = role === 'teacher' || role === 'admin'
//   const completedCount = completedLessonIds.length
//   const totalLessons = course?.lessons.length || 0
//   const progress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0

//   const createCourseMutation = useMutation({
//     fn: createCourse,
//     onSuccess: async (ctx) => {
//       if ('course' in ctx.data) {
//         setIsUploading(true)
//         const courseId = ctx.data.course.id

//         let courseThumbnailUrl: string | undefined
//         if (formData.thumbnailFile) {
//           try {
//             const result = await uploadImageFn({
//               data: {
//                 fileData: await fileToBase64(formData.thumbnailFile),
//                 fileName: formData.thumbnailFile.name,
//                 fileType: formData.thumbnailFile.type,
//                 fileSize: formData.thumbnailFile.size,
//                 bucket: 'course-thumbnails',
//               },
//             })

//             if (!result.error) {
//               courseThumbnailUrl = result.imageUrl
//             }
//           } catch (error) {
//             console.error('Course thumbnail upload error:', error)
//           }
//         }

//         const lessonPromises = lessons.map(async (lesson, i) => {
//           if (!lesson.title) return null

//           try {
//             return await createLesson({
//               data: {
//                 courseId,
//                 title: lesson.title,
//                 content: lesson.content || undefined,
//                 scheduledTime: lesson.scheduledTime
//                   ? new Date(lesson.scheduledTime)
//                   : undefined,
//                 duration: lesson.duration
//                   ? parseInt(lesson.duration)
//                   : undefined,
//                 orderIndex: i,
//               },
//             })
//           } catch (error) {
//             console.error(`Failed to create lesson ${i + 1}:`, error)
//             toast.error(`Failed to create lesson: ${lesson.title}`)
//             return null
//           }
//         })

//         const results = await Promise.allSettled(lessonPromises)
//         const successCount = results.filter(
//           (r) => r.status === 'fulfilled' && r.value,
//         ).length

//         if (courseThumbnailUrl) {
//           await updateCourse({
//             data: {
//               courseId,
//               title: formData.title,
//               description: formData.description,
//               thumbnailUrl: courseThumbnailUrl,
//               isPublished: false,
//             },
//           })
//         }

//         setIsUploading(false)

//         if (successCount > 0) {
//           toast.success(`Course created with ${successCount} lesson(s)!`)
//         } else {
//           toast.success('Course created successfully!')
//         }

//         await router.navigate({
//           to: '/courses/$courseId',
//           params: { courseId },
//         })
//       }
//     },
//   })

//   const updateCourseMutation = useMutation({
//     fn: updateCourse,
//     onSuccess: async () => {
//       toast.success('Course updated successfully!')
//       setIsEditMode(false)
//       await router.invalidate()
//     },
//   })

//   const deleteCourseMutation = useMutation({
//     fn: deleteCourse,
//     onSuccess: async () => {
//       toast.success('Course deleted successfully!')
//       await router.navigate({ to: '/dashboard' })
//     },
//   })

//   const createLessonMutation = useMutation({
//     fn: createLesson,
//     onSuccess: async () => {
//       toast.success('Lesson created successfully!')
//       await router.invalidate()
//     },
//   })

//   const deleteLessonMutation = useMutation({
//     fn: deleteLesson,
//     onSuccess: async () => {
//       toast.success('Lesson deleted successfully!')
//       setLessonToDelete(null)
//       await router.invalidate()
//     },
//   })

//   const handleAddLesson = () => {
//     if (lessons.length >= 3) {
//       toast.error('Maximum 3 lessons allowed')
//       return
//     }

//     if (isNew) {
//       setLessons([
//         ...lessons,
//         {
//           title: '',
//           content: '',
//           scheduledTime: '',
//           duration: '',
//         },
//       ])
//     } else if (course) {
//       createLessonMutation.mutate({
//         data: {
//           courseId: course.id,
//           title: 'New Lesson',
//           orderIndex: lessons.length,
//         },
//       })
//     }
//   }

//   const handleDeleteLesson = (index: number) => {
//     if (isNew) {
//       setLessons(lessons.filter((_, i) => i !== index))
//       toast.success('Lesson removed')
//     } else {
//       const lesson = lessons[index]
//       if (lesson.id) {
//         setLessonToDelete(lesson.id)
//       }
//     }
//   }

//   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault()
//     const form = e.target as HTMLFormElement
//     const formDataObj = new FormData(form)

//     if (isNew) {
//       createCourseMutation.mutate({
//         data: {
//           title: formDataObj.get('title') as string,
//           description: formDataObj.get('description') as string,
//           thumbnailUrl: formData.thumbnailUrl || undefined,
//         },
//       })
//     } else if (course) {
//       updateCourseMutation.mutate({
//         data: {
//           courseId: course.id,
//           title: formDataObj.get('title') as string,
//           description: formDataObj.get('description') as string,
//           thumbnailUrl:
//             formData.thumbnailUrl || course.thumbnailUrl || undefined,
//           isPublished: formData.isPublished,
//         },
//       })
//     }
//   }

//   const showEditableForm = isNew || isEditMode
//   const lessonCount = lessons.length

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="mx-auto max-w-7xl p-6">
//         <PageHeader
//           isNew={isNew}
//           isEditMode={isEditMode}
//           course={course}
//           canEdit={canEdit}
//           onEditModeToggle={setIsEditMode}
//           onDeleteClick={() => setShowDeleteDialog(true)}
//           createMutationStatus={createCourseMutation.status}
//           updateMutationStatus={updateCourseMutation.status}
//           isUploading={isUploading}
//           onCancel={() =>
//             isNew || isEditMode
//               ? router.navigate({ to: '/dashboard' })
//               : router.navigate({ to: '/dashboard' })
//           }
//         />

//         {!isNew && !showEditableForm && lessonCount !== 3 && (
//           <Alert className="mb-6">
//             <AlertDescription>
//               ⚠️ This course should have exactly 3 lessons. Currently has{' '}
//               {lessonCount}.
//             </AlertDescription>
//           </Alert>
//         )}

//         <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
//           <div className="space-y-6">
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   {showEditableForm ? 'Course Details' : 'Course Information'}
//                 </CardTitle>
//                 {!isNew && canEdit && !showEditableForm && (
//                   <Badge variant={course.isPublished ? 'default' : 'secondary'}>
//                     {course.isPublished ? 'Published' : 'Draft'}
//                   </Badge>
//                 )}
//                 {showEditableForm && (
//                   <CardDescription>
//                     {isNew
//                       ? 'Enter the basic information for your course'
//                       : 'Update the basic details of your course'}
//                   </CardDescription>
//                 )}
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 {showEditableForm ? (
//                   <form onSubmit={handleSubmit} id="courseForm">
//                     <CourseFormFields
//                       isNew={isNew}
//                       formData={formData}
//                       setFormData={setFormData}
//                       course={course}
//                       fileInputRef={fileInputRef}
//                     />
//                   </form>
//                 ) : (
//                   <CourseViewContent
//                     course={course}
//                     totalLessons={totalLessons}
//                   />
//                 )}
//               </CardContent>
//             </Card>

//             {!isNew && role === 'student' && isEnrolled && (
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Your Progress</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="space-y-2">
//                     <div className="flex items-center justify-between text-sm">
//                       <span>Completed Lessons</span>
//                       <span className="text-muted-foreground">
//                         {completedCount}/{totalLessons}
//                       </span>
//                     </div>
//                     <Progress value={progress} />
//                   </div>
//                 </CardContent>
//               </Card>
//             )}
//           </div>

//           <div>
//             <Card>
//               <CardHeader>
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <CardTitle>Lessons</CardTitle>
//                     <CardDescription>
//                       {showEditableForm
//                         ? `Add up to 3 lessons for your course (${lessonCount}/3)`
//                         : `${totalLessons} lesson${totalLessons !== 1 ? 's' : ''} in this course`}
//                     </CardDescription>
//                   </div>
//                   {showEditableForm && lessonCount < 3 && (
//                     <Button
//                       type="button"
//                       variant="outline"
//                       size="sm"
//                       onClick={handleAddLesson}
//                       disabled={createLessonMutation.status === 'pending'}
//                     >
//                       <PlusIcon className="mr-2 size-4" />
//                       Add Lesson
//                     </Button>
//                   )}
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 {showEditableForm ? (
//                   <LessonEditForm
//                     lessons={lessons}
//                     setLessons={setLessons}
//                     handleDeleteLesson={handleDeleteLesson}
//                   />
//                 ) : (
//                   <LessonViewList
//                     course={course}
//                     role={role}
//                     isEnrolled={isEnrolled}
//                     completedLessonIds={completedLessonIds}
//                   />
//                 )}
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>

//       <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Delete Course</DialogTitle>
//             <DialogDescription>
//               Are you sure you want to delete this course? This action cannot be
//               undone.
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setShowDeleteDialog(false)}
//             >
//               Cancel
//             </Button>
//             <Button
//               variant="destructive"
//               onClick={() => {
//                 if (course) {
//                   deleteCourseMutation.mutate({ data: { courseId: course.id } })
//                 }
//               }}
//             >
//               Delete
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       <Dialog
//         open={lessonToDelete !== null}
//         onOpenChange={(open) => !open && setLessonToDelete(null)}
//       >
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Delete Lesson</DialogTitle>
//             <DialogDescription>
//               Are you sure you want to delete this lesson?
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setLessonToDelete(null)}>
//               Cancel
//             </Button>
//             <Button
//               variant="destructive"
//               onClick={() => {
//                 if (lessonToDelete && course) {
//                   deleteLessonMutation.mutate({
//                     data: { lessonId: lessonToDelete, courseId: course.id },
//                   })
//                 }
//               }}
//             >
//               Delete
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   )
// }

// // import { createFileRoute, useRouter } from '@tanstack/react-router'
// // import { createServerFn } from '@tanstack/react-start'
// // import {
// //   CalendarIcon,
// //   ClockIcon,
// //   EditIcon,
// //   PlusIcon,
// //   TrashIcon,
// //   UploadIcon,
// //   VideoIcon,
// //   XIcon,
// // } from 'lucide-react'
// // import { and, eq } from 'drizzle-orm'
// // import { useRef, useState } from 'react'
// // import { toast } from 'sonner'
// // import { Badge } from '@/components/ui/badge'
// // import { Button } from '@/components/ui/button'
// // import {
// //   Card,
// //   CardContent,
// //   CardDescription,
// //   CardHeader,
// //   CardTitle,
// // } from '@/components/ui/card'
// // import {
// //   Dialog,
// //   DialogContent,
// //   DialogDescription,
// //   DialogFooter,
// //   DialogHeader,
// //   DialogTitle,
// // } from '@/components/ui/dialog'
// // import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
// // import { Input } from '@/components/ui/input'
// // import { Progress } from '@/components/ui/progress'
// // import { Switch } from '@/components/ui/switch'
// // import { Textarea } from '@/components/ui/textarea'
// // import {
// //   Accordion,
// //   AccordionContent,
// //   AccordionItem,
// //   AccordionTrigger,
// // } from '@/components/ui/accordion'
// // import { Alert, AlertDescription } from '@/components/ui/alert'
// // import { db } from '@/db'
// // import { courses, enrollments, lessonProgress, profiles } from '@/db/schema'
// // import { getCurrentUser } from '@/utils/auth'
// // import { useMutation } from '@/hooks/useMutation'
// // import {
// //   createCourse,
// //   createLesson,
// //   deleteCourse,
// //   deleteLesson,
// //   updateCourse,
// // } from '@/utils/courses'
// // import { fileToBase64, uploadImageFn } from '@/utils/imageUpload'

// // const getCourseData = createServerFn({ method: 'GET' })
// //   .inputValidator((d: { courseId: string }) => d)
// //   .handler(async ({ data }) => {
// //     const user = await getCurrentUser()

// //     // Handle "new" course creation
// //     if (data.courseId === 'new') {
// //       const profile = await db.query.profiles.findFirst({
// //         where: eq(profiles.id, user.id),
// //       })

// //       if (!profile) {
// //         throw new Error('Profile not found')
// //       }

// //       return {
// //         isNew: true,
// //         role: profile.role,
// //         course: null,
// //         isEnrolled: false,
// //         completedLessonIds: [],
// //       }
// //     }

// //     const course = await db.query.courses.findFirst({
// //       where: eq(courses.id, data.courseId),
// //       with: {
// //         teacher: true,
// //         lessons: {
// //           orderBy: (lessons, { asc }) => [asc(lessons.orderIndex)],
// //         },
// //       },
// //     })

// //     if (!course) {
// //       throw new Error('Course not found')
// //     }

// //     const profile = await db.query.profiles.findFirst({
// //       where: eq(profiles.id, user.id),
// //     })

// //     if (!profile) {
// //       throw new Error('Profile not found')
// //     }

// //     let enrollment = null
// //     let progress: Array<any> = []

// //     if (profile.role === 'student') {
// //       enrollment = await db.query.enrollments.findFirst({
// //         where: and(
// //           eq(enrollments.studentId, user.id),
// //           eq(enrollments.courseId, data.courseId),
// //         ),
// //       })

// //       progress = await db.query.lessonProgress.findMany({
// //         where: and(
// //           eq(lessonProgress.studentId, user.id),
// //           eq(lessonProgress.completed, true),
// //         ),
// //       })
// //     }

// //     const completedLessonIds = new Set(progress.map((p) => p.lessonId))

// //     return {
// //       isNew: false,
// //       course,
// //       role: profile.role,
// //       isEnrolled: !!enrollment,
// //       completedLessonIds: Array.from(completedLessonIds),
// //     }
// //   })

// // export const Route = createFileRoute('/_authed/courses/$courseId')({
// //   loader: async ({ params }) => {
// //     const data = await getCourseData({ data: { courseId: params.courseId } })
// //     return data
// //   },
// //   component: UnifiedCourseComponent,
// // })

// // function UnifiedCourseComponent() {
// //   const loaderData = Route.useLoaderData()
// //   const router = useRouter()

// //   const { isNew, course, role, isEnrolled, completedLessonIds } = loaderData

// //   const [isEditMode, setIsEditMode] = useState(false)
// //   const [showDeleteDialog, setShowDeleteDialog] = useState(false)
// //   const [lessonToDelete, setLessonToDelete] = useState<string | null>(null)
// //   const fileInputRef = useRef<HTMLInputElement>(null)
// //   const [isUploading, setIsUploading] = useState(false)

// //   // Form state
// //   const [formData, setFormData] = useState({
// //     title: course?.title || '',
// //     description: course?.description || '',
// //     thumbnailUrl: course?.thumbnailUrl || null,
// //     thumbnailFile: null as File | null,
// //     isPublished: course?.isPublished || false,
// //   })

// //   const [lessons, setLessons] = useState<
// //     Array<{
// //       id?: string
// //       title: string
// //       content: string
// //       scheduledTime: string
// //       duration: string
// //     }>
// //   >(
// //     course?.lessons.map((l: any) => ({
// //       id: l.id,
// //       title: l.title,
// //       content: l.content || '',
// //       scheduledTime: l.scheduledTime
// //         ? new Date(l.scheduledTime).toISOString().slice(0, 16)
// //         : '',
// //       duration: l.duration?.toString() || '',
// //     })) || [],
// //   )

// //   const canEdit = role === 'teacher' || role === 'admin'
// //   const completedCount = completedLessonIds.length
// //   const totalLessons = course?.lessons.length || 0
// //   const progress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0

// //   // Mutations
// //   const createCourseMutation = useMutation({
// //     fn: createCourse,
// //     onSuccess: async (ctx) => {
// //       if ('course' in ctx.data) {
// //         setIsUploading(true)
// //         const courseId = ctx.data.course.id

// //         // Upload course thumbnail if selected
// //         let courseThumbnailUrl: string | undefined
// //         if (formData.thumbnailFile) {
// //           const result = await uploadCourseThumbnail()
// //           if (result) {
// //             courseThumbnailUrl = result
// //           }
// //         }

// //         // Create lessons in parallel
// //         const lessonPromises = lessons.map(async (lesson, i) => {
// //           if (!lesson.title) return null

// //           try {
// //             const lessonResult = await createLesson({
// //               data: {
// //                 courseId,
// //                 title: lesson.title,
// //                 content: lesson.content || undefined,
// //                 scheduledTime: lesson.scheduledTime
// //                   ? new Date(lesson.scheduledTime)
// //                   : undefined,
// //                 duration: lesson.duration
// //                   ? parseInt(lesson.duration)
// //                   : undefined,
// //                 orderIndex: i,
// //               },
// //             })
// //             return lessonResult
// //           } catch (error) {
// //             console.error(`Failed to create lesson ${i + 1}:`, error)
// //             toast.error(`Failed to create lesson: ${lesson.title}`)
// //             return null
// //           }
// //         })

// //         const results = await Promise.allSettled(lessonPromises)
// //         const successCount = results.filter(
// //           (r) => r.status === 'fulfilled' && r.value,
// //         ).length

// //         // Update course with thumbnail URL if uploaded
// //         if (courseThumbnailUrl) {
// //           await updateCourse({
// //             data: {
// //               courseId,
// //               title: formData.title,
// //               description: formData.description,
// //               thumbnailUrl: courseThumbnailUrl,
// //               isPublished: false,
// //             },
// //           })
// //         }

// //         setIsUploading(false)

// //         if (successCount > 0) {
// //           toast.success(`Course created with ${successCount} lesson(s)!`)
// //         } else {
// //           toast.success('Course created successfully!')
// //         }

// //         // Navigate to view mode of new course
// //         await router.navigate({
// //           to: '/courses/$courseId',
// //           params: { courseId },
// //         })
// //       }
// //     },
// //   })

// //   const updateCourseMutation = useMutation({
// //     fn: updateCourse,
// //     onSuccess: async () => {
// //       toast.success('Course updated successfully!')
// //       setIsEditMode(false)
// //       await router.invalidate()
// //     },
// //   })

// //   const deleteCourseMutation = useMutation({
// //     fn: deleteCourse,
// //     onSuccess: async () => {
// //       toast.success('Course deleted successfully!')
// //       await router.navigate({ to: '/dashboard' })
// //     },
// //   })

// //   const createLessonMutation = useMutation({
// //     fn: createLesson,
// //     onSuccess: async () => {
// //       toast.success('Lesson created successfully!')
// //       await router.invalidate()
// //     },
// //   })

// //   const deleteLessonMutation = useMutation({
// //     fn: deleteLesson,
// //     onSuccess: async () => {
// //       toast.success('Lesson deleted successfully!')
// //       setLessonToDelete(null)
// //       await router.invalidate()
// //     },
// //   })

// //   // Handlers
// //   const uploadCourseThumbnail = async (): Promise<string | undefined> => {
// //     if (!formData.thumbnailFile) return undefined

// //     try {
// //       const result = await uploadImageFn({
// //         data: {
// //           fileData: await fileToBase64(formData.thumbnailFile),
// //           fileName: formData.thumbnailFile.name,
// //           fileType: formData.thumbnailFile.type,
// //           fileSize: formData.thumbnailFile.size,
// //           bucket: 'course-thumbnails',
// //         },
// //       })

// //       if (result.error) {
// //         toast.error('Failed to upload course thumbnail')
// //         return undefined
// //       }

// //       return result.imageUrl
// //     } catch (error) {
// //       console.error('Course thumbnail upload error:', error)
// //       toast.error('Failed to upload course thumbnail')
// //       return undefined
// //     }
// //   }

// //   const handleCourseThumbnailChange = async (
// //     e: React.ChangeEvent<HTMLInputElement>,
// //   ) => {
// //     const file = e.target.files?.[0]
// //     if (!file) return

// //     if (file.size > 2 * 1024 * 1024) {
// //       toast.error('File size must be less than 2MB')
// //       return
// //     }

// //     const fileData = await fileToBase64(file)
// //     setFormData((prev) => ({
// //       ...prev,
// //       thumbnailUrl: fileData,
// //       thumbnailFile: file,
// //     }))
// //   }

// //   const handleAddLesson = () => {
// //     if (lessons.length >= 3) {
// //       toast.error('Maximum 3 lessons allowed')
// //       return
// //     }

// //     if (isNew) {
// //       setLessons([
// //         ...lessons,
// //         {
// //           title: '',
// //           content: '',
// //           scheduledTime: '',
// //           duration: '',
// //         },
// //       ])
// //     } else if (course) {
// //       createLessonMutation.mutate({
// //         data: {
// //           courseId: course.id,
// //           title: 'New Lesson',
// //           orderIndex: lessons.length,
// //         },
// //       })
// //     }
// //   }

// //   const handleDeleteLesson = (index: number) => {
// //     if (isNew) {
// //       setLessons(lessons.filter((_, i) => i !== index))
// //       toast.success('Lesson removed')
// //     } else {
// //       const lesson = lessons[index]
// //       if (lesson.id) {
// //         setLessonToDelete(lesson.id)
// //       }
// //     }
// //   }

// //   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
// //     e.preventDefault()
// //     const form = e.target as HTMLFormElement
// //     const formDataObj = new FormData(form)

// //     if (isNew) {
// //       createCourseMutation.mutate({
// //         data: {
// //           title: formDataObj.get('title') as string,
// //           description: formDataObj.get('description') as string,
// //           thumbnailUrl: formData.thumbnailUrl || undefined,
// //         },
// //       })
// //     } else if (course) {
// //       updateCourseMutation.mutate({
// //         data: {
// //           courseId: course.id,
// //           title: formDataObj.get('title') as string,
// //           description: formDataObj.get('description') as string,
// //           thumbnailUrl:
// //             (formDataObj.get('thumbnailUrl') as string) || undefined,
// //           isPublished: formDataObj.get('isPublished') === 'on',
// //         },
// //       })
// //     }
// //   }

// //   const handleDeleteCourse = () => {
// //     if (course) {
// //       deleteCourseMutation.mutate({ data: { courseId: course.id } })
// //     }
// //   }

// //   const handleConfirmDeleteLesson = () => {
// //     if (lessonToDelete && course) {
// //       deleteLessonMutation.mutate({
// //         data: { lessonId: lessonToDelete, courseId: course.id },
// //       })
// //     }
// //   }

// //   // Determine what to show
// //   const showEditableForm = isNew || isEditMode
// //   const lessonCount = lessons.length

// //   return (
// //     <div className="min-h-screen bg-gray-50">
// //       <div className="mx-auto max-w-7xl p-6">
// //         <div className="mb-6 flex items-center justify-between">
// //           <div>
// //             <h1 className="text-3xl font-bold">
// //               {isNew
// //                 ? 'Create New Course'
// //                 : showEditableForm
// //                   ? 'Edit Course'
// //                   : course?.title}
// //             </h1>
// //             <p className="text-muted-foreground mt-1">
// //               {isNew
// //                 ? 'Set up a new course with up to 3 lessons'
// //                 : showEditableForm
// //                   ? 'Manage course details and lessons'
// //                   : `By ${course?.teacher.fullName}`}
// //             </p>
// //           </div>
// //           <div className="flex gap-2">
// //             {!isNew && canEdit && !showEditableForm && (
// //               <Button onClick={() => setIsEditMode(true)}>
// //                 <EditIcon className="mr-2 size-4" />
// //                 Edit Mode
// //               </Button>
// //             )}
// //             {!isNew && canEdit && showEditableForm && (
// //               <>
// //                 <Button
// //                   type="submit"
// //                   form="courseForm"
// //                   disabled={updateCourseMutation.status === 'pending'}
// //                 >
// //                   {updateCourseMutation.status === 'pending'
// //                     ? 'Saving...'
// //                     : 'Save Changes'}
// //                 </Button>
// //                 <Button
// //                   variant="destructive"
// //                   onClick={() => setShowDeleteDialog(true)}
// //                 >
// //                   <TrashIcon className="mr-2 size-4" />
// //                   Delete
// //                 </Button>
// //                 <Button variant="outline" onClick={() => setIsEditMode(false)}>
// //                   Cancel
// //                 </Button>
// //               </>
// //             )}
// //             {isNew && (
// //               <>
// //                 <Button
// //                   type="submit"
// //                   form="courseForm"
// //                   disabled={
// //                     createCourseMutation.status === 'pending' || isUploading
// //                   }
// //                 >
// //                   {isUploading
// //                     ? 'Uploading images...'
// //                     : createCourseMutation.status === 'pending'
// //                       ? 'Creating...'
// //                       : 'Create Course'}
// //                 </Button>
// //                 <Button
// //                   type="button"
// //                   variant="outline"
// //                   onClick={() => router.navigate({ to: '/dashboard' })}
// //                 >
// //                   Cancel
// //                 </Button>
// //               </>
// //             )}
// //             {!isNew && !showEditableForm && (
// //               <Button
// //                 variant="outline"
// //                 onClick={() => router.navigate({ to: '/dashboard' })}
// //               >
// //                 Back to Dashboard
// //               </Button>
// //             )}
// //           </div>
// //         </div>

// //         {!isNew && !showEditableForm && lessonCount !== 3 && (
// //           <Alert className="mb-6">
// //             <AlertDescription>
// //               ⚠️ This course should have exactly 3 lessons. Currently has{' '}
// //               {lessonCount}.
// //             </AlertDescription>
// //           </Alert>
// //         )}

// //         <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
// //           {/* Left: Course Information */}
// //           <div className="space-y-6">
// //             <Card>
// //               <CardHeader>
// //                 <CardTitle>
// //                   {showEditableForm ? 'Course Details' : 'Course Information'}
// //                 </CardTitle>
// //                 {!isNew && canEdit && !showEditableForm && (
// //                   <Badge variant={course.isPublished ? 'default' : 'secondary'}>
// //                     {course.isPublished ? 'Published' : 'Draft'}
// //                   </Badge>
// //                 )}
// //                 {showEditableForm && (
// //                   <CardDescription>
// //                     {isNew
// //                       ? 'Enter the basic information for your course'
// //                       : 'Update the basic details of your course'}
// //                   </CardDescription>
// //                 )}
// //               </CardHeader>
// //               <CardContent className="space-y-4">
// //                 {showEditableForm ? (
// //                   <form onSubmit={handleSubmit} id="courseForm">
// //                     <FieldGroup>
// //                       {isNew && (
// //                         <Field>
// //                           <FieldLabel>Course Thumbnail</FieldLabel>
// //                           <div className="space-y-2">
// //                             <input
// //                               ref={fileInputRef}
// //                               type="file"
// //                               accept="image/jpeg,image/png,image/webp,image/gif"
// //                               onChange={handleCourseThumbnailChange}
// //                               className="hidden"
// //                             />
// //                             {formData.thumbnailUrl ? (
// //                               <div className="relative aspect-video w-full overflow-hidden rounded-lg">
// //                                 <img
// //                                   src={formData.thumbnailUrl}
// //                                   alt="Course thumbnail"
// //                                   className="size-full object-cover"
// //                                 />
// //                                 <Button
// //                                   type="button"
// //                                   variant="outline"
// //                                   size="sm"
// //                                   className="absolute right-2 top-2"
// //                                   onClick={() => {
// //                                     setFormData((prev) => ({
// //                                       ...prev,
// //                                       thumbnailUrl: null,
// //                                       thumbnailFile: null,
// //                                     }))
// //                                     if (fileInputRef.current)
// //                                       fileInputRef.current.value = ''
// //                                   }}
// //                                 >
// //                                   <XIcon className="size-4" />
// //                                 </Button>
// //                               </div>
// //                             ) : (
// //                               <Button
// //                                 type="button"
// //                                 variant="outline"
// //                                 onClick={() => fileInputRef.current?.click()}
// //                                 className="w-full"
// //                               >
// //                                 <UploadIcon className="mr-2 size-4" />
// //                                 Upload Thumbnail
// //                               </Button>
// //                             )}
// //                             <p className="text-muted-foreground text-xs">
// //                               JPG, PNG, WebP or GIF. Max 2MB.
// //                             </p>
// //                           </div>
// //                         </Field>
// //                       )}
// //                       <Field>
// //                         <FieldLabel htmlFor="title">Course Title</FieldLabel>
// //                         <Input
// //                           id="title"
// //                           name="title"
// //                           type="text"
// //                           required
// //                           placeholder="Introduction to Programming"
// //                           value={formData.title}
// //                           onChange={(e) =>
// //                             setFormData((prev) => ({
// //                               ...prev,
// //                               title: e.target.value,
// //                             }))
// //                           }
// //                         />
// //                       </Field>
// //                       <Field>
// //                         <FieldLabel htmlFor="description">
// //                           Description
// //                         </FieldLabel>
// //                         <Textarea
// //                           id="description"
// //                           name="description"
// //                           placeholder="Describe what students will learn in this course"
// //                           rows={4}
// //                           value={formData.description}
// //                           onChange={(e) =>
// //                             setFormData((prev) => ({
// //                               ...prev,
// //                               description: e.target.value,
// //                             }))
// //                           }
// //                         />
// //                       </Field>
// //                       {!isNew && (
// //                         <>
// //                           <Field>
// //                             <FieldLabel htmlFor="thumbnailUrl">
// //                               Thumbnail URL
// //                             </FieldLabel>
// //                             <Input
// //                               id="thumbnailUrl"
// //                               name="thumbnailUrl"
// //                               type="url"
// //                               defaultValue={course.thumbnailUrl || ''}
// //                             />
// //                           </Field>
// //                           <Field>
// //                             <div className="flex items-center gap-2">
// //                               <Switch
// //                                 id="isPublished"
// //                                 name="isPublished"
// //                                 checked={formData.isPublished}
// //                                 onCheckedChange={(checked) =>
// //                                   setFormData((prev) => ({
// //                                     ...prev,
// //                                     isPublished: checked,
// //                                   }))
// //                                 }
// //                               />
// //                               <FieldLabel htmlFor="isPublished">
// //                                 Publish course
// //                               </FieldLabel>
// //                             </div>
// //                           </Field>
// //                         </>
// //                       )}
// //                     </FieldGroup>
// //                   </form>
// //                 ) : (
// //                   <>
// //                     {course.thumbnailUrl && (
// //                       <div className="aspect-video w-full overflow-hidden rounded-lg">
// //                         <img
// //                           src={course.thumbnailUrl}
// //                           alt={course.title}
// //                           className="size-full object-cover"
// //                         />
// //                       </div>
// //                     )}
// //                     {course.description && (
// //                       <div>
// //                         <h3 className="mb-2 font-semibold">Description</h3>
// //                         <p className="text-muted-foreground text-sm">
// //                           {course.description}
// //                         </p>
// //                       </div>
// //                     )}
// //                     <div>
// //                       <h3 className="mb-2 font-semibold">Course Information</h3>
// //                       <div className="space-y-2 text-sm">
// //                         <div className="flex justify-between">
// //                           <span className="text-muted-foreground">
// //                             Total Lessons
// //                           </span>
// //                           <span className="font-medium">{totalLessons}</span>
// //                         </div>
// //                         <div className="flex justify-between">
// //                           <span className="text-muted-foreground">
// //                             Instructor
// //                           </span>
// //                           <span className="font-medium">
// //                             {course.teacher.fullName}
// //                           </span>
// //                         </div>
// //                       </div>
// //                     </div>
// //                   </>
// //                 )}
// //               </CardContent>
// //             </Card>

// //             {!isNew && role === 'student' && isEnrolled && (
// //               <Card>
// //                 <CardHeader>
// //                   <CardTitle>Your Progress</CardTitle>
// //                 </CardHeader>
// //                 <CardContent>
// //                   <div className="space-y-2">
// //                     <div className="flex items-center justify-between text-sm">
// //                       <span>Completed Lessons</span>
// //                       <span className="text-muted-foreground">
// //                         {completedCount}/{totalLessons}
// //                       </span>
// //                     </div>
// //                     <Progress value={progress} />
// //                   </div>
// //                 </CardContent>
// //               </Card>
// //             )}
// //           </div>

// //           {/* Right: Lessons */}
// //           <div>
// //             <Card>
// //               <CardHeader>
// //                 <div className="flex items-center justify-between">
// //                   <div>
// //                     <CardTitle>Lessons</CardTitle>
// //                     <CardDescription>
// //                       {showEditableForm
// //                         ? `Add up to 3 lessons for your course (${lessonCount}/3)`
// //                         : `${totalLessons} lesson${totalLessons !== 1 ? 's' : ''} in this course`}
// //                     </CardDescription>
// //                   </div>
// //                   {showEditableForm && lessonCount < 3 && (
// //                     <Button
// //                       type="button"
// //                       variant="outline"
// //                       size="sm"
// //                       onClick={handleAddLesson}
// //                       disabled={createLessonMutation.status === 'pending'}
// //                     >
// //                       <PlusIcon className="mr-2 size-4" />
// //                       Add Lesson
// //                     </Button>
// //                   )}
// //                 </div>
// //               </CardHeader>
// //               <CardContent>
// //                 {showEditableForm ? (
// //                   lessons.length === 0 ? (
// //                     <div className="text-muted-foreground py-8 text-center">
// //                       <p className="mb-4">No lessons added yet</p>
// //                       <Button
// //                         type="button"
// //                         variant="outline"
// //                         onClick={handleAddLesson}
// //                       >
// //                         <PlusIcon className="mr-2 size-4" />
// //                         Add Your First Lesson
// //                       </Button>
// //                     </div>
// //                   ) : (
// //                     <Accordion
// //                       type="multiple"
// //                       className="space-y-4"
// //                       defaultValue={lessons.map((_, i) => `lesson-${i}`)}
// //                     >
// //                       {lessons.map((lesson, index) => (
// //                         <AccordionItem key={index} value={`lesson-${index}`}>
// //                           <AccordionTrigger className="px-4">
// //                             <div className="flex flex-1 items-center justify-between pr-4">
// //                               <span className="flex items-center gap-2">
// //                                 Lesson {index + 1}
// //                                 {lesson.title && (
// //                                   <span className="text-muted-foreground text-sm font-normal">
// //                                     - {lesson.title}
// //                                   </span>
// //                                 )}
// //                               </span>
// //                               <Button
// //                                 type="button"
// //                                 variant="ghost"
// //                                 size="sm"
// //                                 onClick={(e) => {
// //                                   e.stopPropagation()
// //                                   handleDeleteLesson(index)
// //                                 }}
// //                                 className="hover:bg-destructive/10 hover:text-destructive"
// //                               >
// //                                 <TrashIcon className="size-4" />
// //                               </Button>
// //                             </div>
// //                           </AccordionTrigger>
// //                           <AccordionContent className="px-4 pb-4">
// //                             <div className="space-y-4">
// //                               <Field>
// //                                 <FieldLabel htmlFor={`lesson-title-${index}`}>
// //                                   Title
// //                                 </FieldLabel>
// //                                 <Input
// //                                   id={`lesson-title-${index}`}
// //                                   placeholder="Lesson title"
// //                                   value={lesson.title}
// //                                   onChange={(e) => {
// //                                     const newLessons = [...lessons]
// //                                     newLessons[index] = {
// //                                       ...newLessons[index],
// //                                       title: e.target.value,
// //                                     }
// //                                     setLessons(newLessons)
// //                                   }}
// //                                 />
// //                               </Field>
// //                               <Field>
// //                                 <FieldLabel htmlFor={`lesson-content-${index}`}>
// //                                   Content
// //                                 </FieldLabel>
// //                                 <Textarea
// //                                   id={`lesson-content-${index}`}
// //                                   placeholder="Lesson content or description"
// //                                   rows={3}
// //                                   value={lesson.content}
// //                                   onChange={(e) => {
// //                                     const newLessons = [...lessons]
// //                                     newLessons[index] = {
// //                                       ...newLessons[index],
// //                                       content: e.target.value,
// //                                     }
// //                                     setLessons(newLessons)
// //                                   }}
// //                                 />
// //                               </Field>
// //                               <div className="grid gap-4 sm:grid-cols-2">
// //                                 <Field>
// //                                   <FieldLabel
// //                                     htmlFor={`lesson-duration-${index}`}
// //                                   >
// //                                     Duration (minutes)
// //                                   </FieldLabel>
// //                                   <Input
// //                                     id={`lesson-duration-${index}`}
// //                                     type="number"
// //                                     placeholder="60"
// //                                     value={lesson.duration}
// //                                     onChange={(e) => {
// //                                       const newLessons = [...lessons]
// //                                       newLessons[index] = {
// //                                         ...newLessons[index],
// //                                         duration: e.target.value,
// //                                       }
// //                                       setLessons(newLessons)
// //                                     }}
// //                                   />
// //                                 </Field>
// //                                 <Field>
// //                                   <FieldLabel htmlFor={`lesson-time-${index}`}>
// //                                     Scheduled Time
// //                                   </FieldLabel>
// //                                   <Input
// //                                     id={`lesson-time-${index}`}
// //                                     type="datetime-local"
// //                                     value={lesson.scheduledTime}
// //                                     onChange={(e) => {
// //                                       const newLessons = [...lessons]
// //                                       newLessons[index] = {
// //                                         ...newLessons[index],
// //                                         scheduledTime: e.target.value,
// //                                       }
// //                                       setLessons(newLessons)
// //                                     }}
// //                                   />
// //                                 </Field>
// //                               </div>
// //                             </div>
// //                           </AccordionContent>
// //                         </AccordionItem>
// //                       ))}
// //                     </Accordion>
// //                   )
// //                 ) : (
// //                   <div className="space-y-4">
// //                     {course.lessons.map((lesson: any, index: number) => {
// //                       const isCompleted = completedLessonIds.includes(lesson.id)
// //                       return (
// //                         <div
// //                           key={lesson.id}
// //                           className="flex items-start gap-4 rounded-lg border p-4"
// //                         >
// //                           <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
// //                             <span className="font-semibold">{index + 1}</span>
// //                           </div>
// //                           <div className="flex-1">
// //                             <h3 className="font-semibold">{lesson.title}</h3>
// //                             {lesson.content && (
// //                               <p className="text-muted-foreground mt-1 text-sm">
// //                                 {lesson.content}
// //                               </p>
// //                             )}
// //                             <div className="mt-2 flex flex-wrap gap-3 text-sm">
// //                               {lesson.duration && (
// //                                 <div className="text-muted-foreground flex items-center gap-1">
// //                                   <ClockIcon className="size-4" />
// //                                   <span>{lesson.duration} min</span>
// //                                 </div>
// //                               )}
// //                               {lesson.scheduledTime && (
// //                                 <div className="text-muted-foreground flex items-center gap-1">
// //                                   <CalendarIcon className="size-4" />
// //                                   <span>
// //                                     {new Date(
// //                                       lesson.scheduledTime,
// //                                     ).toLocaleDateString()}
// //                                   </span>
// //                                 </div>
// //                               )}
// //                               {lesson.videoUrl && (
// //                                 <div className="text-muted-foreground flex items-center gap-1">
// //                                   <VideoIcon className="size-4" />
// //                                   <span>Video available</span>
// //                                 </div>
// //                               )}
// //                             </div>
// //                           </div>
// //                           {role === 'student' && isEnrolled && (
// //                             <div>
// //                               {isCompleted ? (
// //                                 <Badge variant="default">Completed</Badge>
// //                               ) : (
// //                                 <Button size="sm">Start</Button>
// //                               )}
// //                             </div>
// //                           )}
// //                         </div>
// //                       )
// //                     })}
// //                     {course.lessons.length === 0 && (
// //                       <div className="text-muted-foreground py-8 text-center">
// //                         No lessons yet
// //                       </div>
// //                     )}
// //                   </div>
// //                 )}
// //               </CardContent>
// //             </Card>
// //           </div>
// //         </div>
// //       </div>

// //       {/* Delete Course Dialog */}
// //       <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
// //         <DialogContent>
// //           <DialogHeader>
// //             <DialogTitle>Delete Course</DialogTitle>
// //             <DialogDescription>
// //               Are you sure you want to delete this course? This action cannot be
// //               undone.
// //             </DialogDescription>
// //           </DialogHeader>
// //           <DialogFooter>
// //             <Button
// //               variant="outline"
// //               onClick={() => setShowDeleteDialog(false)}
// //             >
// //               Cancel
// //             </Button>
// //             <Button variant="destructive" onClick={handleDeleteCourse}>
// //               Delete
// //             </Button>
// //           </DialogFooter>
// //         </DialogContent>
// //       </Dialog>

// //       {/* Delete Lesson Dialog */}
// //       <Dialog
// //         open={lessonToDelete !== null}
// //         onOpenChange={(open) => !open && setLessonToDelete(null)}
// //       >
// //         <DialogContent>
// //           <DialogHeader>
// //             <DialogTitle>Delete Lesson</DialogTitle>
// //             <DialogDescription>
// //               Are you sure you want to delete this lesson?
// //             </DialogDescription>
// //           </DialogHeader>
// //           <DialogFooter>
// //             <Button variant="outline" onClick={() => setLessonToDelete(null)}>
// //               Cancel
// //             </Button>
// //             <Button variant="destructive" onClick={handleConfirmDeleteLesson}>
// //               Delete
// //             </Button>
// //           </DialogFooter>
// //         </DialogContent>
// //       </Dialog>
// //     </div>
// //   )
// // }
