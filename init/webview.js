// media/webview.js
const vscode = acquireVsCodeApi();
document.addEventListener("DOMContentLoaded", () => {
  const upLoad = document.getElementById("upLoad"); // 上传按钮
  const loader = document.getElementById("loader"); // 上传按钮

  upLoad.addEventListener("click", () => {
    vscode.postMessage({ command: "uoload" }, "*");
    loader.style.display = "block";
  });
});
