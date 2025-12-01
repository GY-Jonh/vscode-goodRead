import { useState, useCallback, useEffect } from "react";
import { Chapter } from "../types/chapter";
import { useVSCodeMessage } from "./useVSCodeMessage";

export function useNovelReader() {
  const {
    chapters,
    currentChapter,
    currentIndex,
    setCurrentIndex,
    fetchChapters,
    gotoChapter,
  } = useVSCodeMessage();

  const [showChapterList, setShowChapterList] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);

  // 初始化时获取章节列表
  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  // 章节列表加载完成后，跳转到第一章
  useEffect(() => {
    if (chapters.length > 0 && currentIndex === 0) {
      gotoChapter(0, "init");
    }
  }, [chapters, currentIndex, gotoChapter]);

  const goToPrevChapter = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      gotoChapter(newIndex, "click");
    }
  }, [currentIndex, setCurrentIndex, gotoChapter]);

  const goToNextChapter = useCallback(() => {
    if (currentIndex < chapters.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      gotoChapter(newIndex, "click");
    }
  }, [currentIndex, chapters.length, setCurrentIndex, gotoChapter]);

  const toggleChapterList = useCallback(() => {
    setShowChapterList((prev) => !prev);
  }, []);

  const searchChapter = useCallback(
    (keyword: string) => {
      const trimmedKeyword = keyword.trim();
      if (!trimmedKeyword) return;

      const foundIndex = chapters.findIndex((chapter) =>
        chapter.title.includes(trimmedKeyword)
      );

      if (foundIndex >= 0) {
        setCurrentIndex(foundIndex);
        gotoChapter(foundIndex, "click");
      }
    },
    [chapters, setCurrentIndex, gotoChapter]
  );

  const handleChapterClick = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      gotoChapter(index, "click");
    },
    [setCurrentIndex, gotoChapter]
  );

  return {
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
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < chapters.length - 1,
  };
}

