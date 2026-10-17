import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: [
        "task_created",
        "task_updated",
        "task_assigned",
        "task_moved",
        "task_deleted",
        "comment_created",
        "comment_deleted",
      ],
      required: true,
    },

    details: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true },
);
activitySchema.index({
  project: 1,
  createdAt: -1,
});

activitySchema.index({
  task: 1,
  createdAt: -1,
});

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
