import type { MediaLibraryRow } from '@/utils/library/library'
import { MediaCard } from '@/components/library/MediaCard'

type LibraryShelfProps = {
  topic: string
  ebooks: Array<MediaLibraryRow>
  audioVisual: Array<MediaLibraryRow>
  viewerRole: 'student' | 'teacher' | 'admin'
}

export function LibraryShelf({
  topic,
  ebooks,
  audioVisual,
  viewerRole,
}: LibraryShelfProps) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <div className="h-px w-8 bg-[#9B7A41]/50" />
        <h2 className="mt-2 font-serif text-xl tracking-[-0.01em] text-[#1C1815]">
          {topic}
        </h2>
      </div>

      {ebooks.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[0.68rem] font-medium tracking-[0.25em] text-[#9B7A41] uppercase">
            eBooks
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {ebooks.map((item) => (
              <MediaCard key={item.id} item={item} viewerRole={viewerRole} />
            ))}
          </div>
        </div>
      )}

      {audioVisual.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[0.68rem] font-medium tracking-[0.25em] text-[#9B7A41] uppercase">
            Audio-Visual
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {audioVisual.map((item) => (
              <MediaCard key={item.id} item={item} viewerRole={viewerRole} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
