import dotenv from "dotenv";
dotenv.config();

import Redis from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
});

redis.on("connect", () => {});

redis.on("error", (error) => {
  console.error("Redis connection error", { error });
});
