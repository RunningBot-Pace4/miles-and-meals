import { describe, it, expect } from "vitest";
import { MEDIA_CONSENT_TEXT, mediaPath, safeMediaName, mediaSignatureMatches, parseMediaRange, isMediaType } from "@/lib/shared-media";
describe("explicit shared media policy", () => {
  it("names admins, original metadata, revocation and downloaded-copy limitations", () => {
    expect(MEDIA_CONSENT_TEXT).toContain("system admins, including future admins");
    expect(MEDIA_CONSENT_TEXT).toContain("location metadata");
    expect(MEDIA_CONSENT_TEXT).toContain("cannot recall copies");
  });
  it("uses generated paths and sanitizes user filenames", () => {
    expect(mediaPath("abc", "image/jpeg")).toBe("shared-media/abc.jpg");
    expect(safeMediaName("C:\\Photos\\My photo\u0000.jpg")).toBe("My photo.jpg");
    expect(isMediaType("text/html")).toBe(false);
    expect(isMediaType("image/svg+xml")).toBe(false);
    expect(isMediaType("image/heic")).toBe(false);
  });
  it("checks media signatures instead of trusting filenames and browser MIME labels", () => {
    expect(mediaSignatureMatches("image/jpeg", new Uint8Array([255,216,255,0]))).toBe(true);
    expect(mediaSignatureMatches("image/png", new Uint8Array([137,80,78,71,13,10,26,10]))).toBe(true);
    expect(mediaSignatureMatches("image/jpeg", new TextEncoder().encode("<html>"))).toBe(false);
    expect(mediaSignatureMatches("video/mp4", new Uint8Array([0,0,0,24,...new TextEncoder().encode("ftypisom")]))).toBe(true);
    expect(mediaSignatureMatches("video/webm", new Uint8Array([26,69,223,163]))).toBe(true);
  });
  it("supports video byte ranges, suffixes, and rejects malformed or unsatisfiable ranges", () => {
    expect(parseMediaRange(null, 100)).toBe(null);
    expect(parseMediaRange("bytes=0-1", 100)).toEqual({ start: 0, end: 1 });
    expect(parseMediaRange("bytes=10-", 100)).toEqual({ start: 10, end: 99 });
    expect(parseMediaRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(parseMediaRange("bytes=90-200", 100)).toEqual({ start: 90, end: 99 });
    for (const range of ["bytes=100-", "bytes=10-2", "bytes=-0", "bytes=", "bytes=0-1,2-3", "bytes=90071992547409999-", "invalid"]) expect(parseMediaRange(range,100)).toBe(false);
  });
});
