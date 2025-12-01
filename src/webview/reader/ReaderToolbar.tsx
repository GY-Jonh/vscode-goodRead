import React from "react";
import { Button, Space } from "antd";
import { LeftOutlined, RightOutlined, MenuOutlined } from "@ant-design/icons";
import styles from "./Reader.module.less";

interface ReaderToolbarProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  showChapterList: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleChapterList: () => void;
}

const ReaderToolbar: React.FC<ReaderToolbarProps> = ({
  canGoPrev,
  canGoNext,
  showChapterList,
  onPrev,
  onNext,
  onToggleChapterList,
}) => {
  return (
    <div className={styles.toolbar}>
      <Space>
        {canGoPrev && (
          <Button size="small" icon={<LeftOutlined />} onClick={onPrev}>
            上一章
          </Button>
        )}
        <Button
          size="small"
          icon={<MenuOutlined />}
          onClick={onToggleChapterList}>
          {showChapterList ? "隐藏目录" : "显示目录"}
        </Button>
        <Button
          size="small"
          icon={<RightOutlined />}
          onClick={onNext}
          disabled={!canGoNext}>
          下一章
        </Button>
      </Space>
    </div>
  );
};

export default ReaderToolbar;
