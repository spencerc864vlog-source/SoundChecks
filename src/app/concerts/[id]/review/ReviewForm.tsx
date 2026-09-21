"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upsertReviewAction, deleteReviewAction } from "@/lib/actions/reviews";
import { StarPicker } from "@/components/StarRating";
import SubmitButton from "@/components/SubmitButton";

type MediaItem = { url: string; type: "photo" | "video" };

export default function ReviewForm({
  concertId,
  concertLabel,
  existingReviewId,
  initialRating = 0,
  initialBody = "",
  initialMedia = [],
}: {
  concertId: string;
  concertLabel: string;
  existingReviewId?: string;
  initialRating?: number;
  initialBody?: string;
  initialMedia?: MediaItem[];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(upsertReviewAction, undefined);
  const [rating, setRating] = useState(initialRating);
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const presignRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: file.type, fileSizeBytes: file.size }),
        });

        const presignJson = await presignRes.json();
        if (!presignRes.ok) {
          throw new Error(presignJson.error ?? "Upload failed.");
        }

        const putRes = await fetch(presignJson.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!putRes.ok) {
          throw new Error("Upload to storage failed.");
        }

        setMedia((prev) => [...prev, { url: presignJson.publicUrl, type: presignJson.kind }]);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-lg mx-auto card p-6">
      <h1 className="text-xl font-bold mb-1">Rate this show</h1>
      <p className="text-sm text-[var(--muted)] mb-6">{concertLabel}</p>

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="concertId" value={concertId} />
        <input type="hidden" name="media" value={JSON.stringify(media)} />

        <div>
          <span className="text-sm text-[var(--muted)] block mb-1">Your rating</span>
          <StarPicker value={rating} onChange={setRating} name="rating" />
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--muted)]">Review (optional)</span>
          <textarea
            className="input min-h-28 resize-y"
            name="body"
            defaultValue={initialBody}
            placeholder="How was it? Any highlights, surprises, sound issues…"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-[var(--muted)]">Photos / video (optional)</span>

          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {media.map((item, i) => (
                <div key={item.url} className="relative aspect-square rounded-md overflow-hidden bg-black/30">
                  {item.type === "photo" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={item.url} className="w-full h-full object-cover" muted />
                  )}
                  <button
                    type="button"
                    onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/quicktime,video/webm"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
            className="text-sm text-[var(--muted)]"
          />
          {uploading && <p className="text-xs text-[var(--muted)]">Uploading…</p>}
          {uploadError && <p className="text-xs text-[var(--danger)]">{uploadError}</p>}
        </div>

        {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

        <div className="flex items-center gap-3">
          <SubmitButton pendingText="Saving…">
            {existingReviewId ? "Update review" : "Post review"}
          </SubmitButton>
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>

      {existingReviewId && (
        <form action={deleteReviewAction} className="mt-5 pt-4 border-t border-[var(--border)]">
          <input type="hidden" name="reviewId" value={existingReviewId} />
          <button type="submit" className="btn btn-danger text-xs !py-1.5">
            Delete review
          </button>
        </form>
      )}
    </div>
  );
}
