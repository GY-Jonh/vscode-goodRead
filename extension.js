// extension.js

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const iconv = require("iconv-lite");
const jschardet = require("jschardet");

let sidebarViewProvider = null;
let column = null;
let currentIndex = 0;
// const globalState = vscode.Memento.global();
console.log("重新进来extension.js");
function readAndParseFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, buffer) => {
      if (err) return reject(err);
      currentIndex = 0;
      const encoding = detectEncoding(buffer);
      const data = iconv.decode(buffer, encoding);

      const chapterTitles =
        data.match(
          /^\s*(?:正文\s*)?第[\d零〇一二三四五六七八九十百千万]+章.*$(?=\n|$)/gm,
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

function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, buffer) => {
      if (err) return reject(err);
      const encoding = detectEncoding(buffer);
      const data = iconv.decode(buffer, encoding);

      resolve(data);
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

function showNovelInWebview(chapters, webviewPanel) {
  webviewPanel.webview.onDidReceiveMessage((message) => {
    switch (message.command) {
      case "fetchChapters":
        webviewPanel.webview.postMessage({
          command: "chaptersLoaded",
          chapters,
        });
        break;
      case "gotoChapter":
        gotoChapter(
          webviewPanel.webview,
          chapters,
          message.index,
          message.type,
        );
        break;
      // 其他命令...
    }
  });

  webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, chapters);
  webviewPanel.reveal();
}

const getDataFromGlobalState = () => {
  const extension = vscode.extensions.getExtension("my-sidebar-view");
  let currentIndex = 0;
  if (extension) {
    const globalState = extension.storage.globalState;
    currentIndex = globalState.get("currentIndex", 0);
  }
  return currentIndex;
};

const saveDataToGlobalState = (index) => {
  const extension = vscode.extensions.getExtension("my-sidebar-view");
  if (extension) {
    const globalState = extension.storage.globalState;
    // 更新状态
    globalState.update("currentIndex", index);
  }
};

function gotoChapter(webview, chapters, index, type = "init") {
  if (index !== 0 || type === "click") {
    currentIndex = index;
  }
  const chapter = chapters[currentIndex];
  webview.postMessage({
    command: "showChapter",
    chapter,
    index: currentIndex,
  });
}

function getWebviewContent(webview, chapters) {
  const scriptUri = vscode.Uri.file(
    path.join(__dirname, "media", "webview.js"),
  );
  const scriptSrc = webview.asWebviewUri(scriptUri).toString();

  const styleUri = vscode.Uri.file(path.join(__dirname, "media", "styles.css"));
  const styleSrc = webview.asWebviewUri(styleUri).toString();

  // 下面方法可以获取react打包的静态资源html文件的字符串
  // let winPath = scriptUri.path.replace(/\//g, "\\");
  // winPath = winPath.slice(1);
  // const a = await readFile(winPath);

  return `
    <!DOCTYPE html>
    <html lang="zh-Hans">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="${styleSrc}">
    </head>
    <body>
      <div id='container' class="container">
        <div id="chapterList">
          <div class='flex search-group' >
            <input id='search' class='flex1' />
            <button id="searchBtn">搜索</button>
          </div>
        </div>
        <div id="chapter-content">
          <div class="button-group">
            <button id="prevChapter">上一章</button>
            <button id="mulu">显示目录</button>
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

function activate(context) {
  console.log("重新进来activate");
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
          const webviewPanel = vscode.window.createWebviewPanel(
            "novelReader",
            "reading",
            vscode.ViewColumn.One,
            {
              enableScripts: true,
              retainContextWhenHidden: true,
              // 添加这一行以允许加载本地资源
              localResourceRoots: [
                vscode.Uri.file(path.join(__dirname, "media")),
              ],
            },
          );
          showNovelInWebview(chapters, webviewPanel);
        } catch (error) {
          vscode.window.showErrorMessage("Failed to read and parse the novel.");
        }
      }
    },
  );

  context.subscriptions.push(disposable);
  sidebarViewProvider = new MySidebarViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "my-sidebar-view",
      sidebarViewProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.showMySidebar", function () {
      column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
      const view = vscode.window.createWebviewView("my-sidebar-view");
      view.reveal(column);
    }),
  );
  let disposable1 = vscode.commands.registerCommand(
    "extension.readNovel1",
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
          sidebarViewProvider.showNovelInWebview(chapters);
        } catch (error) {
          vscode.window.showErrorMessage("Failed to read and parse the novel.");
        }
      }
    },
  );
  context.subscriptions.push(disposable1);
}
function MySidebarViewProvider(extensionUri) {
  this._view = undefined;
  this._extensionUri = extensionUri;
}
MySidebarViewProvider.prototype = {
  resolveWebviewView: function (webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      retainContextWhenHidden: true, // 关键设置
    };

    this._view.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "uoload":
          vscode.commands.executeCommand("extension.readNovel1", message.data);
          break;
      }
    });
    this._view.webview.html = this.getWebviewContent(this._view.webview);
    // 创建工具栏项
    // const buttonItem = new vscode.WebviewViewToolbarItem(
    //   vscode.ThemeIcon.Folder,
    //   "上传",
    //   "extension.readNovel",
    // );

    // // 添加工具栏项到 Webview 视图
    // webviewView.webview.toolbarItems = [buttonItem];
  },

  revive: function (panel) {
    if (panel) {
      this._view = panel;
    }
  },
  showNovelInWebview: function (chapters) {
    this._view.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "fetchChapters":
          this._view.webview.postMessage({
            command: "chaptersLoaded",
            chapters,
          });
          break;
        case "gotoChapter":
          gotoChapter(
            this._view.webview,
            chapters,
            message.index,
            message?.type,
          );
          break;
        // 其他命令...
      }
    });

    this._view.webview.html = getWebviewContent(this._view.webview, chapters);
    this._view.reveal(column);
  },
  getWebviewContent: function (webview) {
    const scriptUri = vscode.Uri.file(
      path.join(__dirname, "init", "webview.js"),
    );
    const scriptSrc = webview.asWebviewUri(scriptUri).toString();

    const styleUri = vscode.Uri.file(
      path.join(__dirname, "init", "styles.css"),
    );
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
        <div id='container' class="container">
          <button id="upLoad">上传</button>
          <div id='loader' class="loader"></div>
        </div>
        <script src="${scriptSrc}"></script>
      </body>
      </html>
    `;
  },
};

module.exports = {
  activate,
};
