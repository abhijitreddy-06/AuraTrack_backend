import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

export const Todo = sequelize.define(
  "Todo",
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

    start_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },

    end_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  { tableName: "todo", timestamps: false },
);

Todo.belongsTo(User, { foreignKey: "user_id", as: "user" });
