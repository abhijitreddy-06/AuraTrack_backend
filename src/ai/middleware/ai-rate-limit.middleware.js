import rateLimit from "express-rate-limit";

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id || req.headers["x-user-id"] || "anonymous";
    return `ai:${userId}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "AI rate limit exceeded. Max 20 requests per minute per user.",
    });
  },
});
