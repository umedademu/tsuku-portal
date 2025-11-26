import type { Metadata } from "next";

import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = {
  title: "新規登録 | 相模建設ツクルンジャー AI診断",
  description: "メールアドレスとパスワードを設定して無料診断を始められます。",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
