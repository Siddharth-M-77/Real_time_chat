import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import { Search, Send, MoreVertical, Phone, Video, Smile } from "lucide-react";
import useGetOtherUsers from "../hooks/useGetOtherUsers.js";
import { useDispatch, useSelector } from "react-redux";
import { logout, setSeletedUser } from "../redux/userSlice.js";
import useGetAllMessage from "../hooks/useGetAllMessage.js";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const socket = io("https://real-time-chat-1-7oz0.onrender.com");

export default function MessengerUI() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loadingImages, setLoadingImages] = useState({});
  const [receiverTyping, setReceiverTyping] = useState(false);
  const textareaRef = useRef(null);

  const dispatch = useDispatch();
  const [convos, setConvos] = useState({});
  const [convoMeta, setConvoMeta] = useState({});

  useGetOtherUsers();
  useGetAllMessage(setConvos);

  const users = useSelector((state) => state.user.otherUsers);
  const authUser = useSelector((state) => state.user.authUser);

  const filtered = users?.filter((u) =>
    u.username.toLowerCase().includes(query.toLowerCase())
  );

  const currentUser = users?.find((u) => u._id === selectedId) || {};
  const bottomRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [draft]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, convos]);

  useEffect(() => {
    if (!authUser?._id) return;
    socket.emit("join", authUser._id);

    socket.on("receiveMessage", (message) => {
      const otherId =
        message.senderId === authUser._id
          ? message.receiverId
          : message.senderId;

      setConvos((prev) => ({
        ...prev,
        [otherId]: [
          ...(prev[otherId] || []),
          {
            id: message._id,
            from: message.senderId === authUser._id ? "me" : "them",
            text: message.message,
            type: message.type || "text",
            fileName: message.fileName,
            at: new Date(message.createdAt).getTime(),
          },
        ],
      }));

      setConvoMeta((prev) => ({
        ...prev,
        [otherId]: {
          lastMessage:
            message.type === "file"
              ? `[File] ${message.fileName}`
              : message.message,
          at: new Date(message.createdAt).getTime(),
          unread: selectedId === otherId ? false : true,
        },
      }));
    });

    socket.on("typing", ({ senderId, isTyping }) => {
      if (senderId === selectedId) setReceiverTyping(isTyping);
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("typing");
    };
  }, [authUser, selectedId]);

  const sendMessage = async (file = null) => {
    if (!selectedId) return;

    try {
      const token = localStorage.getItem("token");

      if (file) {
        const tempId = Date.now();
        const previewUrl = URL.createObjectURL(file);
        const tempMessage = {
          id: tempId,
          from: "me",
          text: previewUrl,
          type: "file",
          fileName: file.name,
          at: Date.now(),
          isTemp: true,
        };

        setConvos((prev) => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] || []), tempMessage],
        }));
        setLoadingImages((prev) => ({ ...prev, [tempId]: true }));

        const formData = new FormData();
        formData.append("file", file);

        const res = await axios.post(
          `https://real-time-chat-1-7oz0.onrender.com/message/send/${selectedId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const msg = res.data.data;
        const msgWithText = { ...msg, text: msg.message };

        setConvos((prev) => ({
          ...prev,
          [selectedId]: prev[selectedId].map((m) =>
            m.id === tempId ? msgWithText : m
          ),
        }));

        setLoadingImages((prev) => {
          const copy = { ...prev };
          delete copy[tempId];
          return copy;
        });

        socket.emit("sendMessage", msgWithText);
      } else if (draft.trim()) {
        const res = await axios.post(
          `https://real-time-chat-1-7oz0.onrender.com/message/send/${selectedId}`,
          { message: draft.trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const msg = res.data.data;
        setDraft("");
        socket.emit("sendMessage", { ...msg, text: msg.message });
      }

      socket.emit("typing", {
        senderId: authUser._id,
        receiverId: selectedId,
        isTyping: false,
      });
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  };

  let typingTimeout;
  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    if (selectedId) {
      socket.emit("typing", {
        senderId: authUser._id,
        receiverId: selectedId,
        isTyping: true,
      });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit("typing", {
          senderId: authUser._id,
          receiverId: selectedId,
          isTyping: false,
        });
      }, 1500);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSeletedUser = async (u) => {
    setSelectedId(u._id);
    setSidebarOpen(false);
    dispatch(setSeletedUser(u));

    setConvoMeta((prev) => ({
      ...prev,
      [u._id]: { ...(prev[u._id] || {}), unread: false },
    }));

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://real-time-chat-1-7oz0.onrender.com/message/${u._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data) {
        const messages = res.data.data;
        const formatted = messages.map((m) => ({
          id: m._id,
          from: m.senderId === authUser._id ? "me" : "them",
          text: m.message,
          type: m.type || "text",
          fileName: m.fileName,
          at: new Date(m.createdAt).getTime(),
        }));

        setConvos((prev) => ({ ...prev, [u._id]: formatted }));

        if (messages.length > 0) {
          setConvoMeta((prev) => ({
            ...prev,
            [u._id]: {
              lastMessage:
                messages[messages.length - 1].type === "file"
                  ? `[File] ${messages[messages.length - 1].fileName}`
                  : messages[messages.length - 1].message,
              at: new Date(messages[messages.length - 1].createdAt).getTime(),
              unread: false,
            },
          }));
        }
      }
    } catch (err) {
      console.error("❌ Error loading messages:", err);
    }
  };

  const sortedUsers = [...(filtered || [])].sort((a, b) => {
    const aTime = convoMeta[a._id]?.at || 0;
    const bTime = convoMeta[b._id]?.at || 0;
    return bTime - aTime;
  });

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token"); // JWT clear
    dispatch(logout()); // Redux clear
    navigate("/"); // Login page pe bhejo
    toast.success("👋 Logged out successfully!");
  };

  const HeaderActions = () => (
    <div className="flex items-center gap-2">
      <button className="p-2 hover:bg-gray-100 rounded-xl" title="Audio call">
        <Phone size={18} />
      </button>
      <button className="p-2 hover:bg-gray-100 rounded-xl" title="Video call">
        <Video size={18} />
      </button>
      <button
        onClick={handleLogout}
        className="p-2 hover:bg-gray-100 rounded-xl text-red-500"
        title="Logout"
      >
        Logout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl px-2 sm:px-4 py-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 bg-white rounded-lg shadow mb-2"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Sidebar */}
        <AnimatePresence>
          {(sidebarOpen || window.innerWidth >= 768) && (
            <motion.aside
              key="sidebar"
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="md:col-span-4 lg:col-span-3 bg-white border rounded-2xl shadow-sm overflow-hidden fixed md:static top-0 left-0 w-4/5 sm:w-1/2 md:w-auto h-full md:h-[calc(100vh-2rem)] z-20"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl flex-1">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search people"
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </div>
                <button
                  className="md:hidden p-2"
                  onClick={() => setSidebarOpen(false)}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)]">
                {sortedUsers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No matches
                  </div>
                ) : (
                  sortedUsers.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => handleSeletedUser(u)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition ${
                        selectedId === u._id ? "bg-gray-50" : ""
                      }`}
                    >
                      <img
                        src={u.profile}
                        alt={u.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 text-left overflow-hidden">
                        <p className="font-medium text-gray-800 truncate flex items-center gap-2">
                          {u.username}
                          {convoMeta[u._id]?.unread && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {convoMeta[u._id]?.lastMessage || "Start a chat"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <section className="md:col-span-8 lg:col-span-9 bg-white border rounded-2xl shadow-sm h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
          {currentUser?._id && (
            <div className="flex flex-col px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={currentUser.profile}
                    alt={currentUser.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold">{currentUser.username}</h3>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                </div>
                <HeaderActions />
              </div>

              {/* Typing indicator */}
              {receiverTyping && selectedId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 ml-12 mt-2"
                >
                  <div className="flex gap-1">
                    <motion.span
                      className="w-2 h-2 bg-blue-500 rounded-full"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                    />
                    <motion.span
                      className="w-2 h-2 bg-blue-500 rounded-full"
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        delay: 0.2,
                      }}
                    />
                    <motion.span
                      className="w-2 h-2 bg-blue-500 rounded-full"
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        delay: 0.4,
                      }}
                    />
                  </div>
                  <p className="text-xs text-blue-500">
                    {currentUser.username} is typing...
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            <AnimatePresence initial={false}>
              {(convos[selectedId] || []).map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${
                    m.from === "me" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] sm:max-w-[60%] rounded-2xl px-4 py-2 text-sm shadow break-words ${
                      m.from === "me"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-800 border"
                    }`}
                  >
                    {m.type === "file" ? (
                      /\.(jpg|jpeg|png|gif|webp)$/i.test(
                        m.fileName || m.text
                      ) ? (
                        <img
                          src={m.text}
                          alt={m.fileName || "image"}
                          className="max-w-full sm:max-w-[300px] rounded-xl"
                        />
                      ) : (
                        <a
                          href={m.text}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-blue-600 hover:text-blue-800"
                        >
                          📎 {m.fileName || "Download File"}
                        </a>
                      )
                    ) : (
                      <p className="break-words">{m.text}</p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      {new Date(m.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t p-3 flex gap-2 items-end relative bg-white">
            <button
              onClick={() => setShowEmoji((prev) => !prev)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <Smile size={20} />
            </button>

            <button
              onClick={() => document.getElementById("fileInput").click()}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              📎
            </button>
            <input
              type="file"
              id="fileInput"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) sendMessage(file);
              }}
            />

            {showEmoji && (
              <div className="absolute bottom-16 left-2 z-20">
                <EmojiPicker
                  onEmojiClick={(emoji) =>
                    setDraft((prev) => prev + emoji.emoji)
                  }
                />
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={handleDraftChange}
              onKeyDown={onKeyDown}
              placeholder="Type a message"
              className="flex-1 resize-none outline-none text-sm border rounded-xl px-3 py-2 max-h-32 scrollbar-thin"
            />

            <button
              onClick={() => sendMessage()}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              <Send size={16} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
