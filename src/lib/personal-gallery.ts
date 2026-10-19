export type GalleryKind = "photo" | "video";
export type GalleryFileInfo = { name: string; type: string; size: number; lastModified: number; webkitRelativePath?: string };
export function galleryFileKind(file: Pick<GalleryFileInfo, "name" | "type">): GalleryKind | null {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  // Folder pickers sometimes provide no MIME type. Do not reinterpret files of
  // an explicit unrelated type (for example HTML) using their filename alone.
  if (file.type && file.type !== "application/octet-stream") return null;
  if (/\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?|svg|ico|dng|nef|cr[23]|arw|raf)$/i.test(file.name)) return "photo";
  if (/\.(mp4|m4v|mov|webm|ogv|ogg|avi|mkv|3gp|mpeg|mpg|mts|m2ts)$/i.test(file.name)) return "video";
  return null;
}
export function selectGalleryFiles<T extends GalleryFileInfo>(files: readonly T[], kind: "all" | GalleryKind, search: string, sort: "newest" | "oldest" | "name"): T[] {
  const query = search.trim().toLocaleLowerCase();
  return files.filter(file => {
    const type = galleryFileKind(file);
    return type && (kind === "all" || type === kind) && (!query || `${file.webkitRelativePath ?? ""} ${file.name}`.toLocaleLowerCase().includes(query));
  }).sort((left, right) => sort === "name" ? left.name.localeCompare(right.name, undefined, { numeric: true }) : (sort === "newest" ? right.lastModified - left.lastModified : left.lastModified - right.lastModified) || left.name.localeCompare(right.name));
}
export function galleryFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
