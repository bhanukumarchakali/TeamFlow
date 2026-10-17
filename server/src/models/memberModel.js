import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
  },
  {
    timestamps: true,
  },
);
memberSchema.index({ workspace: 1, user: 1 }, { unique: true });
const member = mongoose.model("member", memberSchema);

export default member;
