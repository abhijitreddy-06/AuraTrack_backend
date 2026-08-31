import * as service from "../services/password.service.js";

export const getPasswords = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: await service.getPasswordEntries(req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

export const getPasswordSecret = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: await service.getPasswordSecret(req.user.id, req.params.id),
    });
  } catch (error) {
    next(error);
  }
};

export const createPassword = async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await service.createPasswordEntry(req.user.id, req.body),
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: await service.updatePasswordEntry(
        req.user.id,
        req.params.id,
        req.body,
      ),
    });
  } catch (error) {
    next(error);
  }
};

export const deletePassword = async (req, res, next) => {
  try {
    await service.deletePasswordEntry(req.user.id, req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
