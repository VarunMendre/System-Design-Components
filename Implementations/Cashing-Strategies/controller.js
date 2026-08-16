import Task from "./schema.js";

export const createTodos = async (req, res, next) => {
  const { title, description, isCompleted, priority, dueDate } = req.body;

  if (!title || !description) {
    return res
      .status(422)
      .json({ message: "title & description fields are required" });
  }

  try {
    await Task.insertOne({
      title,
      description,
      isCompleted,
      priority,
      dueDate,
    });

    res.status(201).json({ message: "record created successfully" });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Failed to create task",
      error: err.message,
    });
  }
};

export const getAllTodos = async (req, res, next) => {
  const queryObj = { ...req.query };

  const excludedFields = ["page", "limit", "sort", "q"];
  excludedFields.forEach((item) => delete queryObj[item]);

  if (queryObj.isCompleted) {
    queryObj.isCompleted = queryObj.isCompleted === "true";
  }

  try {
    let query = Task.find(queryObj);

    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 5;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    const todos = await query;

    res.status(200).json({
      success: true,
      count: todos.length,
      page,
      limit,
      data: todos,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const getSingleTodo = async (req, res, next) => {
  const todoId = req.params;

  if (!todoId) {
    return res.status(442).json({ message: "request params is missing" });
  }

  try {
    const data = await Task.findOne({ _id: todoId.id });
    return res.status(200).json({ success: true, details: data });
  } catch (err) {
    return res.status(404).json({ success: false, message: err });
  }
  res.json({ data: params });
};

export const updateSingleTodo = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(442).json({ message: "request params is missing" });
  }

  const { title, description, isCompleted, priority, dueDate } = req.body;

  if (!title || !description) {
    return res
      .status(422)
      .json({ message: "title & description fields are required" });
  }

  try {
    const todo = await Task.findOneAndUpdate(
      { _id: id },
      { title, description, isCompleted, priority, dueDate },
      { $upsert: true },
    );

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    return res.status(200).json({ updated: true, data: todo });
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};

export const deleteSingleTodo = async (req, res, next) => {
  const { id } = req.params;

  if (!id)
    return res.status(442).json({ message: "request parameter is missing " });

  try {
    const deletedTodo = await Task.findOneAndDelete({ _id: id });

    if (!deletedTodo) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res
      .status(200)
      .json({ message: "Task deleted successfully", data: deletedTask });
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};
