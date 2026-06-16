import { Injectable } from "@nestjs/common";
import type { Product } from "../models/product.model";
import type { ExtractedInvoice } from "./ocr.service";

export interface MatchedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  matchedProductId: string | null;
  matchedProductName: string | null;
  matchedProductCategory: string | null;
}

@Injectable()
export class BillsService {
  matchProducts(items: ExtractedInvoice["lineItems"], products: Product[]): MatchedLineItem[] {
    return items.map((item) => {
      const desc = item.description.toLowerCase().trim();
      const matched = products.find((p) => {
        const name = p.name.toLowerCase();
        const aliases = p.aliases.map((a) => a.toLowerCase());
        return (
          name === desc ||
          aliases.includes(desc) ||
          desc.includes(name) ||
          name.includes(desc) ||
          aliases.some((a) => desc.includes(a) || a.includes(desc))
        );
      });
      return {
        ...item,
        matchedProductId:       matched?.id ?? null,
        matchedProductName:     matched?.name ?? null,
        matchedProductCategory: matched?.category ?? null,
      };
    });
  }
}
