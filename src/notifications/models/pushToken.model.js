import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

export const PushToken = sequelize.define(
  "PushToken",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, references: { model: "Users", key: "id" } },
    token: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: "push_tokens", timestamps: false },
);

PushToken.belongsTo(User, { foreignKey: "user_id", as: "user" });
