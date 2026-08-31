import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

export const NotificationLog = sequelize.define(
  "NotificationLog",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, references: { model: "Users", key: "id" } },
    type: { type: DataTypes.STRING(40), allowNull: false },
    reminder_date: { type: DataTypes.DATEONLY, allowNull: false },
    sent_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "notification_logs",
    timestamps: false,
    indexes: [{ unique: true, fields: ["user_id", "type", "reminder_date"] }],
  },
);

NotificationLog.belongsTo(User, { foreignKey: "user_id", as: "user" });
