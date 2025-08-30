import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";

const useGetAllMessage = (setConvos) => {
  const { seletedUser } = useSelector((state) => state.user);

  useEffect(() => {
    const getAllMessagesOfUsers = async () => {
      if (!seletedUser?._id) return;

      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `https://real-time-chat-1-7oz0.onrender.com/message/${seletedUser._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = res.data.message; // conversation object
        if (data?.messages) {
          // convert backend -> frontend format
          const mapped = data.messages.map((m) => ({
            id: m._id,
            from: m.senderId === seletedUser._id ? "them" : "me",
            text: m.message,
            at: new Date(m.createdAt).getTime(),
          }));

          setConvos((prev) => ({
            ...prev,
            [seletedUser._id]: mapped,
          }));
        }
      } catch (error) {
        console.error("Error fetching messages", error);
      }
    };

    getAllMessagesOfUsers();
  }, [seletedUser, setConvos]);
};

export default useGetAllMessage;
