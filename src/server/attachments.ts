// Attachment multipart upload parser: streams via busboy into storage.saveObject (driver-agnostic: local disk or S3-compatible).
import Busboy from "busboy";
import type { IncomingMessage } from "node:http";
import { saveObject } from "./storage.js";

export interface UploadedFile { filename: string; mimeType: string; size: number; storageKey: string }

export function parseUpload(req: IncomingMessage): Promise<{ fields: Record<string, string>; files: UploadedFile[] }> {
  return new Promise((resolve, reject) => {
    let bb: ReturnType<typeof Busboy>;
    try { bb = Busboy({ headers: req.headers, limits: { fileSize: 25 * 1024 * 1024, files: 10 } }); }
    catch (e) { return reject(e); }
    const fields: Record<string, string> = {};
    const files: UploadedFile[] = [];
    const pending: Promise<void>[] = [];
    bb.on("field", (name, val) => { fields[name] = val; });
    bb.on("file", (_name, stream, info) => {
      pending.push(saveObject(info.filename || "file", stream).then(({ key, size }) => {
        files.push({ filename: info.filename || "file", mimeType: info.mimeType || "application/octet-stream", size, storageKey: key });
      }));
    });
    bb.on("close", () => { Promise.all(pending).then(() => resolve({ fields, files })).catch(reject); });
    bb.on("error", reject);
    req.pipe(bb);
  });
}
