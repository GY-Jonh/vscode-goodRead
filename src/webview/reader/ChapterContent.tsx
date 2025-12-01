import React, { useEffect, useRef } from "react";
import { Typography } from "antd";
import { Chapter } from "../types/chapter";
import styles from "./Reader.module.less";

const { Paragraph } = Typography;

interface ChapterContentProps {
  chapter: Chapter | null;
  fontSize: number;
  lineHeight: number;
}

const ChapterContent: React.FC<ChapterContentProps> = ({
  chapter,
  fontSize,
  lineHeight,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // 当章节切换时，将滚动条置顶
  useEffect(() => {
    if (contentRef.current && chapter) {
      contentRef.current.scrollTop = 0;
    }
  }, [chapter]);

  if (!chapter) {
    return (
      <div className={styles.chapterContent} ref={contentRef}>
        <Paragraph>暂无内容</Paragraph>
      </div>
    );
  }

  return (
    <div
      ref={contentRef}
      className={styles.chapterContent}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: lineHeight,
      }}>
      <pre className={styles.contentText}>{chapter.content}</pre>
    </div>
  );
};

export default ChapterContent;
