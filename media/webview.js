// media/webview.js
console.log("进来了webview");
const vscode = acquireVsCodeApi();
document.addEventListener("DOMContentLoaded", () => {
  let filechapters = []; // 文件章节列表
  let currentIndex = 0; // 当前阅读的章节索引
  let showMulu = true;
  const prevChapter = document.getElementById("prevChapter"); // 上一章按钮
  let nextChapter = document.getElementById("nextChapter"); // 下一章按钮
  const prevChapter2 = document.getElementById("prevChapter2"); // 上一章按钮2
  let nextChapter2 = document.getElementById("nextChapter2"); // 下一章按钮2
  const chapterList = document.getElementById("chapterList"); // 目录列表模块
  const chapterContent = document.getElementById("chapterContent"); // 内容模块
  const chapterContentDiv = document.getElementById("chapter-content"); // 内容最外层模块

  const searchInput = document.getElementById("search"); // 搜索框
  const searchBtn = document.getElementById("searchBtn"); // 搜索按钮
  const muluBtn = document.getElementById("mulu"); // 目录按钮

  muluBtn.addEventListener("click", () => {
    if (showMulu) {
      muluBtn.innerHTML = "显示目录";
      chapterList.style.display = "none";
    } else {
      muluBtn.innerHTML = "隐藏目录";
      chapterList.style.display = "block";
    }
    showMulu = !showMulu;
  });

  searchBtn.addEventListener("click", () => {
    const searchal = (searchInput.value || "").trim();
    if (searchal) {
      const newIndex = filechapters.findIndex((chapter) => {
        return chapter.title.indexOf(searchal) >= 0;
      });
      currentIndex = newIndex > -1 ? newIndex : currentIndex;
      prevOrNext(currentIndex);
    }
  });
  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      searchBtn.click(); // 调用你的搜索函数
    }
  });

  const prevOrNext = (index) => {
    if (index === 0) {
      prevChapter.style.display = "none";
      prevChapter2.style.display = "none";
    } else if (index > 0) {
      prevChapter.style.display = "block";
      prevChapter2.style.display = "block";
    }
    const targetChapter = document.getElementById(`chapterId${index}`); // 假设章节元素的id为chapterId
    const chapterTop = targetChapter.offsetTop;
    chapterList.scrollTop = chapterTop; // 选中的章节定位置顶

    vscode.postMessage(
      {
        command: "gotoChapter",
        index: index,
      },
      "*",
    );
    chapterContentDiv.scrollTop = 0;
  };

  prevChapter.addEventListener("click", () => {
    currentIndex -= 1;

    prevOrNext(currentIndex);
  });
  nextChapter.addEventListener("click", () => {
    currentIndex += 1;

    prevOrNext(currentIndex);
  });
  prevChapter2.addEventListener("click", () => {
    currentIndex -= 1;
    prevOrNext(currentIndex);
  });
  nextChapter2.addEventListener("click", () => {
    currentIndex += 1;
    prevOrNext(currentIndex);
  });

  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
      case "showChapter":
        chapterContent.innerHTML = message.chapter.content;
      default:
        break;
    }
  });
  let chaptersLoadedListener;
  fetchChapters().then((chapters) => {
    filechapters = chapters;
    chapters.forEach((chapter, index) => {
      const li = document.createElement("li");
      li.id = `chapterId${index}`;
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = chapter.title;
      link.addEventListener("click", () => {
        currentIndex = chapters.indexOf(chapter);
        vscode.postMessage(
          {
            command: "gotoChapter",
            index: currentIndex,
          },
          "*",
        );
      });
      vscode.postMessage({ command: "gotoChapter", index: currentIndex }, "*");
      li.appendChild(link);
      chapterList.appendChild(li);
    });
  });

  function fetchChapters() {
    return new Promise((resolve) => {
      chaptersLoadedListener = (event) => {
        if (event.data.command === "chaptersLoaded") {
          resolve(event.data.chapters);
        }
      };

      window.addEventListener("message", chaptersLoadedListener);
      vscode.postMessage({ command: "fetchChapters" }, "*");
    }).finally(() => {
      window.removeEventListener("message", chaptersLoadedListener);
    });
  }
});
