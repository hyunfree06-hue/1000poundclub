// Public URL for an object in a public bucket (e.g. post-images).
export function publicUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

const VIDEO_EXT = new Set(["mp4", "mov", "webm", "m4v", "ogg", "ogv", "avi"]);

export function mediaKind(path: string): "image" | "video" {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXT.has(ext) ? "video" : "image";
}
