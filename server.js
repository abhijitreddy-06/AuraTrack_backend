import "dotenv/config";

import app from "./src/app.js";
import sequelize from "./src/config/database.js";
import { deleteExpiredTodos } from "./src/todo/services/todo.service.js";
import { startNotificationScheduler } from "./src/notifications/notification.scheduler.js";

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");
    await deleteExpiredTodos();
    startNotificationScheduler();

    const server = app.listen(PORT, HOST, () => {
      console.log(`AuraTrack backend listening on port ${PORT}`);
    });
    
  } catch (error) {
    console.error("Unable to start AuraTrack backend:", error);
    process.exit(1);
  }
};

startServer();
