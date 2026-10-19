import { describe, expect, it } from "vitest";
import { galleryFileKind, galleryFileSize, selectGalleryFiles } from "@/lib/personal-gallery";
const files = [
  { name: "IMG_2.JPG", type: "image/jpeg", size: 1000, lastModified: 10, webkitRelativePath: "Trip/IMG_2.JPG" },
  { name: "clip.MOV", type: "", size: 10000, lastModified: 30, webkitRelativePath: "Trip/Videos/clip.MOV" },
  { name: "IMG_10.JPG", type: "image/jpeg", size: 1000, lastModified: 20 },
  { name: "notes.txt", type: "text/plain", size: 50, lastModified: 99 },
];
describe("local personal gallery file selection", () => {
  it("recognizes photo and video MIME types, including empty-MIME folder selections", () => {
    expect(galleryFileKind(files[0])).toBe("photo");
    expect(galleryFileKind(files[1])).toBe("video");
    expect(galleryFileKind({ name: "photo.HEIC", type: "" })).toBe("photo");
    expect(galleryFileKind({ name: "camera.DNG", type: "application/octet-stream" })).toBe("photo");
    expect(galleryFileKind({ name: "photo.jpg", type: "text/html" })).toBeNull();
    expect(galleryFileKind({ name: "playlist.m3u8", type: "" })).toBeNull();
  });
  it("filters by media type and folder/name without including unrelated documents", () => {
    expect(selectGalleryFiles(files, "all", "", "newest").map(file => file.name)).toEqual(["clip.MOV", "IMG_10.JPG", "IMG_2.JPG"]);
    expect(selectGalleryFiles(files, "photo", "", "name").map(file => file.name)).toEqual(["IMG_2.JPG", "IMG_10.JPG"]);
    expect(selectGalleryFiles(files, "all", " videos ", "oldest").map(file => file.name)).toEqual(["clip.MOV"]);
    expect(selectGalleryFiles(files, "video", "missing", "newest")).toEqual([]);
  });
  it("does not mutate the selection or drop distinct files with matching names", () => {
    const duplicateName = { ...files[0], webkitRelativePath: "Another/IMG_2.JPG", lastModified: 5 };
    const selection = [files[0], duplicateName];
    expect(selectGalleryFiles(selection, "all", "", "oldest")).toEqual([duplicateName, files[0]]);
    expect(selection).toEqual([files[0], duplicateName]);
  });
  it("formats file sizes without reading or uploading contents", () => {
    expect(galleryFileSize(500)).toBe("500 B");
    expect(galleryFileSize(1024)).toBe("1.0 KB");
    expect(galleryFileSize(1024 * 1024 * 12)).toBe("12.0 MB");
  });
});
