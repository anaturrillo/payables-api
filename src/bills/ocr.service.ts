import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { extname } from "path";

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const EXT_TO_MEDIA: Record<string, ImageMediaType> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".gif":  "image/gif",
  ".webp": "image/webp",
};

export interface ExtractedInvoice {
  invoiceNumber: string | null;
  vendor: string | null;
  totalAmount: number | null;
  invoiceDate: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
}

@Injectable()
export class OcrService {
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async extractInvoice(filePath: string): Promise<ExtractedInvoice | null> {
    try {
      const ext = extname(filePath).toLowerCase();
      const mediaType = EXT_TO_MEDIA[ext];
      if (!mediaType) return null;

      const base64 = readFileSync(filePath).toString("base64");

      const response = await this.client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            {
              type: "text",
              text: `Extract invoice data from this image. Return ONLY a valid JSON object with this exact structure, no markdown, no extra text:
{"invoiceNumber":string|null,"vendor":string|null,"totalAmount":number|null,"invoiceDate":"YYYY-MM-DD"|null,"dueDate":"YYYY-MM-DD"|null,"paymentDate":"YYYY-MM-DD"|null,"lineItems":[{"description":string,"quantity":number,"unitPrice":number,"total":number}]}
Rules: amounts are plain numbers (no currency symbols), dates in YYYY-MM-DD format, missing fields are null, lineItems lists every product or service on the invoice.`,
            },
          ],
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
      const jsonText = text.startsWith("{") ? text : text.slice(text.indexOf("{"));
      return JSON.parse(jsonText) as ExtractedInvoice;
    } catch {
      return null;
    }
  }
}
