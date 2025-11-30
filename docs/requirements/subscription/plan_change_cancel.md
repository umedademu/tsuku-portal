# プラン変更・解約の要件定義（決定済み部分のみ）

## プラン変更
- 適用タイミング: 即時反映。
- 日割り精算: Stripe標準のprorationを有効にする。
  - アップグレード: 残日数ぶんを日割り加算し即時請求。
  - ダウングレード: 残日数ぶんを日割り減算し、次回請求で相殺（クレジット扱い）。
- 請求日: 更新日は据え置き（現在の更新日を動かさない）。

## 解約
- 挙動: 現在の支払期間終了までは利用可とし、その後自動停止（cancel at period end）。
- 返金: 即時返金や日割り返金は行わない前提。
- 更新日: 現行の更新日でサブスク停止。再開時の扱いは未定義（別途決定）。

## ユーザー紐付け（Stripe側のキー）
- Checkout起票時に以下を入れる（既存実装を継続）
  - `client_reference_id`: SupabaseのユーザーID
  - `metadata.user_id`: SupabaseのユーザーID
  - `metadata.plan`: プランキー（blue/green/gold など）

## Webhookの扱い（おすすめ案）
- 契約状態の正とする通知: `customer.subscription.updated` / `customer.subscription.deleted`
- 重複対策: Stripeの`event.id`をDBに保存し、同じIDは再処理しない
- 失敗時の再試行: 失敗したら最大3回まで再試行し、それ以上は手動対応とする

## Supabaseサービスロールキーの扱い（推奨）
- サービスロールキーは Webhook 側だけで使用し、契約・解約の確定処理時に Supabase を更新する。
- サーバーAPIやクライアント側では通常の anon キーを利用し、サービスロールキーは渡さない。
- `.env.local` では `SUPABASE_SERVICE_KEY` に service_role の値を入れ、同じ値をデプロイ環境の環境変数にも設定する。キー名はコード側と統一する。

## 追加するページ（新規）
- プラン変更完了ページ（例: `/plan/change/success`）  
  - 役割: プラン変更の完了を案内する。即時反映／更新日据え置き、下位変更は次回請求で相殺などを表示。`/workspace` への戻り導線を置く。
  - 導線: このページから `/checkout/plan` にも遷移できるようにして再変更を促せる。
- 解約受付完了ページ（例: `/plan/cancel/complete`）  
  - 役割: 「次回更新日までは利用可／その後自動停止」「再開はプラン選択から」を明示。`/workspace` と `/checkout/plan` への導線を置く。
