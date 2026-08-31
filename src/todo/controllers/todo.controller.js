import * as todoService from "../services/todo.service.js";

export const getTodos = async (req, res, next) => {
  try {
    res
      .status(200)
      .json({ success: true, data: await todoService.getTodos(req.user.id) });
  } catch (error) {
    next(error);
  }
};

export const createTodo = async (req, res, next) => {
  try {
    const todo = await todoService.createTodo(req.user.id, req.body);
    res
      .status(201)
      .json({
        success: true,
        message: "Task created successfully",
        data: todo,
      });
  } catch (error) {
    next(error);
  }
};

export const updateTodo = async (req, res, next) => {
  try {
    const todo = await todoService.updateTodo(
      req.user.id,
      req.params.id,
      req.body,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Task updated successfully",
        data: todo,
      });
  } catch (error) {
    next(error);
  }
};

export const deleteTodo = async (req, res, next) => {
  try {
    await todoService.deleteTodo(req.user.id, req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
};
