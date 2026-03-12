import { ErrorComponent, createFileRoute } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { NotFound } from "~/components/NotFound";
import { trpc } from "../../router";

export const Route = createFileRoute("/_authed/posts/$postId")({
  errorComponent: ({ error }: ErrorComponentProps) => (
    <ErrorComponent error={error} />
  ),
  component: PostComponent,
  notFoundComponent: () => {
    return <NotFound>Post not found</NotFound>;
  },
});

function PostComponent() {
  const { postId } = Route.useParams();
  const { data: post, isLoading, error } = trpc.posts.byId.useQuery(postId);

  if (isLoading) {
    return <div className="p-2">Loading post...</div>;
  }

  if (error || !post) {
    return <NotFound>Post not found</NotFound>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xl font-bold underline">{post.title}</h4>
      <div className="text-sm">{post.body}</div>
    </div>
  );
}
