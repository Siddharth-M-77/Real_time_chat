import axios from "axios";
import React from "react";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setOtherUsers } from "../redux/userSlice";

const useGetOtherUsers = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    const fetchOtherUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const data = await axios.get(
          "http://10.223.218.137:2000/users/get-other-users",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              withCredentials: true,
            },
          }
        );
        if (data.status === 200) {
          dispatch(setOtherUsers(data.data));
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchOtherUsers();
  }, []);
};

export default useGetOtherUsers;
