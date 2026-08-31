import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { User } from "../../auth/models/auth.model.js";

export const Habit = sequelize.define(
  "Habit",
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

    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    current_streak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    longest_streak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    missed_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    today_done: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    last_completed_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    last_processed_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  { tableName: "habits", timestamps: false },
);

Habit.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

export const HabitCompletion = sequelize.define(
  "HabitCompletion",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    habit_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "habits",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    
    completed_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "habit_completions",
    timestamps: false,

    indexes: [
      {
        unique: true,
        fields: ["habit_id", "completed_date"],
      },
    ],
  },
);

Habit.hasMany(HabitCompletion, {
  foreignKey: "habit_id",
  as: "completions",
});

HabitCompletion.belongsTo(Habit, {
  foreignKey: "habit_id",
  as: "habit",
});
