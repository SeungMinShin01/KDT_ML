import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [msg, setMsg] = useState("불러오는 중...");
  useEffect(() => {
    axios
      .get("/api/hello")
      .then((res) => setMsg(res.data.message))
      .catch(() => setMsg("스프링 서버 연결 실패"));
  }, []);
  return <h1>{msg}</h1>;
}

export default App;
