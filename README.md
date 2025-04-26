## 目標
幫我寫一個個人備忘錄網頁應用, 白嫖cloudflare

## 前端
一個可以持續輸入訊息或上傳檔案的個人聊天室, 頁面載入時從API獲取一次歷史資料, 使用vite+vue3 composition api
1. Cloudflare Pages:  部屬該網頁

- TypeScript
- Jest
- Playwright

## 後端
記錄我每次的輸入並可以上傳檔案/下載歷史檔案
1. Cloudflare Workers(ts): 處理訊息、檔案上傳/下載
1. Cloudflare D1: 儲存文字訊息和檔案資訊
1. Cloudflare R2: 儲存上傳的檔案
1. Cloudflare AutoRAG: 將R2內容向量化
1. Cloudflare Workers AI: 透過AI回應或透過AutoRAG回答