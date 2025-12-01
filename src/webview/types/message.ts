import { Chapter } from "./chapter";

export interface VSCodeMessage {
  command: string;
  [key: string]: any;
}

export interface FetchChaptersMessage extends VSCodeMessage {
  command: "fetchChapters";
}

export interface GotoChapterMessage extends VSCodeMessage {
  command: "gotoChapter";
  index: number;
  type?: "click" | "init";
}

export interface ChaptersLoadedMessage extends VSCodeMessage {
  command: "chaptersLoaded";
  chapters: Chapter[];
}

export interface ShowChapterMessage extends VSCodeMessage {
  command: "showChapter";
  chapter: Chapter;
  index: number;
}

export interface UploadMessage extends VSCodeMessage {
  command: "uoload";
  data?: any;
}

