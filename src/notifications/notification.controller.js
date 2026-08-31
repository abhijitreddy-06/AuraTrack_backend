import { registerPushToken, unregisterPushToken } from "./notification.service.js";

export const savePushToken = async (req, res, next) => {
  try {
    await registerPushToken(req.user.id, req.body.token);
    res.status(200).json({ success: true });
  } catch (error) { next(error); }
};

export const removePushToken = async (req, res, next) => {
  try {
    await unregisterPushToken(req.user.id, req.body.token);
    res.status(204).send();
  } catch (error) { next(error); }
};
