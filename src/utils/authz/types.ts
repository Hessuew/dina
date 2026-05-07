export type Role = 'student' | 'teacher' | 'admin'

export type Action =
  | 'viewCourse'
  | 'editCourse'
  | 'deleteCourse'
  | 'createLesson'
  | 'editLesson'
  | 'deleteLesson'
  | 'gradeAssignment'
  | 'viewSubmission'
  | 'editSubmission'
  | 'deleteSubmission'
  | 'createPost'
  | 'editPost'
  | 'deletePost'
  | 'createComment'
  | 'editComment'
  | 'deleteComment'

export type ResourceType =
  | 'course'
  | 'lesson'
  | 'assignment'
  | 'submission'
  | 'post'
  | 'comment'

export interface AuthorizationService {
  hasRole: (userId: string, role: Role) => Promise<void>
  isRole: (userId: string, role: Role) => Promise<boolean>
  isAdmin: (userId: string) => Promise<boolean>
  canPerformAction: (
    userId: string,
    action: Action,
    resourceType: ResourceType,
    resourceId: string,
  ) => Promise<void>
  isAllowedToPerformAction: (
    userId: string,
    action: Action,
    resourceType: ResourceType,
    resourceId: string,
  ) => Promise<boolean>
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly reason: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Authorization module handles permission checks.
 *
 * NOTE: This module assumes authentication is already handled.
 * Callers must ensure userId is from a validated session (use getCurrentUser()).
 * This separation allows authorization to be tested independently of authentication.
 */
