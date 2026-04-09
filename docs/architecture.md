# Architecture Draft

## App Flow

### 1. Authentication

- メールログインを初期案とする
- 1ユーザー前提だが、データ分離のため `user_id` は保持する

### 2. Main Usage Flow

1. アプリを開く
2. 上部のクイック追加からタスクを登録
3. 一覧で全タスクを俯瞰
4. 必要に応じて期限別 / カテゴリ別に切り替える
5. タスクを編集、完了、削除する

## Screen Draft

### Main Dashboard

主要画面。最初に表示される。

#### Sections

- Header
- Quick Add Bar
- View Mode Switcher
- Optional Filter Bar
- Task List

#### Header Items

- アプリ名
- 現在日時または簡易サマリー
- 将来的にプロフィールメニュー

#### Quick Add Bar

- タイトル入力
- 詳細展開ボタン
- 追加ボタン

#### Expanded Fields

- 期限
- 優先度
- カテゴリ
- タグ
- メモ

### Task Edit Panel

- タスク詳細編集
- 期限、優先度、カテゴリ、タグ、メモの更新
- 削除アクション

PC ではサイドパネル、スマホではボトムシート想定。

## Data Rules

### Priority

- high
- medium
- low

### Due Date Ordering

表示順は次の考え方をベースにする。

1. 期限ありタスクを優先
2. 近い期限ほど上
3. 同じ期限なら優先度順
4. 期限なしは後ろ

### Category

- ユーザーが自由に追加
- タスクは 1 件につき 1 カテゴリを想定
- 未設定も許可

### Tags

- 複数設定可能
- 自由追加

## Database Draft

### tasks

| column | type | note |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | auth user id |
| title | text | required |
| due_date | timestamptz nullable | optional |
| priority | text | `high` / `medium` / `low` |
| category_id | uuid nullable | category reference |
| notes | text nullable | optional |
| is_completed | boolean | default false |
| created_at | timestamptz | default now |
| updated_at | timestamptz | default now |

### categories

| column | type | note |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | auth user id |
| name | text | required |
| color | text nullable | future use |
| created_at | timestamptz | default now |

### tags

| column | type | note |
| --- | --- | --- |
| id | uuid | primary key |
| user_id | uuid | auth user id |
| name | text | required |
| created_at | timestamptz | default now |

### task_tags

| column | type | note |
| --- | --- | --- |
| task_id | uuid | task reference |
| tag_id | uuid | tag reference |

## Initial Component Outline

- `AppShell`
- `QuickAdd`
- `TaskList`
- `TaskRow`
- `ViewModeTabs`
- `TaskEditorSheet`
- `CategoryFilter`
- `PriorityBadge`
- `DueDateBadge`

## PWA Preparation Notes

最初の実装段階では PWA 対応を後回しにするが、次を見据えて構成する。

- モバイルファーストで設計
- アイコン前提のブランド設計
- レスポンシブな App Shell
- オフライン対応しやすいデータ取得構造
