import { PrismaClient } from "@prisma/client";
import { databaseConfig } from "../config/database.config.js";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: [...databaseConfig.log],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
