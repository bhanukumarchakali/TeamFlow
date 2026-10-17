import mongoose from "mongoose";

const conversationMemberSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

conversationMemberSchema.index(
  { conversation: 1, user: 1 },
  { unique: true },
);

const conversationMember = mongoose.model(
  "ConversationMember",
  conversationMemberSchema,
);

export default conversationMember;