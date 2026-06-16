import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import type { Request, Response, NextFunction } from "express";

async function bootstrap() {
  const uploadsDir = join(process.cwd(), "uploads");
  mkdirSync(uploadsDir, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors();
  app.useStaticAssets(uploadsDir, { prefix: "/uploads" });

  const publicDir = join(process.cwd(), "public");
  if (existsSync(publicDir)) {
    app.useStaticAssets(publicDir);

    const indexHtml = join(publicDir, "index.html");
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) next();
      else res.sendFile(indexHtml);
    });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}

bootstrap();
