import axios from "axios";

const BASE_URL = "http://localhost:8080";

class AuthService {
  register(user: { username: string; email: string; password: string }) {
    return axios.post(`${BASE_URL}/signup`, user);
  }

  login(credentials: { username: string; password: string }) {
    return axios.post(`${BASE_URL}/signin`, credentials);
  }
}

export default new AuthService();
