# Stripe設定メモ（テスト）

## キー（環境変数）
- 公開キー（クライアント側で使用）  
  - 環境変数名: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  
  - Vercel とローカルの両方に同じ名前で設定する  
- シークレットキー（サーバー専用）  
  - 環境変数名: `STRIPE_SECRET_KEY`  
  - フロントエンドのコードやリポジトリには書かない

## 価格ID（テスト）
- Blue: `price_1SWzLIJ7XmQkKBD4DARhqpWB`
- Green: `price_1SWzLqJ7XmQkKBD4jNWqeGsX`
- Gold: `price_1SWzMCJ7XmQkKBD4bgxJbkni`

## リダイレクトURL（Stripe決済）
- 成功: `https://tsuku-portal-web.vercel.app/checkout/success`
- キャンセル: `https://tsuku-portal-web.vercel.app/checkout/cancel`
- これらのページは新規作成が必要  
  - 成功ページ: 「決済完了・利用開始」の案内や、診断画面へのボタンを配置  
  - キャンセルページ: 「決済が完了していない」旨と、再トライやプラン選択への導線を配置

## Webhook（Stripe → アプリ）
- 受け口URL: `https://tsuku-portal-web.vercel.app/api/stripe/webhook`
- 誰の決済か分かるように `client_reference_id` や metadata に Supabase のユーザーIDを入れる
- 主に処理するイベント  
  - `checkout.session.completed`（新規契約完了）  
  - `invoice.payment_succeeded`（継続課金成功）  
  - `invoice.payment_failed`（継続課金失敗）  
  - `customer.subscription.deleted`（解約）
- Webhook署名検証用シークレット  
  - 環境変数名: `STRIPE_WEBHOOK_SECRET`  
  - Stripe ダッシュボードの Webhook 設定画面で取得し、サーバー側だけに保存する

## 無料枠ロジック
- 診断回答は「1ユーザーにつき生涯で最初の3回まで無料」。4回目の回答リクエストが来たタイミングでプラン選択画面に遷移させる  
- プラン未契約ユーザーがプラン選択画面で「blue / green / gold」のいずれかを選び、その結果を使って Stripe Checkout を開始する  
- 一度プラン契約が完了したユーザーは、以後は回答回数に制限をかけず、サブスクリプションの状態（有効／停止）だけで利用可否を判定する  
- ユーザーの識別は Supabase Auth のユーザーID（`user.id`）を使う  
  - 各ユーザーの回答回数をサーバー側のDBでカウントし、無料枠の残り回数を管理する

## テストカード
- カード番号: `4242 4242 4242 4242`
- 有効期限: 未来日（例: 12/34）
- CVC: 任意の3桁
- 郵便番号: 任意（入力が求められた場合のみ）

## 認証（Supabase）フロー
- 認証方式: メールアドレス＋パスワードを採用（マジックリンクは現時点では不使用）  
- Supabase のリダイレクト先URL（メール内リンクの行き先）  
  - `https://tsuku-portal-web.vercel.app/auth/callback`
- `/auth/callback` ページの役割  
  - Supabase から渡される情報を受け取り、ログイン完了状態（認証済みユーザー）を作る  
  - 処理完了後、トップページ `/` または診断開始ページへ内部リダイレクトする
- Supabase のセッション有効期間はダッシュボードの「Authentication → Sessions」で設定された値に従う

## Supabase 環境変数
- クライアントから利用する値  
  - `NEXT_PUBLIC_SUPABASE_URL`  
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
  - Vercel とローカル（`.env.local`）に同じ名前で設定する
- サーバー専用で使う値（必要になったら追加）  
  - 例: `SUPABASE_SERVICE_KEY`（サーバーサイド処理用。リポジトリには書かない）

## 画面とURL
- `/auth/signup`  
  - メールアドレス＋パスワードによる新規登録ページ  
  - Supabase の `auth.signUp` を呼び出す
- `/auth/login`  
  - 既存ユーザー向けログインページ  
  - Supabase の `auth.signInWithPassword` を呼び出す
- `/auth/callback`  
  - Supabase からの確認メールのリンクを踏んだあとに戻ってくるコールバック用ページ  
  - ログイン完了処理を行い、その後 `/` もしくは診断開始セクションへリダイレクトする
- `/checkout/plan`  
  - 4回目以降の回答リクエスト時に表示するプラン選択ページ  
  - ユーザーに blue / green / gold のいずれかを選ばせ、選択結果をサーバーに送る
- `/checkout/success` / `/checkout/cancel`  
  - Stripe Checkout 完了後の戻り先。詳細は「リダイレクトURL（Stripe決済）」セクションを参照

## ユーザー状態の保存方針
- Supabase のユーザーIDを主キーとして、別テーブルで以下を管理する想定  
  - 診断の回答回数（無料3回の管理用）  
  - Stripe の `customer_id`  
  - Stripe の `subscription_id`  
  - 現在のプラン（blue / green / gold）  
  - サブスクリプションのステータス（有効・停止など）
- Webhook で受信したイベント内容をもとに、このテーブルを更新し、アプリ側の利用可否判定に使う

