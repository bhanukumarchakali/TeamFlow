import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
    },

    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({
  workspace: 1,
  updatedAt: -1,
});

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
