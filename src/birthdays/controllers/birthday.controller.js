import * as birthdayService from "../services/birthday.service.js";

export const getBirthdays = async (req, res, next) => {
  try {
    const birthdays = await birthdayService.getBirthdays(req.user.id);

    res.status(200).json({
      success: true,
      data: birthdays,
    });
  } catch (error) {
    next(error);
  }
};

export const createBirthday = async (req, res, next) => {
  try {
    const birthday = await birthdayService.createBirthday(
      req.user.id,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Birthday created successfully",
      data: birthday,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBirthday = async (req, res, next) => {
  try {
    const birthday = await birthdayService.updateBirthday(
      req.user.id,
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Birthday updated successfully",
      data: birthday,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBirthday = async (req, res, next) => {
  try {
    await birthdayService.deleteBirthday(req.user.id, req.params.id);

    res.status(200).json({
      success: true,
      message: "Birthday deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
