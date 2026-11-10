import { memoryStorage } from "multer";

export const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (err: Error | null, acceptFile: boolean) => void,
  ) => {
    const valid = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(valid ? null : new Error("INVALID_IMAGE_TYPE"), valid);
  },
};
