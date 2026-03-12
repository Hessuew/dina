export type UserRole = 'student' | 'teacher' | 'admin'
export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'dropped'
export type InquiryStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type AssignmentStatus = 'draft' | 'published' | 'archived'
export type SubmissionStatus = 'pending' | 'submitted' | 'graded' | 'late'
export type AnnouncementType = 'course' | 'system'
export type MediaType = 'video' | 'document' | 'image' | 'audio' | 'other'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  bio?: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  description?: string
  syllabus?: string
  teacher_id: string
  thumbnail_url?: string
  is_published: boolean
  enrollment_limit?: number
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

export interface CourseWithTeacher extends Course {
  teacher: Profile
}

export interface Module {
  id: string
  course_id: string
  title: string
  description?: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  content?: string
  video_url?: string
  duration_minutes?: number
  order_index: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  status: EnrollmentStatus
  enrolled_at: string
  completed_at?: string
  progress_percentage: number
  created_at: string
  updated_at: string
}

export interface EnrollmentWithCourse extends Enrollment {
  courses: Course
}

export interface LessonProgress {
  id: string
  student_id: string
  lesson_id: string
  completed: boolean
  last_position_seconds: number
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  course_id: string
  title: string
  description?: string
  due_date?: string
  max_points: number
  status: AssignmentStatus
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  content?: string
  file_url?: string
  status: SubmissionStatus
  submitted_at?: string
  grade?: number
  feedback?: string
  graded_at?: string
  graded_by?: string
  created_at: string
  updated_at: string
}

export interface SubmissionWithStudent extends Submission {
  student: Profile
}

export interface Inquiry {
  id: string
  student_id: string
  teacher_id: string
  course_id?: string
  subject: string
  message: string
  status: InquiryStatus
  priority: number
  created_at: string
  updated_at: string
}

export interface InquiryWithRelations extends Inquiry {
  student: Profile
  teacher: Profile
  course?: Course
}

export interface InquiryResponse {
  id: string
  inquiry_id: string
  responder_id: string
  message: string
  created_at: string
}

export interface InquiryResponseWithResponder extends InquiryResponse {
  responder: Profile
}

export interface Announcement {
  id: string
  author_id: string
  type: AnnouncementType
  course_id?: string
  title: string
  content: string
  is_published: boolean
  published_at?: string
  created_at: string
  updated_at: string
}

export interface AnnouncementWithAuthor extends Announcement {
  author: Profile
}

export interface MediaLibrary {
  id: string
  uploader_id: string
  course_id?: string
  title: string
  description?: string
  file_url: string
  file_type: MediaType
  file_size_bytes?: number
  thumbnail_url?: string
  created_at: string
  updated_at: string
}

export interface MediaLibraryWithUploader extends MediaLibrary {
  uploader: Profile
}

export interface CalendarEvent {
  id: string
  course_id?: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  is_all_day: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CalendarEventWithCourse extends CalendarEvent {
  course?: Course
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  link?: string
  created_at: string
}

export interface CourseTag {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface CourseTagRelation {
  course_id: string
  tag_id: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      courses: {
        Row: Course
        Insert: Omit<Course, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Course, 'id' | 'created_at' | 'updated_at'>>
      }
      modules: {
        Row: Module
        Insert: Omit<Module, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Module, 'id' | 'created_at' | 'updated_at'>>
      }
      lessons: {
        Row: Lesson
        Insert: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Lesson, 'id' | 'created_at' | 'updated_at'>>
      }
      enrollments: {
        Row: Enrollment
        Insert: Omit<Enrollment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Enrollment, 'id' | 'created_at' | 'updated_at'>>
      }
      lesson_progress: {
        Row: LessonProgress
        Insert: Omit<LessonProgress, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<LessonProgress, 'id' | 'created_at' | 'updated_at'>>
      }
      assignments: {
        Row: Assignment
        Insert: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Assignment, 'id' | 'created_at' | 'updated_at'>>
      }
      submissions: {
        Row: Submission
        Insert: Omit<Submission, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Submission, 'id' | 'created_at' | 'updated_at'>>
      }
      inquiries: {
        Row: Inquiry
        Insert: Omit<Inquiry, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Inquiry, 'id' | 'created_at' | 'updated_at'>>
      }
      inquiry_responses: {
        Row: InquiryResponse
        Insert: Omit<InquiryResponse, 'id' | 'created_at'>
        Update: Partial<Omit<InquiryResponse, 'id' | 'created_at'>>
      }
      announcements: {
        Row: Announcement
        Insert: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Announcement, 'id' | 'created_at' | 'updated_at'>>
      }
      media_library: {
        Row: MediaLibrary
        Insert: Omit<MediaLibrary, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MediaLibrary, 'id' | 'created_at' | 'updated_at'>>
      }
      calendar_events: {
        Row: CalendarEvent
        Insert: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
      course_tags: {
        Row: CourseTag
        Insert: Omit<CourseTag, 'id' | 'created_at'>
        Update: Partial<Omit<CourseTag, 'id' | 'created_at'>>
      }
      course_tag_relations: {
        Row: CourseTagRelation
        Insert: CourseTagRelation
        Update: Partial<CourseTagRelation>
      }
    }
  }
}
