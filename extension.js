// extension.js

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const iconv = require("iconv-lite");
const jschardet = require("jschardet");

function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "extension.readNovel",
    async () => {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
      });
      if (fileUri && fileUri.length > 0) {
        const filePath = fileUri[0].fsPath;
        try {
          const chapters = await readAndParseFile(filePath);
          showNovelInWebview(chapters);
        } catch (error) {
          vscode.window.showErrorMessage("Failed to read and parse the novel.");
        }
      }
    },
  );

  context.subscriptions.push(disposable);
}

function readAndParseFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, buffer) => {
      if (err) return reject(err);
      const encoding = detectEncoding(buffer);
      const data = iconv.decode(buffer, encoding);

      const chapterTitles =
        data.match(
          /^(?:正文\s*)?第[\d零〇一二三四五六七八九十百千万]+章.*$(?=\n|$)/gm,
        ) || [];
      const chapters = [];

      for (let i = 0; i < chapterTitles.length; i++) {
        const chapterTitle = chapterTitles[i];
        const chapterStart = data.indexOf(chapterTitle);
        const chapterEnd =
          i === chapterTitles.length - 1
            ? data.length
            : data.indexOf(chapterTitles[i + 1]);

        const chapterContent = data.substring(chapterStart, chapterEnd).trim();
        const chapterNumber = extractChapterNumber(chapterTitle);

        chapters.push({
          number: chapterNumber,
          title: chapterTitle,
          content: chapterContent,
        });
      }

      resolve(chapters);
    });
  });
}

// 辅助函数，从章节标题中提取数字
function extractChapterNumber(title) {
  const numberMatch = title.match(/\d+/);
  return numberMatch ? parseInt(numberMatch[0], 10) : null;
}

function detectEncoding(buffer) {
  // 这里可以添加更复杂的检测逻辑，比如使用第三方库
  // 本例中仅作简单示例，假设文件是GBK编码
  const result = jschardet.detect(buffer);
  return result.encoding || "utf-8"; // 如果检测失败，默认使用 utf-8
}

function showNovelInWebview(chapters) {
  const webviewPanel = vscode.window.createWebviewPanel(
    "novelReader",
    "reading",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      // 添加这一行以允许加载本地资源
      localResourceRoots: [vscode.Uri.file(path.join(__dirname, "media"))],
    },
  );

  webviewPanel.webview.onDidReceiveMessage((message) => {
    switch (message.command) {
      case "fetchChapters":
        webviewPanel.webview.postMessage({
          command: "chaptersLoaded",
          chapters,
        });
        break;
      case "gotoChapter":
        gotoChapter(webviewPanel.webview, chapters, message.index);
        break;
      // 其他命令...
    }
  });

  webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, chapters);
  webviewPanel.reveal();
  console.log("加载完html了");
}

function gotoChapter(webview, chapters, index) {
  const chapter = chapters[index];
  webview.postMessage({ command: "showChapter", chapter });
}

function getWebviewContent(webview, chapters) {
  const scriptUri = vscode.Uri.file(
    path.join(__dirname, "media", "webview.js"),
  );
  const scriptSrc = webview.asWebviewUri(scriptUri).toString();

  const styleUri = vscode.Uri.file(path.join(__dirname, "media", "styles.css"));
  const styleSrc = webview.asWebviewUri(styleUri).toString();
  return `
    <!DOCTYPE html>
    <html lang="zh-Hans">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="${styleSrc}">
    </head>
    <body>
      <div class="container">
        <div id="chapterList">
          <div class='flex search-group' >
            <input id='search' class='flex1' />
            <button id="searchBtn">搜索</button>
          </div>
        </div>
        <div id="chapter-content">
          <div class="button-group">
            <button id="prevChapter">上一章</button>
            <button id="mulu">隐藏目录</button>
            <button id="nextChapter">下一章</button>
          </div>
          <pre id="chapterContent"></pre>
           <div class="button-group">
            <button id="prevChapter2">上一章</button>
            <button id="nextChapter2">下一章</button>
          </div>
          <div class="button-group">
            <span class="prevChapter2">按左键 -> 上一章</span>
            <span class="nextChapter2">按右键 -> 下一章</span>
          </div>
        </div>
      </div>
      <script src="${scriptSrc}"></script>
    </body>
    </html>
  `;
}

module.exports = {
  activate,
};
