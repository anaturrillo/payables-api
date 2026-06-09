import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, NotFoundException, BadRequestException } from "@nestjs/common";
import { ProductsService } from "./products.service";
import type { CreateProductDto, UpdateProductDto } from "../models/product.model";

@Controller("products")
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  list(@Query("search") search?: string) {
    return this.service.list(search);
  }

  @Post()
  create(@Body() body: CreateProductDto) {
    if (!body.name || !body.status) {
      throw new BadRequestException("name and status are required");
    }
    return this.service.create({
      name: body.name,
      aliases: body.aliases ?? [],
      description: body.description ?? "",
      status: body.status,
    });
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: UpdateProductDto) {
    const item = this.service.update(id, body);
    if (!item) throw new NotFoundException("Product not found");
    return item;
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    if (!this.service.delete(id)) throw new NotFoundException("Product not found");
  }
}
