# LeetCode Tracker — Safari 插件
一款帮你追踪 LeetCode 刷题进度的 Safari 浏览器扩展 🚀
https://private-user-images.githubusercontent.com/235874943/573842733-a2b33fcc-e63f-4fdb-9e0a-34428b92a44c.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzUzMjMyMTEsIm5iZiI6MTc3NTMyMjkxMSwicGF0aCI6Ii8yMzU4NzQ5NDMvNTczODQyNzMzLWEyYjMzZmNjLWU2M2YtNGZkYi05ZTBhLTM0NDI4YjkyYTQ0Yy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwNDA0JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDQwNFQxNzE1MTFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1kMDE3OGNhNTUwMzRkNWQzZGYyOTliNzBjZDEwMzQ4YTVmMjVhYjc4YjdhN2YzN2E5YWNlMmY1Y2EzNjdmOWRlJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.6KPLGJZwtfstscBcOL4PaFyrR97GEHx3Mfjj_04O4L8

## 安装插件

```
找到release页面，下载LeetCodeTracker.app文件，双击安装即可自动在safari安装插件。
```

## 文件结构

```
leetcode-tracker-extension/
├── manifest.json    # 插件配置
├── content.js       # 页面监控脚本（自动检测 Accepted）
├── popup.html       # 点击插件图标时显示的界面
├── popup.css        # 界面样式
├── popup.js         # 界面逻辑
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---
## 数据格式（存储在浏览器本地 storage）

```json
{
  "submissions": [
    {
      "title": "Two Sum",
      "difficulty": "Easy",
      "category": "Array",
      "timestamp": 1743750000000
    }
  ]
}
```

数据保存在本地，不上传任何服务器。

---

## 功能说明

| 功能 | 说明 |
|------|------|
| 自动记录 | Submit → Accepted 后自动保存，无需手动操作 |
| 待复习 | 每天打开插件，**蓝色高亮**显示待复习的题，按照遗忘曲线管理复习进度 |
| 今日完成 | 显示今天提交成功的题目 |
| 历史记录 | 可折叠的历史列表 |
| 防重复 | 同一题不会重复记录 |
| 点击跳转 | 点击任意题目可跳转到对应 Problem 页面 |
| 清除记录 | 右上角 🗑 按钮，确认后清除所有记录 |

---
