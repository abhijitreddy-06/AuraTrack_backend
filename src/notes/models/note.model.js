import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

export const Note = sequelize.define(
  "Note",
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

    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "notes",
    timestamps: false,
  },
);

Note.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});
