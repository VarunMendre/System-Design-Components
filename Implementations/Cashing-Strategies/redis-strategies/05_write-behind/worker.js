import redisClient from "../../config/redis.js";
import Task from "../../schema.js";

const QUEUE_KEY = "write-behind:queue";

console.log("Write-behind worker started");

while (true) {
  try {
    const result = await redisClient.brPop(QUEUE_KEY, 0);

    if (!result) continue;

    const operation = JSON.parse(result.element);

    console.log(`Processing ${operation.operation} operation`);

    // CREATE
    if (operation.operation === "CREATE") {
      await Task.create(operation.todo);

      console.log(`MongoDB CREATE completed: ${operation.todo._id}`);
    } else if (operation.operation === "UPDATE") {
      await Task.findByIdAndUpdate(operation.todo._id, operation.todo, {
        new: true,
        upsert: true,
        runValidators: true,
      });

      console.log(`MongoDB UPDATE completed: ${operation.todo._id}`);
    } else if (operation.operation === "DELETE") {
      await Task.findByIdAndDelete(operation.todoId);

      console.log(`MongoDB DELETE completed: ${operation.todoId}`);
    } else {
      console.error("Unknown write-behind operation:", operation.operation);
    }
  } catch (err) {
    console.error("Write-behind worker error:", err.message);
  }
}
