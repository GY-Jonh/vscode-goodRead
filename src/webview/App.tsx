import React from "react";
import { ConfigProvider } from "antd";
import Reader from "./reader/Reader";
import Upload from "./upload/Upload";
import zhCN from "antd/locale/zh_CN";

interface AppProps {
  mode?: "reader" | "upload";
}

const App: React.FC<AppProps> = ({ mode = "reader" }) => {
  return (
    <ConfigProvider locale={zhCN}>
      {mode === "reader" ? <Reader /> : <Upload />}
    </ConfigProvider>
  );
};

export default App;

