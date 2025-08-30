import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { setAuthUser } from "../redux/userSlice";
import { useDispatch } from "react-redux";
export default function Login() {
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Same payload object
    const payload = {
      fullname: formData.fullname,
      email: formData.email,
      password: formData.password,
    };

    const res = await axios.post(
      "http://10.223.218.137:2000/users/login",
      payload
    );
    console.log(res);
    if (res.data.success) {
      localStorage.setItem("token", res.data.token);
      dispatch(setAuthUser(res.data.user));
      navigate("/chat");
    }
    alert(`Welcome, ${payload.fullname}!`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen ">
      <div className=" shadow-lg rounded-2xl p-8 w-96">
        <h2 className="text-2xl font-bold text-center t mb-6">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-600 font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-600 font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-all"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
