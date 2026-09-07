import { registerPushToken, unregisterPushToken } from "./notification.service.js";

export const savePushToken = async (req, res, next) => {
  try {
    await registerPushToken(req.user.id, req.body.token);
    res.status(200).json({ success: true });
  } catch (error) {
    // Keep diagnostics useful without ever logging a device push token, JWT,
    // or database connection details.
    console.error("Push token registration failed", {
      userId: req.user?.id ?? null,
      errorType: error.name || "Error",
      status: error.statusCode || 500,
    });
    next(error);
  }
};

export const removePushToken = async (req, res, next) => {
  try {
    await unregisterPushToken(req.user.id, req.body.token);
    res.status(204).send();
  } catch (error) { next(error); }
};
