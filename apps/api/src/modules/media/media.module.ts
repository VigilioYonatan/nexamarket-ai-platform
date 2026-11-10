import { Module } from "@nestjs/common";
import { AdminMediaController, SellerMediaController } from "./controllers/media.controller.js";
import { MediaService } from "./services/media.service.js";

@Module({
  controllers: [AdminMediaController, SellerMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
