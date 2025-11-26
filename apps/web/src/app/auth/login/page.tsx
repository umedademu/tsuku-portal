import type { Metadata } from "next";

import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = {
  title: "ログイン | 相模建設ツクルンジャー AI診断",
  description: "登録済みのメールアドレスとパスワードでログインできます。",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
