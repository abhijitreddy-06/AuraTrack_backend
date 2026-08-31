import { getAnalytics } from "../services/analytics.service.js";

export const analytics = async (req, res, next) => {
  try {
    const data = await getAnalytics(req.user.id, req.query.period);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
