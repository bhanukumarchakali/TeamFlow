import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";

export const sendMessage = async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;
    const { content, messageType, attachmentUrl, attachmentName, replyTo } =
      req.body;

    if (!content && !attachmentUrl) {
      return res.status(400).json({
        success: false,
        message: "Message content or attachment is required",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.userId,
      content: content || "",
      messageType: messageType || "text",
      attachmentUrl: attachmentUrl || null,
      attachmentName: attachmentName || null,
      replyTo: replyTo || null,
    });

    await message.populate([
      {
        path: "sender",
        select: "firstName lastName email avatar",
      },
      {
        path: "replyTo",
        select:
          "content messageType attachmentUrl attachmentName sender createdAt",
        populate: {
          path: "sender",
          select: "firstName lastName",
        },
      },
    ]);

    conversation.updatedAt = new Date();

    await conversation.save();

    const io = req.app.get("io");

    io.to(`workspace:${workspaceId}`).emit("messageCreated", {
      conversationId,
      message,
    });
    const otherMembers = conversation.members.filter(
      (memberId) => memberId.toString() !== req.user.userId,
    );

    otherMembers.forEach((memberId) => {
      io.to(`user:${memberId}`).emit("chatNotification", {
        conversationId,
        message,
      });
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;

    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const skip = (page - 1) * limit;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false,
    })
      .populate("sender", "firstName lastName email avatar")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);

    const totalMessages = await Message.countDocuments({
      conversation: conversationId,
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
        hasMore: skip + messages.length < totalMessages,
      },
    });
  } catch (error) {
    console.error("Get conversation messages error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversation messages",
    });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const message = await Message.findOne({
      _id: messageId,
      conversation: conversationId,
      sender: req.user.userId,
      isDeleted: false,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    message.content = content.trim();
    message.isEdited = true;

    await message.save();

    await message.populate("sender", "firstName lastName email avatar");

    const io = req.app.get("io");

    io.to(`workspace:${conversation.workspace}`).emit("messageUpdated", {
      conversationId,
      message,
    });

    return res.status(200).json({
      success: true,
      message: "Message updated successfully",
      data: message,
    });
  } catch (error) {
    console.error("Edit message error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to edit message",
    });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const message = await Message.findOne({
      _id: messageId,
      conversation: conversationId,
      sender: req.user.userId,
      isDeleted: false,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    message.isDeleted = true;
    message.content = "";

    await message.save();

    const io = req.app.get("io");

    io.to(`workspace:${conversation.workspace}`).emit("messageDeleted", {
      conversationId,
      messageId,
    });

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const unreadMessages = await Message.find({
      conversation: conversationId,
      sender: { $ne: req.user.userId },
      isRead: false,
      isDeleted: false,
    }).select("_id");

    const messageIds = unreadMessages.map((message) => message._id);

    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );
    const io = req.app.get("io");
    console.log("Emitting messageRead:", {
      workspaceId,
      conversationId,
      userId: req.user.userId,
      messageIds,
    });

    io.to(`workspace:${workspaceId}`).emit("messageRead", {
      conversationId,
      userId: req.user.userId,
      messageIds,
    });
    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark messages as read error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
    });
  }
};

export const getUnreadMessageCount = async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const unreadCount = await Message.countDocuments({
      conversation: conversationId,
      sender: { $ne: req.user.userId },
      isRead: false,
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Get unread message count error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get unread message count",
    });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspace: workspaceId,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
      content: {
        $regex: q.trim(),
        $options: "i",
      },
      isDeleted: false,
    })
      .populate("sender", "firstName lastName email avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error("Search messages error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to search messages",
    });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: "Emoji is required",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const conversation = await Conversation.findOne({
      _id: message.conversation,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const existingReaction = message.reactions.find(
      (reaction) => reaction.user.toString() === req.user.userId,
    );

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        message.reactions = message.reactions.filter(
          (reaction) => reaction.user.toString() !== req.user.userId,
        );
      } else {
        existingReaction.emoji = emoji;
      }
    } else {
      message.reactions.push({
        user: req.user.userId,
        emoji,
      });
    }

    await message.save();

    await message.populate("reactions.user", "firstName lastName avatar");

    const io = req.app.get("io");

    io.to(`workspace:${conversation.workspace}`).emit(
      "messageReactionUpdated",
      {
        conversationId: conversation._id,
        messageId: message._id,
        reactions: message.reactions,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Reaction updated successfully",
      data: message,
    });
  } catch (error) {
    console.error("React to message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update reaction",
    });
  }
};

export const togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const conversation = await Conversation.findOne({
      _id: message.conversation,
      members: req.user.userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const io = req.app.get("io");

    if (message.isPinned) {
      // Unpin the current message
      message.isPinned = false;

      await message.save();

      io.to(`workspace:${conversation.workspace}`).emit("messagePinUpdated", {
        conversationId: conversation._id,
        messageId: message._id,
        isPinned: false,
      });
    } else {
      // Find the currently pinned message
      const previousPinnedMessage = await Message.findOne({
        conversation: message.conversation,
        isPinned: true,
      });

      // Unpin the previous message
      if (previousPinnedMessage) {
        previousPinnedMessage.isPinned = false;

        await previousPinnedMessage.save();

        io.to(`workspace:${conversation.workspace}`).emit("messagePinUpdated", {
          conversationId: conversation._id,
          messageId: previousPinnedMessage._id,
          isPinned: false,
        });
      }

      // Pin the new message
      message.isPinned = true;

      await message.save();

      io.to(`workspace:${conversation.workspace}`).emit("messagePinUpdated", {
        conversationId: conversation._id,
        messageId: message._id,
        isPinned: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: message.isPinned
        ? "Message pinned successfully"
        : "Message unpinned successfully",
      data: message,
    });
  } catch (error) {
    console.error("Toggle pin message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update message pin",
    });
  }
};
