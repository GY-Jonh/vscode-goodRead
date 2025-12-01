// extension.js

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const iconv = require("iconv-lite");
const jschardet = require("jschardet");

let sidebarViewProvider = null;
let column = null;
let currentIndex = 0;

// 确保扩展加载时输出日志
console.log("goodRead 扩展模块已加载");
function readAndParseFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, buffer) => {
      if (err) return reject(err);
      currentIndex = 0;
      const encoding = detectEncoding(buffer);
      const data = iconv.decode(buffer, encoding);

      const chapterTitles =
        data.match(
          /^(\s*(?:正文\s*)?第[\d零〇一二两三四五六七八九十百千万]+章.*$(?=\n|$))|(\s*(?:正文\s*)?第[\d]+.*$(?=\n|$))/gm
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
          message.type
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
  const distPath = path.join(__dirname, "dist");
  const htmlPath = path.join(distPath, "src", "webview", "reader.html");

  // 读取构建后的 HTML 文件
  let html = "";
  try {
    html = fs.readFileSync(htmlPath, "utf-8");
  } catch (error) {
    // 如果构建文件不存在，返回错误提示
    return `
      <!DOCTYPE html>
      <html lang="zh-Hans">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <div style="padding: 20px; text-align: center;">
          <p>请先运行 pnpm run build 构建前端资源</p>
        </div>
      </body>
      </html>
    `;
  }

  // 替换资源路径
  html = html.replace(/(src|href)="([^"]+)"/g, (match, attr, url) => {
    // 跳过已经是完整 URL 的路径
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("vscode-webview://")
    ) {
      return match;
    }
    // 处理相对路径，去掉开头的 / 或 ./
    const cleanUrl = url.replace(/^\.?\//, "");
    const resourcePath = path.join(distPath, cleanUrl);
    const resourceUri = vscode.Uri.file(resourcePath);
    const webviewResourceUri = webview.asWebviewUri(resourceUri).toString();
    return `${attr}="${webviewResourceUri}"`;
  });

  // 添加 CSP meta 标签（如果不存在）
  if (!html.includes("Content-Security-Policy")) {
    const csp = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource};`;
    html = html.replace(
      /<head>/,
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`
    );
  }

  return html;
}

function activate(context) {
  console.log("=== goodRead 扩展激活开始 ===");
  console.log("Extension context:", context);
  console.log("Extension path:", __dirname);
  console.log("Extension ID:", context.extension.id);
  console.log("Extension version:", context.extension.packageJSON.version);

  // 检查关键文件是否存在
  const distPath = path.join(__dirname, "dist");
  const extensionJsPath = path.join(__dirname, "extension.js");

  console.log("检查 dist 目录:", distPath, "存在:", fs.existsSync(distPath));
  console.log(
    "检查 extension.js:",
    extensionJsPath,
    "存在:",
    fs.existsSync(extensionJsPath)
  );

  // 检查依赖
  try {
    require.resolve("iconv-lite");
    console.log("✓ iconv-lite 依赖可用");
  } catch (e) {
    console.error("✗ iconv-lite 依赖不可用:", e.message);
    vscode.window.showErrorMessage(
      "goodRead: iconv-lite 依赖缺失，请重新打包插件"
    );
  }

  try {
    require.resolve("jschardet");
    console.log("✓ jschardet 依赖可用");
  } catch (e) {
    console.error("✗ jschardet 依赖不可用:", e.message);
    vscode.window.showErrorMessage(
      "goodRead: jschardet 依赖缺失，请重新打包插件"
    );
  }

  if (!fs.existsSync(distPath)) {
    const msg =
      "goodRead: dist 目录不存在，请先运行 npm run build 构建前端资源";
    console.error(msg);
    vscode.window.showWarningMessage(msg);
  }

  try {
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
                  vscode.Uri.file(path.join(__dirname, "dist")),
                ],
              }
            );
            showNovelInWebview(chapters, webviewPanel);
          } catch (error) {
            vscode.window.showErrorMessage(
              "Failed to read and parse the novel."
            );
          }
        }
      }
    );

    context.subscriptions.push(disposable);
    console.log("✓ extension.readNovel 命令已注册");
  } catch (error) {
    console.error("✗ 注册 extension.readNovel 命令失败:", error);
    vscode.window.showErrorMessage(`注册命令失败: ${error.message}`);
  }

  try {
    sidebarViewProvider = new MySidebarViewProvider(context.extensionUri);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "my-sidebar-view",
        sidebarViewProvider
      )
    );
    console.log("侧边栏视图提供者已注册");
  } catch (error) {
    console.error("注册侧边栏视图提供者失败:", error);
  }

  try {
    context.subscriptions.push(
      vscode.commands.registerCommand("extension.showMySidebar", function () {
        column = vscode.window.activeTextEditor
          ? vscode.window.activeTextEditor.viewColumn
          : undefined;
        const view = vscode.window.createWebviewView("my-sidebar-view");
        view.reveal(column);
      })
    );
    console.log("extension.showMySidebar 命令已注册");
  } catch (error) {
    console.error("注册 extension.showMySidebar 命令失败:", error);
  }

  try {
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
            vscode.window.showErrorMessage(
              "Failed to read and parse the novel."
            );
          }
        }
      }
    );
    context.subscriptions.push(disposable1);
    console.log("✓ extension.readNovel1 命令已注册");
  } catch (error) {
    console.error("✗ 注册 extension.readNovel1 命令失败:", error);
  }

  // 总结
  console.log("=== goodRead 扩展激活完成 ===");
  console.log("已注册的命令:");
  console.log("  - extension.readNovel");
  console.log("  - extension.readNovel1");
  console.log("  - extension.showMySidebar");
  console.log("订阅数量:", context.subscriptions.length);
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
      localResourceRoots: [vscode.Uri.file(path.join(__dirname, "dist"))],
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
            message.type
          );
          break;
        // 其他命令...
      }
    });

    this._view.webview.html = getWebviewContent(this._view.webview, chapters);
    this._view.reveal(column);
  },
  getWebviewContent: function (webview) {
    const distPath = path.join(__dirname, "dist");
    const htmlPath = path.join(distPath, "src", "webview", "upload.html");

    // 读取构建后的 HTML 文件
    let html = "";
    try {
      html = fs.readFileSync(htmlPath, "utf-8");
    } catch (error) {
      // 如果构建文件不存在，返回错误提示
      return `
        <!DOCTYPE html>
        <html lang="zh-Hans">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <div style="padding: 20px; text-align: center;">
            <p>请先运行 pnpm run build 构建前端资源</p>
          </div>
        </body>
        </html>
      `;
    }

    // 替换资源路径
    html = html.replace(/(src|href)="([^"]+)"/g, (match, attr, url) => {
      // 跳过已经是完整 URL 的路径
      if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("vscode-webview://")
      ) {
        return match;
      }
      // 处理相对路径，去掉开头的 / 或 ./
      const cleanUrl = url.replace(/^\.?\//, "");
      const resourcePath = path.join(distPath, cleanUrl);
      const resourceUri = vscode.Uri.file(resourcePath);
      const webviewResourceUri = webview.asWebviewUri(resourceUri).toString();
      return `${attr}="${webviewResourceUri}"`;
    });

    // 添加 CSP meta 标签（如果不存在）
    if (!html.includes("Content-Security-Policy")) {
      const csp = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource};`;
      html = html.replace(
        /<head>/,
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`
      );
    }

    return html;
  },
};

function deactivate() {
  console.log("goodRead 扩展已停用");
}

module.exports = {
  activate,
  deactivate,
};
