import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type Principal, parseUuid, SessionGuard, ZodPipe } from "../../../shared/http.js";
import { type AddCartDto, addCartDto, editCartDto } from "../dtos/cart.dto.js";
import { CartService } from "../services/cart.service.js";

@Controller("api/v1/cart")
@UseGuards(SessionGuard)
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Get()
  get(@CurrentUser() p: Principal) {
    return this.carts.get(p.user_id);
  }

  @Post("items")
  add(
    @CurrentUser() p: Principal,
    @Body(new ZodPipe(addCartDto)) input: AddCartDto,
  ) {
    return this.carts.add(p.user_id, input);
  }

  @Patch("items/:id")
  change(
    @CurrentUser() p: Principal,
    @Param("id") id: string,
    @Body(new ZodPipe(editCartDto)) input: { quantity: number },
  ) {
    return this.carts.change(p.user_id, parseUuid(id), input.quantity);
  }

  @Delete("items/:id")
  remove(@CurrentUser() p: Principal, @Param("id") id: string) {
    return this.carts.remove(p.user_id, parseUuid(id));
  }
}
