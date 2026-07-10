import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  Controller,
  Injectable,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import sharp from "sharp";
import { PgStore } from "../infrastructure/db.js";
import {
  AdminGuard,
  CurrentUser,
  type Principal,
  SellerGuard,
  SessionGuard,
} from "../shared/http.js";

const filer = process.env.SEAWEED_FILER_URL ?? "http://seaweedfs:8888";
const uploadOptions = {
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
@Injectable()
export class MediaService {
  constructor(private readonly db: PgStore) {}
  async upload(
    file: Express.Multer.File | undefined,
    owner_id: string,
    kind: "brand" | "products",
  ) {
    if (!file?.buffer) throw new BadRequestException({ code: "IMAGE_REQUIRED" });
    let output: Buffer;
    try {
      const image = sharp(file.buffer, { limitInputPixels: 20_000_000 });
      const meta = await image.metadata();
      if (!["jpeg", "png", "webp"].includes(meta.format ?? "")) throw new Error("BAD_IMAGE_FORMAT");
      output = await image
        .rotate()
        .resize({
          width: kind === "brand" ? 512 : 1600,
          height: kind === "brand" ? 512 : 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      throw new BadRequestException({ code: "INVALID_IMAGE" });
    }
    const id = randomUUID();
    const path = `${kind}/${id}.webp`;
    const data = new FormData();
    data.append("file", new Blob([Uint8Array.from(output)], { type: "image/webp" }), `${id}.webp`);
    const response = await fetch(`${filer}/${path}`, {
      method: "POST",
      body: data,
      signal: AbortSignal.timeout(10000),
    }).catch(() => undefined);
    if (!response?.ok) throw new ServiceUnavailableException({ code: "MEDIA_STORAGE_UNAVAILABLE" });
    await this.db.query(
      "INSERT INTO media_assets(id,owner_user_id,kind,path,mime_type,size_bytes) VALUES($1,$2,$3,$4,$5,$6)",
      [id, owner_id, kind, path, "image/webp", output.length],
    );
    return { id, url: `/media/${path}`, mime_type: "image/webp", size_bytes: output.length };
  }
}
@Controller(["api/v1/admin/assets", "api/v1/admin/media/brand"])
@UseGuards(SessionGuard, AdminGuard)
export class AdminMediaController {
  constructor(private readonly media: MediaService) {}
  @Post() @UseInterceptors(FileInterceptor("file", uploadOptions)) upload(
    @CurrentUser() p: Principal,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.media.upload(file, p.user_id, "brand");
  }
}
@Controller("api/v1/seller/media")
@UseGuards(SessionGuard, SellerGuard)
export class SellerMediaController {
  constructor(private readonly media: MediaService) {}
  @Post() @UseInterceptors(FileInterceptor("file", uploadOptions)) upload(
    @CurrentUser() p: Principal,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.media.upload(file, p.user_id, "products");
  }
}
