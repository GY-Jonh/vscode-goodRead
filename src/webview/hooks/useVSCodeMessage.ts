import { useEffect, useState, useCallback } from "react";
import { Chapter } from "../types/chapter";
import { VSCodeMessage, ChaptersLoadedMessage, ShowChapterMessage } from "../types/message";
import { vscode } from "../utils/vscodeApi";

export function useVSCodeMessage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    const handler = (event: MessageEvent<VSCodeMessage>) => {
      const message = event.data;
      switch (message.command) {
        case "chaptersLoaded": {
          const { chapters: loadedChapters } = message as ChaptersLoadedMessage;
          setChapters(loadedChapters);
          break;
        }
        case "showChapter": {
          const { chapter, index } = message as ShowChapterMessage;
          setCurrentChapter(chapter);
          setCurrentIndex(index);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const postMessage = useCallback((message: VSCodeMessage) => {
    vscode.postMessage(message);
  }, []);

  const fetchChapters = useCallback(() => {
    postMessage({ command: "fetchChapters" });
  }, [postMessage]);

  const gotoChapter = useCallback(
    (index: number, type: "click" | "init" = "init") => {
      postMessage({ command: "gotoChapter", index, type });
    },
    [postMessage]
  );

  return {
    chapters,
    currentChapter,
    currentIndex,
    setCurrentIndex,
    postMessage,
    fetchChapters,
    gotoChapter,
  };
}

