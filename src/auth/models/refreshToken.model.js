import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "./auth.model.js";

export const RefreshToken = sequelize.define(
  "RefreshToken",
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

    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "refresh_tokens",
    timestamps: false,
  },
);

RefreshToken.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});
