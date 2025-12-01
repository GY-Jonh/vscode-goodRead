import React, { useEffect, useRef } from "react";
import { Input, List } from "antd";
import { Chapter } from "../types/chapter";
import styles from "./Reader.module.less";

interface ChapterListProps {
  chapters: Chapter[];
  currentIndex: number;
  showChapterList: boolean;
  onChapterClick: (index: number) => void;
  onSearch: (keyword: string) => void;
}

const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  currentIndex,
  showChapterList,
  onChapterClick,
  onSearch,
}) => {
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listContainerRef.current && showChapterList) {
      // 查找 Ant Design List 组件渲染的实际滚动容器
      const scrollContainer = listContainerRef.current.querySelector(
        ".ant-list"
      ) as HTMLElement;
      if (scrollContainer) {
        const activeItem = scrollContainer.querySelector(
          `[data-chapter-index="${currentIndex}"]`
        ) as HTMLElement;
        if (activeItem) {
          // 计算滚动位置，使当前项居中
          const containerHeight = scrollContainer.clientHeight;
          const itemTop = activeItem.offsetTop;
          const itemHeight = activeItem.offsetHeight;
          const scrollTop =
            itemTop - containerHeight / 2 + itemHeight / 2;
          scrollContainer.scrollTo({
            top: scrollTop,
            behavior: "smooth",
          });
        }
      }
    }
  }, [currentIndex, showChapterList]);

  const handleSearch = (value: string) => {
    onSearch(value);
  };

  return (
    <div
      className={`${styles.chapterList} ${showChapterList ? styles.show : ""}`}
      ref={listContainerRef}
    >
      <div className={styles.searchGroup}>
        <Input.Search
          placeholder="搜索章节"
          onSearch={handleSearch}
          allowClear
          enterButton
        />
      </div>
      <List
        dataSource={chapters}
        renderItem={(chapter, index) => (
          <List.Item
            key={index}
            data-chapter-index={index}
            className={`${styles.chapterItem} ${
              index === currentIndex ? styles.active : ""
            }`}
            onClick={() => onChapterClick(index)}
          >
            {chapter.title}
          </List.Item>
        )}
      />
    </div>
  );
};

export default ChapterList;

