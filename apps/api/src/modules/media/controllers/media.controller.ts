import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  AdminGuard,
  CurrentUser,
  type Principal,
  SellerGuard,
  SessionGuard,
} from "../../../shared/http.js";
import { uploadOptions } from "../dtos/media.dto.js";
import { MediaService } from "../services/media.service.js";

@Controller(["api/v1/admin/assets", "api/v1/admin/media/brand"])
@UseGuards(SessionGuard, AdminGuard)
export class AdminMediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  upload(
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

  @Post()
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  upload(
    @CurrentUser() p: Principal,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.media.upload(file, p.user_id, "products");
  }
}
