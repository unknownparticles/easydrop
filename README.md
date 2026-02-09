# LocalDrop

局域网设备互传（WebRTC DataChannel + 轻量信令）。

## 本地运行（单服务）

**Prerequisites:** Node.js

1. 安装依赖：
   `npm install`
2. 构建前端：
   `npm run build`
3. 启动服务（前端静态 + 信令 `/ws`）：
   `npm run start`

默认监听 `http://localhost:3000`，信令路径为 `/ws`。

## HTTPS 本地开发（推荐）

部分手机浏览器在 `http://` 下会禁用 WebRTC，因此建议使用 HTTPS。

1. 安装并信任本地证书（已完成可跳过）：
   `mkcert -install`
2. 生成证书（替换为你的电脑 IP）：
   `mkcert -key-file .certs/localdrop.key -cert-file .certs/localdrop.crt localhost 127.0.0.1 ::1 192.168.0.132`
3. 重新执行 `npm run build`，再 `npm run start`。

随后使用：
- 前端页面：`https://192.168.0.132:3000`
- 信令地址自动为：`wss://192.168.0.132:3000/ws`

## PWA（安装到桌面）

在 HTTPS 下打开页面后，可使用浏览器“添加到主屏幕 / 安装应用”功能。  
离线时仅显示“无网络不可用”提示（不支持离线传输）。

## GitHub Pages（GitHub Actions）

仓库已包含自动部署工作流：`/Users/alun/Downloads/localdrop-ai/.github/workflows/deploy-pages.yml`。

配置步骤：
1. 打开仓库 `Settings -> Pages`
2. `Build and deployment -> Source` 选择 `GitHub Actions`
3. 推送到 `main` 后会自动部署

当前工作流使用 `npm run build:easydrop`，部署子路径基址为 `/easydrop/`，对应访问路径：
`https://<your-domain-or-user-site>/easydrop/`
