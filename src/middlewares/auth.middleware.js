import jwt from "jsonwebtoken";
import { User } from "../auth/models/auth.model.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET) {
  throw new Error("Access token secret not configured");
}

const verifyAcessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (err) {
    return null;
  }
};

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme != "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized : No access token",
    });
  }

  const decoded = verifyAcessToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized invalid token",
    });
  }

  const user = await User.findByPk(decoded.userId, {
    attributes: ["id", "fullname", "email", "app_lock_enabled"],
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized user not found",
    });
  }

  req.user = user;

  next();
};

export default protect;
