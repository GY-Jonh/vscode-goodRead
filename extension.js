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
      console.log("检测到的文件编码:", encoding);
      const data = iconv.decode(buffer, encoding);
      console.log("文件总长度:", data.length, "字符");
      console.log("文件前500个字符预览:", data.substring(0, 500));

      // 扩展章节标题匹配模式，支持更多格式
      const chapterPatterns = [
        // 标准格式：第X章（支持正文前缀）
        /^[\s]*(?:正文\s*)?第[\d零〇一二两三四五六七八九十百千万]+章[^\n\r]*$/gm,
        // 数字格式：第123章 或 第 123 章（支持空格）
        /^[\s]*第\s*[\d]+\s*章[^\n\r]*$/gmi,
        // 简化格式：第一章、第二章等（纯中文数字）
        /^[\s]*第[零〇一二两三四五六七八九十百千万]+章[^\n\r]*$/gm,
        // 其他常见格式：Chapter X、章节X等
        /^[\s]*(?:Chapter|章节|第)\s*[\d零〇一二两三四五六七八九十百千万]+[^\n\r]*$/gmi,
        // 更宽松的匹配：只要包含"第"和"章"的行
        /^[\s]*第[^\n\r]*章[^\n\r]*$/gm,
      ];

      let chapterTitles = [];
      for (const pattern of chapterPatterns) {
        const matches = data.match(pattern);
        if (matches) {
          console.log(`使用模式匹配到 ${matches.length} 个章节标题:`, pattern);
          chapterTitles = matches;
          break;
        }
      }

      // 如果还是没匹配到，尝试更宽松的匹配
      if (chapterTitles.length === 0) {
        console.log("尝试更宽松的匹配模式...");
        // 匹配包含"第"和"章"的行（不要求在同一行，但要求顺序）
        const looseMatches = data.match(/^[^\n\r]*第[^\n\r]*章[^\n\r]*$/gm);
        if (looseMatches && looseMatches.length > 0) {
          console.log(`宽松模式匹配到 ${looseMatches.length} 个可能的章节标题`);
          // 过滤掉太长的行（可能是正文内容）
          chapterTitles = looseMatches.filter(title => {
            const trimmed = title.trim();
            // 章节标题通常不会太长（比如不超过100个字符）
            return trimmed.length > 0 && trimmed.length < 100;
          });
          console.log(`过滤后剩余 ${chapterTitles.length} 个章节标题`);
          if (chapterTitles.length > 0) {
            console.log("前几个匹配示例:", chapterTitles.slice(0, 5));
          }
        } else {
          console.log("宽松模式也未匹配到章节标题");
          // 最后尝试：查找所有包含"第"的行
          const allLinesWithDi = data.split(/\r?\n/).filter(line => {
            const trimmed = line.trim();
            return trimmed.includes("第") && trimmed.length < 100;
          });
          if (allLinesWithDi.length > 0) {
            console.log(`找到 ${allLinesWithDi.length} 行包含'第'的内容，前5行:`, allLinesWithDi.slice(0, 5));
          }
        }
      }

      console.log("最终匹配到的章节标题数量:", chapterTitles.length);
      if (chapterTitles.length > 0) {
        console.log("前3个章节标题示例:", chapterTitles.slice(0, 3));
      }

      const chapters = [];

      for (let i = 0; i < chapterTitles.length; i++) {
        const chapterTitle = chapterTitles[i].trim();
        const chapterStart = data.indexOf(chapterTitle);
        if (chapterStart === -1) {
          console.warn(`未找到章节标题在文件中的位置: ${chapterTitle}`);
          continue;
        }
        const chapterEnd =
          i === chapterTitles.length - 1
            ? data.length
            : data.indexOf(chapterTitles[i + 1].trim());

        const chapterContent = data.substring(chapterStart, chapterEnd).trim();
        const chapterNumber = extractChapterNumber(chapterTitle);

        chapters.push({
          number: chapterNumber,
          title: chapterTitle,
          content: chapterContent,
        });
      }

      console.log("解析完成的章节数量:", chapters.length);
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
  // 使用 jschardet 检测编码
  const result = jschardet.detect(buffer);
  console.log("jschardet 检测结果:", result);
  
  // 常见的中文编码列表，按优先级排序
  const encodingsToTry = [];
  
  if (result && result.encoding && result.confidence > 0.5) {
    // 如果检测到编码且置信度较高，优先使用
    const detectedEncoding = result.encoding.toLowerCase();
    if (detectedEncoding.includes("gb") || detectedEncoding.includes("gbk") || detectedEncoding.includes("gb2312")) {
      encodingsToTry.push("gbk");
    } else if (detectedEncoding.includes("big5")) {
      encodingsToTry.push("big5");
    } else if (detectedEncoding.includes("utf-8") || detectedEncoding.includes("utf8")) {
      encodingsToTry.push("utf-8");
    } else {
      encodingsToTry.push(detectedEncoding);
    }
  }
  
  // 添加常见的中文编码作为备选
  encodingsToTry.push("gbk", "gb2312", "utf-8", "big5");
  
  // 去重
  const uniqueEncodings = [...new Set(encodingsToTry)];
  
  // 尝试每个编码，检查解码后的内容是否包含中文字符
  for (const encoding of uniqueEncodings) {
    try {
      const decoded = iconv.decode(buffer, encoding);
      // 检查是否包含中文字符（Unicode 范围：\u4e00-\u9fff）
      const chineseCharPattern = /[\u4e00-\u9fff]/;
      const hasChinese = chineseCharPattern.test(decoded.substring(0, 1000));
      
      // 检查是否包含常见的章节关键词
      const hasChapterKeywords = /第[\d零〇一二两三四五六七八九十百千万]+章/.test(decoded.substring(0, 5000));
      
      if (hasChinese || hasChapterKeywords) {
        console.log(`编码 ${encoding} 解码成功，包含中文字符: ${hasChinese}, 包含章节关键词: ${hasChapterKeywords}`);
        return encoding;
      }
    } catch (error) {
      console.log(`编码 ${encoding} 解码失败:`, error.message);
      continue;
    }
  }
  
  // 如果所有编码都失败，默认使用 gbk（中文小说最常见的编码）
  console.log("所有编码尝试失败，默认使用 gbk");
  return "gbk";
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
        console.log("=== extension.readNovel 命令被调用 ===");
        try {
          const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: "选择小说文件",
          });
          console.log("文件选择对话框返回:", fileUri);
          if (fileUri && fileUri.length > 0) {
            const filePath = fileUri[0].fsPath;
            console.log("选择的文件路径:", filePath);
            try {
              const chapters = await readAndParseFile(filePath);
              console.log("解析到章节数:", chapters.length);
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
              console.error("读取和解析文件失败:", error);
              vscode.window.showErrorMessage(
                `Failed to read and parse the novel: ${error.message}`
              );
            }
          } else {
            console.log("用户取消了文件选择");
          }
        } catch (error) {
          console.error("显示文件选择对话框失败:", error);
          vscode.window.showErrorMessage(
            `Failed to show file dialog: ${error.message}`
          );
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

    // 监听视图可见性变化
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        console.log("侧边栏视图变为可见");
        // 如果视图可见且没有内容，可以选择自动执行命令
        // 注意：这里不自动执行，因为用户可能只是想查看视图
      }
    });

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
