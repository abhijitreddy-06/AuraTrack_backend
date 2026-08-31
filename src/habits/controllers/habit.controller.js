import * as habitService from "../services/habit.service.js";

export const getHabits = async (req, res, next) => {
  try {
    const habits = await habitService.getHabits(req.user.id);
    res.status(200).json({ success: true, data: habits });
  } catch (error) {
    next(error);
  }
};

export const createHabit = async (req, res, next) => {
  try {
    const habit = await habitService.createHabit(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: "Habit created successfully",
      data: habit,
    });
  } catch (error) {
    next(error);
  }
};

export const completeHabit = async (req, res, next) => {
  try {
    const habit = await habitService.completeHabit(req.user.id, req.params.id);
    res.status(200).json({
      success: true,
      message: "Habit marked as completed",
      data: habit,
    });
  } catch (error) {
    next(error);
  }
};

export const updateHabit = async (req, res, next) => {
  try {
    const habit = await habitService.updateHabit(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.status(200).json({
      success: true,
      message: "Habit updated successfully",
      data: habit,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHabit = async (req, res, next) => {
  try {
    await habitService.deleteHabit(req.user.id, req.params.id);
    res.status(200).json({
      success: true,
      message: "Habit deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
