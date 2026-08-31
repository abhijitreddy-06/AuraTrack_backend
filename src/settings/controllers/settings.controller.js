import * as settingsService from "../services/settings.service.js";

export const getSettings = async (req, res, next) => {
  try {
    const user = await settingsService.getSettings(req.user.id);
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

export const updateTheme = async (req, res, next) => {
  try {
    const themePreference = await settingsService.updateTheme(
      req.user.id,
      req.body.themePreference,
    );
    res.status(200).json({ success: true, data: { themePreference } });
  } catch (err) {
    next(err);
  }
};

export const updateAppLock = async (req, res, next) => {
  try {
    const appLockEnabled = await settingsService.updateAppLock(
      req.user.id,
      req.body.appLockEnabled,
    );
    res.status(200).json({ success: true, data: { appLockEnabled } });
  } catch (err) {
    next(err);
  }
};

export const updateEmail = async (req, res, next) => {
  try {
    const email = await settingsService.updateEmail(
      req.user.id,
      req.body.currentEmail,
      req.body.newEmail,
    );
    res.status(200).json({ success: true, data: { email } });
  } catch (err) {
    next(err);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    await settingsService.updatePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    await settingsService.deleteAccount(req.user.id, req.body.password);
    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
