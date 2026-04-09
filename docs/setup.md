# Setup Guide

## Current Environment

この環境では次が未導入でした。

- Node.js
- npm
- winget
- chocolatey
- scoop

そのため、まずは Node.js の導入が必要です。

## Recommended Installation

Windows では公式サイトから Node.js の LTS 版をインストールするのが最も簡単です。

### Steps

1. Node.js 公式サイトから LTS 版をダウンロードする
2. インストーラーを実行する
3. インストール後、PowerShell を開き直す
4. 次のコマンドが通ることを確認する

```powershell
node -v
npm -v
```

## After Installation

Node.js 導入後は次の流れで進める。

1. Next.js プロジェクトを作成
2. Tailwind CSS を設定
3. Supabase クライアントを導入
4. 基本レイアウトとタスクリストを実装
5. 認証と DB 接続を追加
6. PWA 対応を追加

## Next Commands We Plan To Run

```powershell
npx create-next-app@latest . --ts --tailwind --app --eslint --src-dir --import-alias "@/*"
npm install @supabase/supabase-js
```

必要に応じて、後から次も追加予定です。

```powershell
npm install @supabase/ssr clsx lucide-react framer-motion
```
