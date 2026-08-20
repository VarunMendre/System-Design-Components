import { deleteTodoCache, getTodoCache, setTodoCache } from "./cache.js";
import  Task  from "../../schema.js";

export const getTodo = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Todo ID is required",
    });
  }

  try {
    // 1. Check Redis

    const cachedTodo = await getTodoCache(id);

    if (cachedTodo) {
      console.log("Cache Hit");

      return res.status(200).json({
        success: true,
        source: "redis",
        data: cachedTodo,
      });
    }

    console.log("Cache Miss");

    // 2. Query MongoDB

    const todo = await Task.findById(id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    // 3. Store in Redis

    await setTodoCache(todo);

    // 4. Return response

    return res.status(200).json({
      success: true,
      source: "mongodb",
      data: todo,
    });
  } catch (err) {
    console.error("Get Todo Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const createTodo = async (req, res) => {
  const { title, description, isCompleted, priority, dueDate } = req.body;

  if (!title || !description) {
    return res.status(422).json({
      message: "title & description fields are required",
    });
  }

  try {
    // 1. Write to MongoDB

    const todo = await Task.create({
      title,
      description,
      isCompleted,
      priority,
      dueDate,
    });

    // 2. Write the same data to Redis

    await setTodoCache(todo);

    /*
     * This is the important part of Write-Through.
     *
     * MongoDB was updated AND Redis was updated
     * during the same write operation.
     */

    return res.status(201).json({
      success: true,
      message: "Todo created successfully",
      source: "mongodb + redis",
      data: todo,
    });
  } catch (err) {
    console.error("Create Todo Error:", err);

    return res.status(400).json({
      success: false,
      message: "Failed to create task",
      error: err.message,
    });
  }
};

export const updateTodo = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Todo ID is required",
    });
  }

  const { title, description, isCompleted, priority, dueDate } = req.body;

  if (!title || !description) {
    return res.status(422).json({
      message: "title & description fields are required",
    });
  }

  try {
    // 1. Update MongoDB

    const updatedTodo = await Task.findByIdAndUpdate(
      id,
      {
        title,
        description,
        isCompleted,
        priority,
        dueDate,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedTodo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    // 2. Update Redis with latest data

    await setTodoCache(updatedTodo);

    /*
     * We don't delete the cache.
     *
     * We replace the cached value with the newly
     * updated TODO.
     */

    return res.status(200).json({
      success: true,
      message: "Todo updated successfully",
      source: "mongodb + redis",
      data: updatedTodo,
    });
  } catch (err) {
    console.error("Update Todo Error:", err);

    return res.status(400).json({
      success: false,
      message: "Failed to update task",
      error: err.message,
    });
  }
};

export const deleteTodo = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Todo ID is required",
    });
  }

  try {
    // 1. Delete from MongoDB

    const deletedTodo = await Task.findByIdAndDelete(id);

    if (!deletedTodo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    // 2. Remove from Redis

    await deleteTodoCache(id);

    /*
     * The TODO no longer exists in MongoDB,
     * therefore it must not remain in Redis.
     */

    return res.status(200).json({
      success: true,
      message: "Todo deleted successfully",
      source: "mongodb + redis",
      data: deletedTodo,
    });
  } catch (err) {
    console.error("Delete Todo Error:", err);

    return res.status(400).json({
      success: false,
      message: "Failed to delete task",
      error: err.message,
    });
  }
};
