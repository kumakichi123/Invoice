import type { Metadata } from "next";
import { legalBusiness, legalLastUpdated } from "@/lib/legal";

export const metadata: Metadata = {
  title: "プライバシーポリシー | InvoiceJP",
  description: "InvoiceJPのプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <article className="space-y-5 text-sm leading-7 text-slate-800">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">プライバシーポリシー</h1>
        <p className="mt-2 text-xs text-slate-600">最終更新日: {legalLastUpdated}</p>
      </header>

      <section>
        <h2 className="text-base font-semibold text-slate-900">1. 取得する情報</h2>
        <p>
          当社は、本サービスの提供にあたり、以下の情報を取得します。
          アカウント情報（メールアドレス等）、請求書ファイル、抽出結果データ、決済関連情報、アクセスログ、
          お問い合わせ内容。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">2. 利用目的</h2>
        <p>
          取得情報は、本人確認、サービス提供、請求・決済処理、品質改善、不正利用防止、
          お問い合わせ対応、法令対応のために利用します。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">3. 第三者提供</h2>
        <p>
          当社は、法令に基づく場合を除き、本人の同意なく個人データを第三者提供しません。
          ただし、サービス提供に必要な範囲で外部委託先を利用します。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">4. 外部サービスの利用</h2>
        <p>
          当社は、インフラ・認証（Supabase）、決済（Stripe）、AI処理（Dify）、
          メール配信（Resend）等の外部サービスを利用する場合があります。
          委託先での取り扱いは各社の規約・ポリシーに従います。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">5. 国外移転</h2>
        <p>
          当社は、クラウドサービスの利用に伴い、個人データを日本国外で取り扱う場合があります。
          法令に従い、適切な安全管理措置を講じます。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">6. 安全管理措置</h2>
        <p>
          当社は、アクセス制御、通信の暗号化、権限管理、委託先監督等の措置を講じ、
          個人データの漏えい・滅失・毀損の防止に努めます。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">7. 開示・訂正・利用停止等</h2>
        <p>
          保有個人データの開示、訂正、利用停止、削除等の請求は、下記窓口までご連絡ください。
          本人確認のうえ、法令に基づき対応します。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">8. ポリシーの改定</h2>
        <p>
          当社は、法令改正またはサービス内容の変更に応じて本ポリシーを改定することがあります。
          重要な変更は本サイト上で告知します。
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-slate-900">9. お問い合わせ窓口</h2>
        <p>事業者名: {legalBusiness.businessName}</p>
        <p>メール: {legalBusiness.email}</p>
        <p>受付時間: {legalBusiness.supportHours}</p>
      </section>
    </article>
  );
}
