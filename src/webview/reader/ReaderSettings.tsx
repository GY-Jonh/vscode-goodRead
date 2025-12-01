import React from "react";
import { InputNumber, Space } from "antd";
import styles from "./Reader.module.less";

interface ReaderSettingsProps {
  fontSize: number;
  lineHeight: number;
  onFontSizeChange: (value: number | null) => void;
  onLineHeightChange: (value: number | null) => void;
}

const ReaderSettings: React.FC<ReaderSettingsProps> = ({
  fontSize,
  lineHeight,
  onFontSizeChange,
  onLineHeightChange,
}) => {
  return (
    <Space className={styles.settings}>
      <InputNumber
        style={{ width: 130 }}
        size="small"
        placeholder="字体大小"
        // min={12}
        value={fontSize}
        onChange={onFontSizeChange}
        addonBefore="字体大小"
      />
      <InputNumber
        style={{ width: 130 }}
        size="small"
        placeholder="行间距"
        // min={1}
        step={0.1}
        value={lineHeight}
        onChange={onLineHeightChange}
        addonBefore="行距"
      />
    </Space>
  );
};

export default ReaderSettings;
