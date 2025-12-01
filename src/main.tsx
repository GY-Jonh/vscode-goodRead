import React from "react";
import ReactDOM from "react-dom/client";
import App from "./webview/App";
import "antd/dist/reset.css";

// 根据当前页面路径判断模式
const isUploadPage = window.location.pathname.includes("upload.html");
const mode = isUploadPage ? "upload" : "reader";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App mode={mode} />
  </React.StrictMode>
);

