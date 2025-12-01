import React, { useEffect } from "react";
import { useNovelReader } from "../hooks/useNovelReader";
import ChapterList from "./ChapterList";
import ChapterContent from "./ChapterContent";
import ReaderSettings from "./ReaderSettings";
import ReaderToolbar from "./ReaderToolbar";
import styles from "./Reader.module.less";

const Reader: React.FC = () => {
  const {
    chapters,
    currentChapter,
    currentIndex,
    showChapterList,
    fontSize,
    lineHeight,
    setFontSize,
    setLineHeight,
    goToPrevChapter,
    goToNextChapter,
    toggleChapterList,
    searchChapter,
    handleChapterClick,
    canGoPrev,
    canGoNext,
  } = useNovelReader();

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevChapter();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextChapter();
      } else if (event.ctrlKey && event.shiftKey && event.key === "Z") {
        event.preventDefault();
        const container = document.getElementById("container");
        if (container) {
          container.style.display =
            container.style.display === "none" ? "flex" : "none";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevChapter, goToNextChapter]);

  return (
    <div id="container" className={styles.container}>
      <ChapterList
        chapters={chapters}
        currentIndex={currentIndex}
        showChapterList={showChapterList}
        onChapterClick={handleChapterClick}
        onSearch={searchChapter}
      />
      <div className={styles.contentWrapper}>
        <div className={styles.toolbarGroup}>
          <ReaderToolbar
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            showChapterList={showChapterList}
            onPrev={goToPrevChapter}
            onNext={goToNextChapter}
            onToggleChapterList={toggleChapterList}
          />
          <ReaderSettings
            fontSize={fontSize}
            lineHeight={lineHeight}
            onFontSizeChange={(value) => setFontSize(value || 18)}
            onLineHeightChange={(value) => setLineHeight(value || 1.8)}
          />
        </div>
        <ChapterContent
          chapter={currentChapter}
          fontSize={fontSize}
          lineHeight={lineHeight}
        />

        <div className={styles.hint}>
          <span>按左键 → 上一章</span>
          <span>按右键 → 下一章</span>
        </div>
      </div>
    </div>
  );
};

export default Reader;
