import { Module } from "@nestjs/common";
import { AccountController } from "./controllers/account.controller.js";
import { AccountService } from "./services/account.service.js";

@Module({
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
