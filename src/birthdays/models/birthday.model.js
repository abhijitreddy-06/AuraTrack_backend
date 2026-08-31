import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

export const Birthday = sequelize.define(
  "Birthday",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },

    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "birthdays",
    timestamps: false,
  },
);

Birthday.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});
