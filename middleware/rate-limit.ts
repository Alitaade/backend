import type { NextApiResponse } from "next";
import { LRUCache } from "lru-cache";

type Options = {
  interval: number;
  uniqueTokenPerInterval: number;
  limit: number;
};

export default function rateLimit({
  interval,
  uniqueTokenPerInterval,
  limit,
}: Options) {
  const tokenCache = new LRUCache({
    max: uniqueTokenPerInterval,
    ttl: interval,
  });

  return {
    check: (res: NextApiResponse, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;
        res.setHeader("X-RateLimit-Limit", limit);
        res.setHeader(
          "X-RateLimit-Remaining",
          isRateLimited ? 0 : limit - currentUsage
        );

        if (isRateLimited) {
          res.status(429).json({ error: "Rate limit exceeded" });
          reject();
        } else {
          resolve();
        }
      }),
  };
}
