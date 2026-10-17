import { useEffect, useRef, useState } from "react";
import api from "../../utils/api.js";
import socket from "../../utils/socket.js";

const Chat = () => {
  const [chatNotifications, setChatNotifications] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [showRenameGroup, setShowRenameGroup] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [messagePage, setMessagePage] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);

  const workspaceId = "6ab4ea6e026ce3098139b25d";
  const activeConversationId = activeConversation?._id;

  const handleSearchMessages = async () => {
    if (!activeConversation || !searchQuery.trim()) {
      return;
    }

    setIsSearching(true);

    try {
      const response = await api.get(
        `/api/messages/workspace/${workspaceId}/${activeConversation._id}/search`,
        {
          params: {
            q: searchQuery.trim(),
          },
        },
      );

      setSearchResults(response.data.data);
    } catch (error) {
      console.error(
        "Search messages error:",
        error.response?.data || error.message,
      );

      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTyping = (event) => {
    const value = event.target.value;

    setMessageInput(value);

    if (!activeConversation || !user) {
      return;
    }

    socket.emit("typingStart", {
      workspaceId,
      userId: user.id,
      conversationId: activeConversation._id,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typingStop", {
        workspaceId,
        userId: user.id,
        conversationId: activeConversation._id,
      });
    }, 1000);
  };
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };
  const loadOlderMessages = async () => {
    if (!activeConversation || !hasMoreMessages || loadingMessages) {
      return;
    }

    try {
      setLoadingMessages(true);

      const nextPage = messagePage + 1;

      const response = await api.get(
        `/api/messages/workspace/${workspaceId}/${activeConversation._id}?page=${nextPage}&limit=50`,
      );

      setMessages((previousMessages) => {
        const existingMessageIds = new Set(
          previousMessages.map((message) => message._id),
        );

        const olderMessages = response.data.messages.filter(
          (message) => !existingMessageIds.has(message._id),
        );

        return [...olderMessages, ...previousMessages];
      });
      setMessagePage(response.data.pagination.page);
      setHasMoreMessages(response.data.pagination.hasMore);
    } catch (error) {
      console.error(
        "Load older messages error:",
        error.response?.data || error.message,
      );
    } finally {
      setLoadingMessages(false);
    }
  };
  const handleAddConversationMember = async (userId) => {
    if (!userId || !activeConversation) {
      return;
    }

    try {
      await api.post(
        `/api/conversations/workspace/${workspaceId}/${activeConversation._id}/members`,
        {
          userId,
        },
      );

      setShowAddMember(false);
    } catch (error) {
      console.error(
        "Failed to add conversation member:",
        error.response?.data || error.message,
      );
    }
  };
  const loadMessagesUntilFound = async (messageId) => {
    let currentPage = messagePage;
    let moreMessages = hasMoreMessages;

    while (moreMessages) {
      currentPage += 1;

      try {
        setLoadingMessages(true);

        const response = await api.get(
          `/api/messages/workspace/${workspaceId}/${activeConversation._id}?page=${currentPage}&limit=50`,
        );

        const olderMessages = response.data.messages;

        setMessages((previousMessages) => {
          const existingMessageIds = new Set(
            previousMessages.map((message) => message._id),
          );

          const newOlderMessages = olderMessages.filter(
            (message) => !existingMessageIds.has(message._id),
          );

          return [...newOlderMessages, ...previousMessages];
        });

        setMessagePage(response.data.pagination.page);
        setHasMoreMessages(response.data.pagination.hasMore);

        const found = olderMessages.some(
          (message) => message._id === messageId,
        );

        if (found) {
          return true;
        }

        moreMessages = response.data.pagination.hasMore;
      } catch (error) {
        console.error(
          "Load messages until found error:",
          error.response?.data || error.message,
        );

        return false;
      } finally {
        setLoadingMessages(false);
      }
    }

    return false;
  };

  const resetConversationPanels = () => {
    setShowAddMember(false);
    setShowRenameGroup(false);
    setGroupNameInput("");
  };

  const handleRemoveConversationMember = async (userId) => {
    if (!userId || !activeConversation) {
      return;
    }

    try {
      await api.delete(
        `/api/conversations/workspace/${workspaceId}/${activeConversation._id}/members/${userId}`,
      );
      setShowMembers(false);
    } catch (error) {
      console.error(
        "Failed to remove conversation member:",
        error.response?.data || error.message,
      );
    }
  };
  const handleArchiveConversation = async () => {
    if (!activeConversation) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to archive this conversation?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.patch(
        `/api/conversations/workspace/${workspaceId}/${activeConversation._id}/archive`,
      );
    } catch (error) {
      console.error(
        "Failed to archive conversation:",
        error.response?.data || error.message,
      );
    }
  };
  const handleUnarchiveConversation = async (conversationId) => {
    if (!conversationId) {
      return;
    }

    try {
      await api.patch(
        `/api/conversations/workspace/${workspaceId}/${conversationId}/unarchive`,
      );

      setArchivedConversations((previousConversations) =>
        previousConversations.filter(
          (conversation) => conversation._id !== conversationId,
        ),
      );
    } catch (error) {
      console.error(
        "Failed to unarchive conversation:",
        error.response?.data || error.message,
      );
    }
  };
  const uploadSelectedFile = async () => {
    if (!selectedFile) {
      return null;
    }

    const formData = new FormData();

    formData.append("file", selectedFile);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await api.post("/api/upload", formData, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) {
            return;
          }

          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );

          setUploadProgress(percentCompleted);
        },
      });

      return response.data.data;
    } finally {
      setIsUploading(false);
    }
  };
  const handleSendMessage = async () => {
    if (!activeConversation) {
      return;
    }

    if (!messageInput.trim() && !selectedFile) {
      return;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (editingMessageId) {
      try {
        const response = await api.patch(
          `/api/messages/workspace/${workspaceId}/${activeConversation._id}/${editingMessageId}`,
          {
            content: messageInput.trim(),
          },
        );

        console.log("Message updated:", response.data);
        setMessages((previousMessages) =>
          previousMessages.map((message) =>
            message._id === response.data.data._id
              ? response.data.data
              : message,
          ),
        );
        setEditingMessageId(null);
        setMessageInput("");
        setSelectedFile(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        setUploadProgress(0);

        return;
      } catch (error) {
        console.error(
          "Edit message error:",
          error.response?.data || error.message,
        );

        return;
      }
    }

    try {
      let uploadedFile = null;

      if (selectedFile) {
        uploadedFile = await uploadSelectedFile();

        console.log("Uploaded file:", uploadedFile);
      }
      const response = await api.post(
        `/api/messages/workspace/${workspaceId}/${activeConversation._id}`,
        {
          content: messageInput.trim(),
          replyTo: replyingTo?._id || null,
          messageType: selectedFile
            ? selectedFile.type.startsWith("image/")
              ? "image"
              : "file"
            : "text",
          attachmentUrl: uploadedFile ? uploadedFile.url : null,
          attachmentName: selectedFile ? selectedFile.name : null,
        },
      );

      console.log("Message sent:", response.data);

      setMessages((previousMessages) => {
        const messageExists = previousMessages.some(
          (message) => message._id === response.data.data._id,
        );

        if (messageExists) {
          return previousMessages;
        }

        return [...previousMessages, response.data.data];
      });

      setMessageInput("");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setUploadProgress(0);
    } catch (error) {
      console.error(
        "Send message error:",
        error.response?.data || error.message,
      );
    }
  };
  const handleRenameGroup = async () => {
    if (!activeConversation || !groupNameInput.trim()) {
      return;
    }

    try {
      await api.patch(
        `/api/conversations/workspace/${workspaceId}/${activeConversation._id}`,
        {
          name: groupNameInput.trim(),
        },
      );

      setShowRenameGroup(false);
    } catch (error) {
      console.error(
        "Failed to rename conversation:",
        error.response?.data || error.message,
      );
    }
  };
  const handleEditMessage = (message) => {
    setEditingMessageId(message._id);
    setMessageInput(message.content);
  };
  const handleReactToMessage = async (messageId, emoji) => {
    try {
      await api.patch(`/api/messages/${messageId}/reaction`, {
        emoji,
      });
    } catch (error) {
      console.error(
        "React to message error:",
        error.response?.data || error.message,
      );
    }
  };
  const handleDeleteMessage = async (messageId) => {
    if (!activeConversation) {
      return;
    }

    try {
      const response = await api.delete(
        `/api/messages/workspace/${workspaceId}/${activeConversation._id}/${messageId}`,
      );

      console.log("Message deleted:", response.data);
    } catch (error) {
      console.error(
        "Delete message error:",
        error.response?.data || error.message,
      );
    }
  };
  const resetConversationMessages = () => {
    setTypingUsers([]);
    setMessagePage(1);
    setHasMoreMessages(false);
    setMessages([]);
  };
  useEffect(() => {
    const handleWorkspaceOnlineUsers = (data) => {
      setOnlineUsers(data.userIds);
    };

    const handleUserOnline = (data) => {
      setOnlineUsers((previousUsers) => {
        if (previousUsers.includes(data.userId)) {
          return previousUsers;
        }

        return [...previousUsers, data.userId];
      });
    };

    const handleUserOffline = (data) => {
      setOnlineUsers((previousUsers) =>
        previousUsers.filter((userId) => userId !== data.userId),
      );
    };

    socket.on("workspaceOnlineUsers", handleWorkspaceOnlineUsers);

    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);

    return () => {
      socket.off("workspaceOnlineUsers", handleWorkspaceOnlineUsers);

      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
    };
  }, []);

  useEffect(() => {
    const handleMessageUpdated = (data) => {
      if (!activeConversationId) {
        return;
      }

      if (data.conversationId !== activeConversationId) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message._id === data.message._id ? data.message : message,
        ),
      );
    };

    socket.on("messageUpdated", handleMessageUpdated);

    return () => {
      socket.off("messageUpdated", handleMessageUpdated);
    };
  }, [activeConversationId]);

  useEffect(() => {
    const handleConversationArchived = (data) => {
      if (data.userId !== user?.id) {
        return;
      }

      setConversations((previousConversations) =>
        previousConversations.filter(
          (conversation) => conversation._id !== data.conversationId,
        ),
      );

      setActiveConversation((previousConversation) => {
        if (previousConversation?._id === data.conversationId) {
          return null;
        }

        return previousConversation;
      });
    };

    socket.on("conversationArchived", handleConversationArchived);

    return () => {
      socket.off("conversationArchived", handleConversationArchived);
    };
  }, [user]);
  useEffect(() => {
    if (!showAddMember) {
      return;
    }

    const fetchWorkspaceMembers = async () => {
      try {
        const response = await api.get(
          `/api/workspaces/${workspaceId}/members`,
        );

        if (response.data.success) {
          setWorkspaceMembers(response.data.Members);
        }
      } catch (error) {
        console.error(
          "Failed to fetch workspace members:",
          error.response?.data || error.message,
        );
      }
    };

    fetchWorkspaceMembers();
  }, [showAddMember, workspaceId]);
  useEffect(() => {
    const handleConversationUnarchived = async (data) => {
      if (data.userId !== user?.id) {
        return;
      }

      try {
        const response = await api.get(
          `/api/conversations/workspace/${workspaceId}`,
        );

        if (response.data.success) {
          setConversations(response.data.conversations);
        }
      } catch (error) {
        console.error(
          "Failed to refresh conversations after unarchive:",
          error.response?.data || error.message,
        );
      }
    };

    socket.on("conversationUnarchived", handleConversationUnarchived);

    return () => {
      socket.off("conversationUnarchived", handleConversationUnarchived);
    };
  }, [workspaceId, user]);
  useEffect(() => {
    const handleConversationMemberAdded = (data) => {
      setConversations((previousConversations) =>
        previousConversations.map((conversation) =>
          conversation._id === data.conversationId
            ? {
                ...conversation,
                members: [...conversation.members, data.member],
              }
            : conversation,
        ),
      );

      setActiveConversation((previousConversation) => {
        if (
          !previousConversation ||
          previousConversation._id !== data.conversationId
        ) {
          return previousConversation;
        }

        return {
          ...previousConversation,
          members: [...previousConversation.members, data.member],
        };
      });
    };

    socket.on("conversationMemberAdded", handleConversationMemberAdded);

    return () => {
      socket.off("conversationMemberAdded", handleConversationMemberAdded);
    };
  }, []);
  useEffect(() => {
    const fetchArchivedConversations = async () => {
      try {
        const response = await api.get(
          `/api/conversations/workspace/${workspaceId}/archived`,
        );

        if (response.data.success) {
          setArchivedConversations(response.data.conversations);
        }
      } catch (error) {
        console.error(
          "Failed to fetch archived conversations:",
          error.response?.data || error.message,
        );
      }
    };

    fetchArchivedConversations();
  }, [workspaceId]);
  useEffect(() => {
    const handleConversationMemberRemoved = (data) => {
      // If the current user was removed
      if (data.userId === user?.id) {
        setConversations((previousConversations) =>
          previousConversations.filter(
            (conversation) => conversation._id !== data.conversationId,
          ),
        );

        setActiveConversation((previousConversation) => {
          if (previousConversation?._id === data.conversationId) {
            return null;
          }

          return previousConversation;
        });

        return;
      }

      // If another member was removed
      setConversations((previousConversations) =>
        previousConversations.map((conversation) =>
          conversation._id === data.conversationId
            ? {
                ...conversation,
                members: conversation.members.filter(
                  (member) => member._id !== data.userId,
                ),
              }
            : conversation,
        ),
      );

      setActiveConversation((previousConversation) => {
        if (
          !previousConversation ||
          previousConversation._id !== data.conversationId
        ) {
          return previousConversation;
        }

        return {
          ...previousConversation,
          members: previousConversation.members.filter(
            (member) => member._id !== data.userId,
          ),
        };
      });
    };

    socket.on("conversationMemberRemoved", handleConversationMemberRemoved);

    return () => {
      socket.off("conversationMemberRemoved", handleConversationMemberRemoved);
    };
  }, [user]);
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleMessageDeleted = (data) => {
      if (!activeConversation) {
        return;
      }

      if (data.conversationId !== activeConversation._id) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.filter((message) => message._id !== data.messageId),
      );
    };

    socket.on("messageDeleted", handleMessageDeleted);

    return () => {
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [activeConversation]);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/api/auth/me");

        console.log("ME RESPONSE:", response.data);

        setUser(response.data.user);
      } catch (error) {
        console.error(
          "Fetch user error:",
          error.response?.data || error.message,
        );
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const joinWorkspace = () => {
      socket.emit("joinWorkspace", {
        workspaceId,
        userId: user.id,
      });

      console.log("Joined workspace from Chat:", workspaceId);
    };

    if (socket.connected) {
      joinWorkspace();
    }

    socket.on("connect", joinWorkspace);

    return () => {
      socket.off("connect", joinWorkspace);
    };
  }, [user, workspaceId]);
  useEffect(() => {
    const handleTypingStart = (data) => {
      if (!activeConversation) {
        return;
      }

      if (data.conversationId !== activeConversation._id) {
        return;
      }

      setTypingUsers((previousUsers) => {
        if (previousUsers.includes(data.userId)) {
          return previousUsers;
        }

        return [...previousUsers, data.userId];
      });
    };

    socket.on("typingStart", handleTypingStart);

    return () => {
      socket.off("typingStart", handleTypingStart);
    };
  }, [activeConversation]);
  useEffect(() => {
    const handleTypingStop = (data) => {
      if (!activeConversation) {
        return;
      }

      if (data.conversationId !== activeConversation._id) {
        return;
      }

      setTypingUsers((previousUsers) =>
        previousUsers.filter((userId) => userId !== data.userId),
      );
    };

    socket.on("typingStop", handleTypingStop);

    return () => {
      socket.off("typingStop", handleTypingStop);
    };
  }, [activeConversation]);
  useEffect(() => {
    const handleMessageRead = (data) => {
      console.log("MESSAGE READ EVENT RECEIVED:", data);
      if (!activeConversation) {
        return;
      }

      if (data.conversationId !== activeConversation._id) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) => {
          if (!data.messageIds.includes(message._id)) {
            return message;
          }

          return {
            ...message,
            isRead: true,
            readAt: new Date(),
          };
        }),
      );
    };

    socket.on("messageRead", handleMessageRead);

    return () => {
      socket.off("messageRead", handleMessageRead);
    };
  }, [activeConversation]);
  useEffect(() => {
    const handleConversationUpdated = (data) => {
      setConversations((previousConversations) =>
        previousConversations.map((conversation) =>
          conversation._id === data.conversationId
            ? data.conversation
            : conversation,
        ),
      );

      setActiveConversation((previousConversation) => {
        if (
          !previousConversation ||
          previousConversation._id !== data.conversationId
        ) {
          return previousConversation;
        }

        return data.conversation;
      });
    };

    socket.on("conversationUpdated", handleConversationUpdated);

    return () => {
      socket.off("conversationUpdated", handleConversationUpdated);
    };
  }, []);
  useEffect(() => {
    const handleMessageCreated = (data) => {
      if (activeConversation?._id === data.conversationId) {
        setMessages((previousMessages) => {
          const messageExists = previousMessages.some(
            (message) => message._id === data.message._id,
          );

          if (messageExists) {
            return previousMessages;
          }

          return [...previousMessages, data.message];
        });
      }

      if (
        activeConversation?._id !== data.conversationId &&
        data.message.sender?._id !== user?.id
      ) {
        setUnreadCounts((previousCounts) => ({
          ...previousCounts,
          [data.conversationId]: (previousCounts[data.conversationId] || 0) + 1,
        }));
      }

      setConversations((previousConversations) => {
        const updatedConversations = previousConversations.map(
          (conversation) =>
            conversation._id === data.conversationId
              ? {
                  ...conversation,
                  latestMessage: data.message,
                  updatedAt: data.message.createdAt,
                }
              : conversation,
        );

        const updatedConversation = updatedConversations.find(
          (conversation) => conversation._id === data.conversationId,
        );

        if (!updatedConversation) {
          return previousConversations;
        }

        return [
          updatedConversation,
          ...updatedConversations.filter(
            (conversation) => conversation._id !== data.conversationId,
          ),
        ];
      });
    };

    const handleMessageReactionUpdated = ({
      conversationId,
      messageId,
      reactions,
    }) => {
      if (activeConversation?._id !== conversationId) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message._id === messageId
            ? {
                ...message,
                reactions,
              }
            : message,
        ),
      );
    };
    const handleMessagePinUpdated = ({
      conversationId,
      messageId,
      isPinned,
    }) => {
      if (activeConversation?._id !== conversationId) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message._id === messageId
            ? {
                ...message,
                isPinned,
              }
            : message,
        ),
      );
    };

    socket.on("messageCreated", handleMessageCreated);
    socket.on("messagePinUpdated", handleMessagePinUpdated);

    socket.on("messageReactionUpdated", handleMessageReactionUpdated);

    return () => {
      socket.off("messageCreated", handleMessageCreated);

      socket.off("messageReactionUpdated", handleMessageReactionUpdated);

      socket.off("messagePinUpdated", handleMessagePinUpdated);
    };
  }, [activeConversation, user]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await api.get(
          `/api/messages/workspace/${workspaceId}/${activeConversationId}?page=1&limit=50`,
        );

        console.log("Conversation messages:", response.data);

        setMessages(response.data.messages);
        setMessagePage(response.data.pagination.page);
        setHasMoreMessages(response.data.pagination.hasMore);
      } catch (error) {
        console.error(
          "Fetch messages error:",
          error.response?.data || error.message,
        );
      }
    };

    fetchMessages();

    api
      .patch(
        `/api/messages/workspace/${workspaceId}/${activeConversationId}/read`,
      )
      .then((response) => {
        console.log("Messages marked as read:", response.data);

        setUnreadCounts((previousCounts) => ({
          ...previousCounts,
          [activeConversationId]: 0,
        }));
      })
      .catch((error) => {
        console.error(
          "Mark messages as read error:",
          error.response?.data || error.message,
        );
      });
  }, [activeConversationId, workspaceId]);

  useEffect(() => {
    const handleChatNotification = (notification) => {
      if (activeConversation?._id === notification.conversationId) {
        return;
      }

      setChatNotifications((previousNotifications) => [
        notification,
        ...previousNotifications,
      ]);

      setTimeout(() => {
        setChatNotifications((previousNotifications) =>
          previousNotifications.filter(
            (item) => item.message._id !== notification.message._id,
          ),
        );
      }, 5000);
    };

    socket.on("chatNotification", handleChatNotification);

    return () => {
      socket.off("chatNotification", handleChatNotification);
    };
  }, [activeConversation?._id]);
  useEffect(() => {
    if (!activeConversation || messages.length === 0) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "auto",
    });
  }, [activeConversation, messages.length]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api.get(
          `/api/conversations/workspace/${workspaceId}`,
        );

        console.log("Conversations:", response.data);

        const fetchedConversations = response.data.conversations;

        setConversations(fetchedConversations);

        const unreadResults = await Promise.all(
          fetchedConversations.map(async (conversation) => {
            const unreadResponse = await api.get(
              `/api/messages/workspace/${workspaceId}/${conversation._id}/unread`,
            );

            return {
              conversationId: conversation._id,
              unreadCount: unreadResponse.data.unreadCount,
            };
          }),
        );

        const unreadMap = {};

        unreadResults.forEach((item) => {
          unreadMap[item.conversationId] = item.unreadCount;
        });

        setUnreadCounts(unreadMap);
      } catch (error) {
        console.error(
          "Fetch conversations error:",
          error.response?.data || error.message,
        );
      }
    };

    fetchConversations();
  }, []);

  const pinnedMessages = messages.filter((message) => message.isPinned);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {chatNotifications.length > 0 && (
        <div className="absolute right-4 top-4 z-50 w-80 space-y-2">
          {chatNotifications.map((notification, index) => (
            <button
              key={`${notification.message._id}-${index}`}
              type="button"
              onClick={async () => {
                const conversation = conversations.find(
                  (item) => item._id === notification.conversationId,
                );

                if (!conversation) {
                  return;
                }

                resetConversationPanels();
                setActiveConversation(conversation);
                resetConversationMessages();

                const found = await loadMessagesUntilFound(
                  notification.message._id,
                );

                if (!found) {
                  return;
                }

                const messageElement = document.getElementById(
                  `message-${notification.message._id}`,
                );

                if (messageElement) {
                  messageElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });

                  setHighlightedMessageId(notification.message._id);

                  setTimeout(() => {
                    setHighlightedMessageId(null);
                  }, 2000);
                }

                setChatNotifications((previousNotifications) =>
                  previousNotifications.filter(
                    (item) => item.message._id !== notification.message._id,
                  ),
                );
              }}
              className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <p className="text-sm font-semibold text-gray-800">New message</p>

              <p className="text-xs text-gray-500">
                {notification.message.sender?.firstName}{" "}
                {notification.message.sender?.lastName}
              </p>

              <p className="mt-1 truncate text-sm text-gray-700">
                {notification.message.content || "Attachment"}
              </p>
            </button>
          ))}
        </div>
      )}

      <aside
        className={`${
          showSidebar ? "flex" : "hidden"
        } h-full w-full shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex md:w-80`}
      >
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Conversations
          </h2>
        </div>

        <div>
          {conversations.length === 0 ? (
            <p className="p-4 text-slate-500 dark:text-slate-400">
              No conversations yet
            </p>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => {
                  resetConversationMessages();
                  resetConversationPanels();
                  setActiveConversation(conversation);
                  setShowSidebar(false);
                }}
                className={`cursor-pointer border-b border-slate-200 p-4 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 ${
                  activeConversation?._id === conversation._id
                    ? "bg-slate-100 dark:bg-slate-800"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {conversation.type === "direct" && (
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        onlineUsers.includes(
                          conversation.members.find(
                            (member) => member._id !== user?.id,
                          )?._id,
                        )
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />
                  )}

                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {conversation.type === "group"
                      ? conversation.name || "Group"
                      : (() => {
                          const otherMember = conversation.members.find(
                            (member) => member._id !== user?.id,
                          );

                          return otherMember
                            ? `${otherMember.firstName} ${otherMember.lastName}`
                            : "Direct conversation";
                        })()}
                  </p>
                </div>
                {conversation.latestMessage && (
                  <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                    {conversation.latestMessage.content}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  {conversation.type === "group" && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {conversation.members.length}{" "}
                      {conversation.members.length === 1 ? "member" : "members"}
                    </p>
                  )}

                  {unreadCounts[conversation._id] > 0 && (
                    <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                      {unreadCounts[conversation._id]}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          {archivedConversations.length > 0 && (
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="mb-2 px-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Archived
              </p>

              <div className="space-y-2">
                {archivedConversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    className="flex items-center justify-between rounded-md p-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {conversation.type === "group"
                          ? conversation.name || "Group"
                          : (() => {
                              const otherMember = conversation.members.find(
                                (member) => member._id !== user?.id,
                              );

                              return otherMember
                                ? `${otherMember.firstName} ${otherMember.lastName}`
                                : "Direct conversation";
                            })()}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Archived
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleUnarchiveConversation(conversation._id)
                      }
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Unarchive
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      <main
        className={`${
          showSidebar ? "hidden" : "flex"
        } min-h-0 min-w-0 flex-1 flex-col md:flex`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setShowSidebar(true)}
            className="mr-2 shrink-0 rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
            aria-label="Back to conversations"
          >
            ←
          </button>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              {activeConversation
                ? activeConversation.type === "group"
                  ? activeConversation.name || "Group"
                  : activeConversation.members?.find(
                        (member) => member._id !== user?.id,
                      )
                    ? `${
                        activeConversation.members.find(
                          (member) => member._id !== user?.id,
                        ).firstName
                      } ${
                        activeConversation.members.find(
                          (member) => member._id !== user?.id,
                        ).lastName
                      }`
                    : "Direct conversation"
                : "Select a conversation"}
            </h2>

            {activeConversation && activeConversation.type === "group" && (
              <button
                type="button"
                onClick={() => setShowMembers((previous) => !previous)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {activeConversation.members.length}{" "}
                {activeConversation.members.length === 1 ? "member" : "members"}
              </button>
            )}
          </div>

          {activeConversation && (
            <button
              type="button"
              onClick={handleArchiveConversation}
              className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Archive
            </button>
          )}
        </div>
        {showMembers && activeConversation?.type === "group" && (
          <div className="max-h-72 shrink-0 overflow-y-auto border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 font-medium">Members</p>

            <div className="space-y-2">
              {activeConversation.members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full mr-2 ${
                        onlineUsers.includes(member._id)
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    ></span>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {member.firstName} {member.lastName}
                      {member._id === user?.id && " (You)"}
                      {member._id === activeConversation.createdBy?._id && (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          Owner
                        </span>
                      )}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {member.email}
                    </p>
                    {member._id !== user?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Remove ${member.firstName} ${member.lastName} from this conversation?`,
                          );

                          if (confirmed) {
                            handleRemoveConversationMember(member._id);
                          }
                        }}
                        className="mt-1 text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add member button */}
            <button
              type="button"
              onClick={() => setShowAddMember((previous) => !previous)}
              className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              Add member
            </button>

            {/* Rename group button */}
            <button
              type="button"
              onClick={() => {
                setGroupNameInput(activeConversation.name || "");
                setShowRenameGroup((previous) => !previous);
              }}
              className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              Rename group
            </button>
            {showRenameGroup && (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(event) => setGroupNameInput(event.target.value)}
                  placeholder="Enter group name"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleRenameGroup}
                  className="mt-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            )}

            {/* Add member selection */}
            {showAddMember && (
              <div className="mt-3 rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">Select a member</p>

                <div className="space-y-2">
                  {workspaceMembers
                    .filter(
                      (workspaceMember) =>
                        !activeConversation.members.some(
                          (conversationMember) =>
                            conversationMember._id === workspaceMember.user._id,
                        ),
                    )
                    .map((workspaceMember) => (
                      <div
                        key={workspaceMember.user._id}
                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {workspaceMember.user.firstName}{" "}
                            {workspaceMember.user.lastName}
                          </p>

                          <p className="text-xs text-gray-500">
                            {workspaceMember.user.email}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleAddConversationMember(
                              workspaceMember.user._id,
                            )
                          }
                          className="rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeConversation && (
          <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSearchMessages();
                      }
                    }}
                    placeholder="Search messages..."
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800 dark:focus:ring-blue-900"
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSearchMessages}
                  disabled={isSearching || !searchQuery.trim()}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </div>
              {pinnedMessages.length > 0 && (
                <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-3 dark:border-yellow-900 dark:bg-yellow-950 sm:px-4">
                  <button
                    type="button"
                    onClick={async () => {
                      const pinnedMessage = pinnedMessages[0];

                      let messageElement = document.getElementById(
                        `message-${pinnedMessage._id}`,
                      );

                      if (!messageElement) {
                        const found = await loadMessagesUntilFound(
                          pinnedMessage._id,
                        );

                        if (!found) {
                          return;
                        }

                        messageElement = document.getElementById(
                          `message-${pinnedMessage._id}`,
                        );
                      }

                      if (messageElement) {
                        messageElement.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });

                        setHighlightedMessageId(pinnedMessage._id);

                        setTimeout(() => {
                          setHighlightedMessageId(null);
                        }, 2000);
                      }
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-yellow-700">
                          📌 Pinned message
                        </p>

                        <p className="mt-1 truncate text-sm text-gray-700">
                          {pinnedMessages[0].content || "Attachment"}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs text-yellow-600">
                        View
                      </span>
                    </div>
                  </button>
                </div>
              )}

              {searchQuery.trim() &&
                !isSearching &&
                searchResults.length === 0 && (
                  <p className="mt-2 px-1 text-sm text-gray-500">
                    No messages found.
                  </p>
                )}
            </div>

            {searchResults.length > 0 && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">
                    Search results
                  </p>

                  <span className="text-xs text-gray-500">
                    {searchResults.length}{" "}
                    {searchResults.length === 1 ? "result" : "results"}
                  </span>
                </div>

                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {searchResults.map((message) => (
                    <div
                      key={message._id}
                      onClick={async () => {
                        let messageElement = document.getElementById(
                          `message-${message._id}`,
                        );

                        if (!messageElement) {
                          const found = await loadMessagesUntilFound(
                            message._id,
                          );

                          if (!found) {
                            return;
                          }

                          messageElement = document.getElementById(
                            `message-${message._id}`,
                          );
                        }

                        if (messageElement) {
                          messageElement.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });

                          setHighlightedMessageId(message._id);

                          setTimeout(() => {
                            setHighlightedMessageId(null);
                          }, 2000);
                        }
                      }}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-gray-800">
                          {message.sender.firstName} {message.sender.lastName}
                        </p>

                        <p className="shrink-0 text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <p className="mt-1 truncate text-sm text-gray-600">
                        {message.content || "Attachment"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
          {hasMoreMessages && (
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                onClick={loadOlderMessages}
                disabled={loadingMessages}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-slate-700"
              >
                {loadingMessages
                  ? "Loading older messages..."
                  : "Load older messages"}
              </button>
            </div>
          )}
          {!activeConversation ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">
                Select a conversation to start chatting
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">No messages yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {messages.map((message) => {
                  return (
                    <div
                      key={message._id}
                      id={`message-${message._id}`}
                      className={`flex ${
                        user?.id === message.sender?._id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 transition-all duration-300 ${
                          highlightedMessageId === message._id
                            ? "bg-yellow-300 text-gray-900 ring-4 ring-yellow-200 shadow-lg"
                            : user?.id === message.sender?._id
                              ? "bg-blue-600 text-white"
                              : "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                        }`}
                      >
                        <p className="text-sm font-semibold">
                          {message.sender.firstName} {message.sender.lastName}
                        </p>

                        <p
                          className={`text-xs ${
                            highlightedMessageId === message._id
                              ? "text-gray-600"
                              : user?.id === message.sender?._id
                                ? "text-blue-100"
                                : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}

                          {message.isEdited && " · edited"}
                        </p>
                        {message.isPinned && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                            📌 Pinned
                          </div>
                        )}
                        {message.replyTo && (
                          <button
                            type="button"
                            onClick={async () => {
                              let messageElement = document.getElementById(
                                `message-${message.replyTo._id}`,
                              );

                              if (!messageElement) {
                                const found = await loadMessagesUntilFound(
                                  message.replyTo._id,
                                );

                                if (!found) {
                                  return;
                                }

                                messageElement = document.getElementById(
                                  `message-${message.replyTo._id}`,
                                );
                              }

                              if (messageElement) {
                                messageElement.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });

                                setHighlightedMessageId(message.replyTo._id);

                                setTimeout(() => {
                                  setHighlightedMessageId(null);
                                }, 2000);
                              }
                            }}
                            className="mb-2 w-full rounded-lg border-l-4 border-blue-400 bg-black/10 px-3 py-2 text-left transition hover:bg-black/20"
                          >
                            <p className="text-xs font-semibold opacity-80">
                              {message.replyTo.sender?.firstName}{" "}
                              {message.replyTo.sender?.lastName}
                            </p>

                            <p className="mt-1 truncate text-sm opacity-80">
                              {message.replyTo.content || "Attachment"}
                            </p>
                          </button>
                        )}

                        {message.messageType === "image" &&
                        message.attachmentUrl ? (
                          <img
                            src={message.attachmentUrl}
                            alt="Attachment"
                            className="mt-2 max-w-xs rounded-lg"
                          />
                        ) : message.messageType === "file" &&
                          message.attachmentUrl ? (
                          <a
                            href={message.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex max-w-xs items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-blue-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600"
                          >
                            <span>📎</span>

                            <span className="truncate">
                              {message.attachmentName || "Open file"}
                            </span>
                          </a>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}

                        {user?.id === message.sender?._id && (
                          <p
                            className={`mt-1 text-xs ${
                              user?.id === message.sender?._id
                                ? "text-blue-100"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {message.isRead ? "✓✓ Read" : "✓ Sent"}
                          </p>
                        )}

                        {user?.id === message.sender?._id && (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditMessage(message)}
                              className="text-sm text-blue-100 hover:text-white hover:underline"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(message._id)}
                              className="text-sm text-red-200 hover:text-red-100 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.patch(
                                  `/api/messages/${message._id}/pin`,
                                );
                              } catch (error) {
                                console.error(
                                  "Toggle pin message error:",
                                  error.response?.data || error.message,
                                );
                              }
                            }}
                            className={`text-sm hover:underline ${
                              message.isPinned
                                ? "text-yellow-600"
                                : user?.id === message.sender?._id
                                  ? "text-blue-100 hover:text-white"
                                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                            }`}
                          >
                            {message.isPinned ? "📌 Unpin" : "📌 Pin"}
                          </button>
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setReplyingTo(message)}
                            className={`text-sm hover:underline ${
                              user?.id === message.sender?._id
                                ? "text-blue-100 hover:text-white"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            ↩ Reply
                          </button>
                        </div>
                        <div className="mt-2 flex gap-1">
                          {["👍", "❤️", "😂", "😮", "😢", "🔥"].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                handleReactToMessage(message._id, emoji)
                              }
                              className="rounded-full px-2 py-1 text-sm transition hover:bg-white/20"
                              title={`React ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        {message.reactions?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(
                              message.reactions.reduce((counts, reaction) => {
                                counts[reaction.emoji] =
                                  (counts[reaction.emoji] || 0) + 1;
                                return counts;
                              }, {}),
                            ).map(([emoji, count]) => {
                              const userReacted = message.reactions.some(
                                (reaction) =>
                                  reaction.user?._id === user?.id &&
                                  reaction.emoji === emoji,
                              );

                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() =>
                                    handleReactToMessage(message._id, emoji)
                                  }
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs shadow-sm transition ${
                                    userReacted
                                      ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {typingUsers.length > 0 && (
          <p className="px-4 pb-2 text-sm text-gray-500">
            {activeConversation.members
              .filter((member) => typingUsers.includes(member._id))
              .map((member) => `${member.firstName} ${member.lastName}`)
              .join(", ")}{" "}
            {typingUsers.length === 1 ? "is" : "are"} typing...
          </p>
        )}
        <div className="shrink-0 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {replyingTo && (
            <div className="shrink-0 border-t border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-700">
                    Replying to {replyingTo.sender?.firstName}{" "}
                    {replyingTo.sender?.lastName}
                  </p>

                  <p className="mt-1 truncate text-sm text-gray-700">
                    {replyingTo.content || "Attachment"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
                  title="Cancel reply"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="flex min-w-0 items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files[0];

                if (!file) {
                  return;
                }

                setSelectedFile(file);

                console.log("Selected file:", file);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex shrink-0 items-center gap-2 rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Attach file"
            >
              <span>📎</span>

              {selectedFile && (
                <span className="max-w-32 truncate text-sm">
                  {selectedFile.name}
                </span>
              )}
            </button>
            {isUploading && (
              <div className="mt-2 w-40">
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
                  <div
                    className="h-full bg-blue-600 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            <textarea
              placeholder="Type a message....."
              value={messageInput}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              rows={1}
              className="min-w-0 flex-1 resize-none rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 sm:px-4"
            />

            <button
              type="button"
              onClick={handleSendMessage}
              className="shrink-0 rounded bg-blue-600 px-3 py-2 text-sm text-white sm:px-5"
            >
              {editingMessageId ? "Update" : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
