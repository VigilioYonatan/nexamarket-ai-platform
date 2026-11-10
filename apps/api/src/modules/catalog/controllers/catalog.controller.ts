import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { parseUuid } from "../../../shared/http.js";
import type { CatalogQueryDto } from "../dtos/catalog.dto.js";
import { CatalogService } from "../services/catalog.service.js";

@Controller("api/v1")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("products")
  list(@Query() q: CatalogQueryDto) {
    return this.catalog.list(q);
  }

  @Get("products/:id")
  detail(@Param("id") id: string) {
    return this.catalog.detail(parseUuid(id));
  }

  @Get("categories")
  categories() {
    return this.catalog.categories();
  }

  @Get("search")
  search(@Query() q: CatalogQueryDto) {
    return this.catalog.list(q);
  }

  @Get("sellers/:id/profile")
  async profile(@Param("id") id: string) {
    const s = await this.catalog.sellerPublic(parseUuid(id));
    if (!s) throw new NotFoundException();
    return s;
  }
}
