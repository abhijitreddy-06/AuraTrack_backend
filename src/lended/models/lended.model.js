import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

export const Lended = sequelize.define(
  "Lended",
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

    person_name: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { len: [1, 200] },
    },

    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    time: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  { tableName: "lended", timestamps: false },
);

Lended.belongsTo(User, { foreignKey: "user_id", as: "user" });
