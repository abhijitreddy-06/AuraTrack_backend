import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const ExpoReceipt = sequelize.define(
  "ExpoReceipt",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ticket_id: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    token: { type: DataTypes.STRING(255), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    checked_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "expo_push_receipts", timestamps: false },
);
