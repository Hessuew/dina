import { trpc } from "../lib/trpc";

export function useStudentEnrollments(studentId: string) {
  return trpc.enrollment.list.useQuery({ studentId }, { enabled: !!studentId });
}

export function useApproveEnrollment() {
  const utils = trpc.useUtils();

  return trpc.enrollment.approve.useMutation({
    onSuccess: () => {
      utils.enrollment.list.invalidate();
      utils.admin.getStats.invalidate();
    },
  });
}

export function useRejectEnrollment() {
  const utils = trpc.useUtils();

  return trpc.enrollment.reject.useMutation({
    onSuccess: () => {
      utils.enrollment.list.invalidate();
      utils.admin.getStats.invalidate();
    },
  });
}

export function useCreateEnrollment() {
  const utils = trpc.useUtils();

  return trpc.enrollment.create.useMutation({
    onSuccess: () => {
      utils.enrollment.list.invalidate();
      utils.admin.getStats.invalidate();
    },
  });
}
