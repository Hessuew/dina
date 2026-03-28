import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from '@/hooks/useMutation'
import { createCourse } from '@/utils/courses'

export const Route = createFileRoute('/_authed/courses/new')({
  component: NewCourseComponent,
})

function NewCourseComponent() {
  const router = useRouter()

  const createCourseMutation = useMutation({
    fn: createCourse,
    onSuccess: async (ctx) => {
      if (ctx.data && 'course' in ctx.data) {
        await router.navigate({
          to: '/courses/$courseId/edit',
          params: { courseId: ctx.data.course.id },
        })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    createCourseMutation.mutate({
      data: {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        thumbnailUrl: formData.get('thumbnailUrl') as string,
      },
    })
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Course</h1>
        <p className="text-muted-foreground mt-1">
          Set up a new course with 3 lessons
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
          <CardDescription>
            Enter the basic information for your course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="title">Course Title</FieldLabel>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  required
                  placeholder="Introduction to Programming"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe what students will learn in this course"
                  rows={4}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="thumbnailUrl">
                  Thumbnail URL (optional)
                </FieldLabel>
                <Input
                  id="thumbnailUrl"
                  name="thumbnailUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                />
              </Field>
              <Field>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createCourseMutation.status === 'pending'}
                  >
                    {createCourseMutation.status === 'pending'
                      ? 'Creating...'
                      : 'Create Course'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.history.back()}
                  >
                    Cancel
                  </Button>
                </div>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
