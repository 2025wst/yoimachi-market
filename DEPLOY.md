# 部署到 GitHub Pages

这是「羲皇寻踪 · 淮阳太昊陵」的静态站点文件。

## 一、上传到 GitHub 仓库

1. 打开你的 GitHub 仓库（可以沿用之前那个仓库）。
2. 点 **Add file → Upload files**。
3. 把本文件夹里的**所有内容**（index.html、tokens.css、app.css、app.js、scene3d.js、scene3d-inner.js、assets 文件夹、.nojekyll）一起拖进上传框。
   - 注意是拖这些**文件本身**，不要只拖 index.html；
   - 不要上传成 zip，GitHub Pages 不会自动解压。
4. 填 commit 信息，点 **Commit changes**。

## 二、开启 Pages

1. 仓库 **Settings → Pages**；
2. Build and deployment：
   - Source 选 **Deploy from a branch**
   - Branch 选 **main**，目录选 **/ (root)**
   - 保存；
3. 等 1–2 分钟，访问：
   `https://<你的用户名>.github.io/<仓库名>/`

## 三、注意

- 仓库必须是 **Public**，否则 Pages 打不开；
- 单文件不能超过 25MB（GitHub 网页上传限制），如果视频超过，用 GitHub Desktop 把整个文件夹拖进去提交；
- 上传后第一次打开较慢（约 36MB，含视频/图片/音乐），之后浏览器会缓存；
- 背景音乐需要用户第一次点击页面后才会播放（浏览器自动播放限制）。