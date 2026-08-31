import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

export const PlannedExpense = sequelize.define(
  "PlannedExpense",
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
      allowNull: true,
    },
  },
  { tableName: "planned_expenses", timestamps: false },
);

PlannedExpense.belongsTo(User, { foreignKey: "user_id", as: "user" });
