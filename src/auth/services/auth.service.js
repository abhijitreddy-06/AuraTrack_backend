import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { User } from "../models/auth.model.js";
import { RefreshToken } from "../models/refreshToken.model.js";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = 30;
const BCRYPT_SALT_ROUNDS = 12;
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET;

if (!JWT_SECRET) {
  throw new Error("jwt secret not configured");
}

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
};

const sessionUser = (user) => ({
  id: user.id,
  fullname: user.fullname,
  email: user.email,
  app_lock_enabled: user.app_lock_enabled,
});

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

const hashRefreshToken = (refreshToken) => {
  return crypto.createHash("sha256").update(refreshToken).digest("hex");
};

const getRefreshTokenExpiry = () => {
  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN);

  return expiresAt;
};

const createAuthenticatedSession = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = getRefreshTokenExpiry();

  await RefreshToken.create({
    user_id: user.id,
    token: tokenHash,
    expires_at: expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    user: sessionUser(user),
  };
};

export const register = async ({ fullname, email, password }) => {
  if (!fullname || !email || !password) {
    const error = new Error("Full name, email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedFullname = fullname.trim();

  if (password.length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    const error = new Error("Email is already registered");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await User.create({
    fullname: normalizedFullname,
    email: normalizedEmail,
    password: passwordHash,
  });

  return await createAuthenticatedSession(user);
};

export const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }
  return await createAuthenticatedSession(user);
};

export const refreshToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    const error = new Error("Refresh token is required");
    error.statusCode = 401;
    throw error;
  }

  const tokenHash = hashRefreshToken(incomingRefreshToken);
  const storedToken = await RefreshToken.findOne({
    where: {
      token: tokenHash,
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "fullname", "email", "app_lock_enabled"],
      },
    ],
  });

  if (!storedToken) {
    const error = new Error("Invalid refresh token");
    error.statusCode = 401;
    throw error;
  }

  if (storedToken.revoked == true) {
    const error = new Error("Refresh token has been revoked");
    error.statusCode = 401;
    throw error;
  }

  if (new Date(storedToken.expires_at) <= new Date()) {
    await storedToken.update({
      revoked: true,
    });

    const error = new Error("Refresh token expired");
    error.statusCode = 401;
    throw error;
  }

  const user = storedToken.user;

  if (!user) {
    const error = new Error("User associated with refresh token was not found");
    error.statusCode = 401;
    throw error;
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashRefreshToken(newRefreshToken);
  const newExpiresAt = getRefreshTokenExpiry();

  await storedToken.update({
    revoked: true,
  });

  await RefreshToken.create({
    user_id: user.id,
    token: newTokenHash,
    expires_at: newExpiresAt,
    revoked: false,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: sessionUser(user),
  };
};

export const logout = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(incomingRefreshToken);

  const storedToken = await RefreshToken.findOne({
    where: {
      token: tokenHash,
    },
  });

  if (!storedToken) {
    return;
  }
  
  if (storedToken.revoked == false) {
    await storedToken.update({
      revoked: true,
    });
  }
};
