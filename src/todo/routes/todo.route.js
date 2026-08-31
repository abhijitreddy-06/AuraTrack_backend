import express from "express";
import { createTodo, deleteTodo, getTodos, updateTodo } from "../controllers/todo.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getTodos);
router.post("/", protect, createTodo);
router.patch("/:id", protect, updateTodo);
router.delete("/:id", protect, deleteTodo);

export default router;
