# Product Spec

## Goal

自分専用の ToDo アプリを作る。

重視すること:

- 急な頼み事を最速で追加できること
- 開いた瞬間にやるべき全タスクを俯瞰できること
- PC とスマホの両方で同じデータを使えること
- 見た目が近未来的で、毎日開きたくなること

## Platform Strategy

1. Web アプリとして開発する
2. モバイルでも快適に使えるレスポンシブ UI にする
3. 後から PWA 化する

## Core Features

### Task Management

- タスク追加
- タスク編集
- タスク完了 / 未完了の切り替え
- タスク削除

### Task Fields

- タイトル
- 期限
- 優先度
- カテゴリ
- タグ
- メモ
- 完了状態
- 作成日時
- 更新日時

### Input Experience

- タイトルだけで即追加できる
- 追加時に詳細項目もその場で設定できる
- 追加後にいつでも編集できる

## Main Screen

ホーム画面は「全タスク俯瞰」が主役。

### Layout

- 上部にクイック追加エリア
- 上部付近に表示切り替え
- メインにコンパクトなタスクリスト
- 必要に応じてフィルターや並び替えを配置

### View Modes

- 全体
- 期限別
- カテゴリ別

### Sorting Rule

- 期限優先
- 同じ条件内では優先度順

## Visual Direction

- 近未来的な UI
- ダークベース
- シアンやブルーグリーン系のアクセント
- 半透明パネル
- ほどよいグロー
- コンパクトで情報密度の高い一覧

## UX Notes

- 一覧はコンパクトに保ち、全体を見渡しやすくする
- タイトルを主役にし、補助情報は小さなチップやラベルで表現する
- スマホでも片手で操作しやすい導線にする

## Data Model Draft

### tasks

- id
- user_id
- title
- due_date
- priority
- category_id
- notes
- is_completed
- created_at
- updated_at

### categories

- id
- user_id
- name
- color
- created_at

### tags

- id
- user_id
- name
- created_at

### task_tags

- task_id
- tag_id

## Initial Milestones

1. Next.js プロジェクト作成
2. Tailwind と基本 UI セットアップ
3. Supabase プロジェクト作成
4. 認証と DB 接続
5. タスク一覧 / 追加 / 編集 / 完了機能
6. 近未来 UI の作り込み
7. PWA 対応
