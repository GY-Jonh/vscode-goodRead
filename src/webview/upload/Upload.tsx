import React, { useState, useEffect } from "react";
import { Button, Spin } from "antd";
import { vscode } from "../utils/vscodeApi";
import { UploadMessage, VSCodeMessage } from "../types/message";
import styles from "./Upload.module.less";

const Upload: React.FC = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent<VSCodeMessage>) => {
      const message = event.data;
      // 当文件选择对话框关闭时，重置加载状态
      if (message.command === "fileSelected" || message.command === "fileCancelled") {
        setLoading(false);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleUpload = () => {
    setLoading(true);
    const message: UploadMessage = {
      command: "uoload",
    };
    vscode.postMessage(message);
    // 设置超时，防止对话框被取消后一直显示加载状态
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className={styles.container}>
      <Button type="primary" size="large" onClick={handleUpload} disabled={loading}>
        上传
      </Button>
      {loading && (
        <div className={styles.loader}>
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default Upload;

