import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

export const PasswordEntry = sequelize.define(
  "PasswordEntry",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "Users", key: "id" },
    },

    title: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { len: [1, 200] },
    },

    key_: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    value_: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  { tableName: "passwords", timestamps: false },
);

PasswordEntry.belongsTo(User, { foreignKey: "user_id", as: "user" });
