"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function WriteForm({ isGuest }: { isGuest: boolean }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imgs].slice(0, 6));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    form.delete("images");
    files.forEach((f) => form.append("images", f));

    try {
      const res = await fetch("/api/posts", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }
      router.push(`/post/${json.id}`);
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        name="title"
        placeholder="Title"
        maxLength={300}
        required
        className="border border-hairline px-2 py-1 text-base outline-none focus:border-accent"
        style={{ borderRadius: 2 }}
      />

      {isGuest && (
        <div className="flex flex-wrap items-end gap-3 border border-hairline bg-[#fafafa] p-2">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Name
            <input
              name="guest_name"
              minLength={2}
              maxLength={12}
              required
              className="border border-hairline px-2 py-1 text-base text-ink outline-none focus:border-accent"
              style={{ borderRadius: 2 }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Password (4-digit PIN)
            <input
              name="guest_pin"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              required
              className="border border-hairline px-2 py-1 text-base text-ink outline-none focus:border-accent"
              style={{ borderRadius: 2, width: 90 }}
            />
          </label>
          <p className="text-xs text-muted">
            You&apos;ll need this PIN to edit or delete your post.
          </p>
        </div>
      )}

      <textarea
        name="body"
        placeholder="Write your post. Markdown: **bold** *italic* `code` > quote [link](https://…)"
        required
        rows={14}
        className="resize-y border border-hairline px-2 py-2 text-base outline-none focus:border-accent"
        style={{ borderRadius: 2 }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInput.current?.click()}
        className={`cursor-pointer border border-dashed p-3 text-center text-xs ${
          dragOver ? "border-accent bg-[#fdecea]" : "border-hairline text-muted"
        }`}
        style={{ borderRadius: 2 }}
      >
        Drag &amp; drop images here, or click to choose (max 6).
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative border border-hairline p-1" style={{ borderRadius: 2 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(f)}
                alt={f.name}
                className="h-16 w-16 object-cover"
              />
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 h-4 w-4 border border-hairline bg-white text-xs leading-none text-muted"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="border border-accent bg-[#fdecea] px-2 py-1 text-accent">{error}</div>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={submitting} className="btn btn-accent">
          {submitting ? "Posting…" : "Submit"}
        </button>
        <a href="/" className="btn">
          Cancel
        </a>
      </div>
    </form>
  );
}
