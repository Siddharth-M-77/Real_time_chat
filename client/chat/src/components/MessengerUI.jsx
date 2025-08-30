import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import { Search, Send, MoreVertical, Phone, Video, Smile } from "lucide-react";
import useGetOtherUsers from "../hooks/useGetOtherUsers.js";
import { useDispatch, useSelector } from "react-redux";
import { setSeletedUser } from "../redux/userSlice.js";
import useGetAllMessage from "../hooks/useGetAllMessage.js";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";

// const socket = io("http://192.168.1.10:2000");
const socket = io("http://10.223.218.137:2000");

export default function MessengerUI() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loadingImages, setLoadingImages] = useState({});
  const [receiverTyping, setReceiverTyping] = useState(false); // 🟢 Typing state

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, convos]);

  // --- socket join + receive + typing
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

    // 🟢 Listen for typing events
    socket.on("typing", ({ senderId, isTyping }) => {
      if (senderId === selectedId) setReceiverTyping(isTyping);
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("typing");
    };
  }, [authUser, selectedId]);

  // --- Send message (text/file)
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
          `http://10.223.218.137:2000/message/send/${selectedId}`,
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
          `http://10.223.218.137:2000/message/send/${selectedId}`,
          { message: draft.trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const msg = res.data.data;
        setDraft("");
        socket.emit("sendMessage", { ...msg, text: msg.message });
      }

      // 🟢 Stop typing after send
      socket.emit("typing", {
        senderId: authUser._id,
        receiverId: selectedId,
        isTyping: false,
      });
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  };

  // --- Typing handler (debounced)
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

  // --- Select user
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
        `http://10.223.218.137:2000/message/${u._id}`,
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

  const HeaderActions = () => (
    <div className="flex items-center gap-2">
      <button className="p-2 hover:bg-gray-100 rounded-xl" title="Audio call">
        <Phone size={18} />
      </button>
      <button className="p-2 hover:bg-gray-100 rounded-xl" title="Video call">
        <Video size={18} />
      </button>
      <button className="p-2 hover:bg-gray-100 rounded-xl" title="More">
        <MoreVertical size={18} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-6 grid md:grid-cols-12 gap-6">
        {/* Sidebar */}
        <AnimatePresence>
          {(sidebarOpen ||
            typeof window === "undefined" ||
            window.innerWidth >= 768) && (
            <motion.aside
              key="sidebar"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="md:col-span-4 lg:col-span-3 bg-white border rounded-2xl shadow-sm overflow-hidden h-[78vh] md:h-[84vh]"
            >
              <div className="p-4 border-b">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search people"
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </div>
              </div>

              <div className="overflow-y-auto h-[calc(78vh-72px)] md:h-[calc(84vh-72px)]">
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
                        className="w-11 h-11 rounded-full object-cover"
                      />
                      <div className="flex-1 text-left">
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
        {/* Chat area */}
        <section className="md:col-span-8 lg:col-span-9 bg-white border rounded-2xl shadow-sm h-[78vh] md:h-[84vh] flex flex-col overflow-hidden">
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
                <div className="flex items-center gap-2 ml-12 mt-1">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-300"></span>
                  </div>
                  <p className="text-xs text-blue-500">
                    {currentUser.username} is typing...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50 relative">
            <AnimatePresence initial={false}>
              {(convos[selectedId] || []).map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`flex ${
                    m.from === "me" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow ${
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
                          className="max-w-xs rounded-xl"
                        />
                      ) : (
                        <a
                          href={m.text}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-blue-600"
                        >
                          📎 {m.fileName || "Download File"}
                        </a>
                      )
                    ) : (
                      <p>{m.text}</p>
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
          <div className="border-t p-3 flex gap-2 items-end relative">
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
              <div className="absolute bottom-14 left-2 z-10">
                <EmojiPicker
                  onEmojiClick={(emoji) =>
                    setDraft((prev) => prev + emoji.emoji)
                  }
                />
              </div>
            )}

            <textarea
              value={draft}
              onChange={handleDraftChange} // call typing emitter inside this
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Type a message"
              className="flex-1 resize-none outline-none text-sm border rounded-xl px-3 py-2"
            />

            <button
              onClick={() => sendMessage()}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white"
            >
              <Send size={16} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
