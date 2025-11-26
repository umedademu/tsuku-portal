# Supabase テーブル要件（案5 + BAN列）

## 目的と前提
- 会員登録・月額課金・無料枠管理・Webhook同期を運用するための最小構成。
- Supabase Auth のユーザーID（auth.users.id）を軸に全テーブルを紐づける。
- BAN判定は `user_profiles` のフラグで行い、アプリ側のAPI・画面で必ずチェックする。

## テーブル一覧
1. `user_profiles` … 会員基本情報・課金状態・BAN判定
2. `usage_counts` … 回答回数と無料枠の消化状況
3. `checkout_sessions` … Stripe Checkout 起票の控え
4. `webhook_events` … Stripe Webhook 受信ログと再処理可否

## 詳細仕様

### 1. user_profiles
- `user_id` (uuid, PK, FK → auth.users.id)
- `customer_id` (text) … Stripe カスタマーID
- `subscription_id` (text) … Stripe サブスクリプションID
- `plan` (text, enum: blue/green/gold) … 現在のプラン
- `status` (text, enum: active/incomplete/past_due/canceled など) … サブスク状態
- `current_period_end` (timestamptz) … 現在の課金期間の終了日時
- `cancel_at` (timestamptz, null可) … 解約予約日時
- `banned` (boolean, default false) … BAN中フラグ
- `ban_reason` (text, null可) … BAN理由のメモ
- `ban_until` (timestamptz, null可) … 一時BANの解除予定日時（恒久BANなら null）
- `created_at` / `updated_at` (timestamptz, default now)
- 推奨インデックス: `user_id` (PKで付与済み)、`customer_id`、`subscription_id`

### 2. usage_counts
- `user_id` (uuid, PK, FK → auth.users.id)
- `total_answers` (int) … これまでの回答累計
- `free_answers_used` (int) … 無料3回のうち消化済み回数
- `last_answer_at` (timestamptz, null可)
- `created_at` / `updated_at` (timestamptz, default now)
- 推奨インデックス: `user_id` (PKで付与済み)

### 3. checkout_sessions
- `session_id` (text, PK) … Stripe Checkout Session ID
- `user_id` (uuid, FK → auth.users.id)
- `plan` (text, enum: blue/green/gold) … このセッションで選択したプラン
- `status` (text, enum: open/complete/expired) … セッション状態
- `created_at` (timestamptz, default now)
- 推奨インデックス: `user_id`, `status`

### 4. webhook_events
- `id` (bigint, PK)
- `event_id` (text, unique) … Stripe Event ID（冪等性チェック用）
- `type` (text) … 例: checkout.session.completed, invoice.payment_succeeded など
- `payload` (jsonb) … Stripe から受け取った生データ
- `signature_verified` (boolean) … 署名検証の成否
- `processed_at` (timestamptz, null可) … 正常処理が完了した時刻
- `created_at` (timestamptz, default now)
- 推奨インデックス: `event_id` (unique), `type`

## 運用ルールのメモ
- BAN判定: API/画面の入り口で `user_profiles.banned` を必ず確認。true なら処理中断。
- 無料枠判定: 送信前に `free_answers_used` と `total_answers` を見て 3 回を超える場合はプラン選択へ誘導。
- Webhook処理: `event_id` のユニーク制約と `signature_verified` を用いて重複防止・署名検証を行う。正常終了後に `processed_at` を更新。
