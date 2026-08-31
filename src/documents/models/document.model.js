import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

export const Document = sequelize.define(
  "Document",
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

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: [1, 200] },
    },

    original_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    mime_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    storage_path: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    encrypted_key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "documents",
    timestamps: false,
  },
);

Document.belongsTo(User, { foreignKey: "user_id", as: "user" });
