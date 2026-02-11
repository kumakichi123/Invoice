import type { Metadata } from "next";
import { legalBusiness, legalLastUpdated } from "@/lib/legal";

export const metadata: Metadata = {
  title: "利用規約 | InvoiceJP",
  description: "InvoiceJPの利用規約です。",
};

export default function TermsPage() {
  return (
    <article className="space-y-5 text-sm leading-7 text-slate-800">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">利用規約</h1>
        <p className="mt-2 text-xs text-slate-600">最終更新日: {legalLastUpdated}</p>
      </header>

      <section>
        <h2 className="text-base font-semibold text-slate-900">第1条（適用）</h2>
        <p>
          本規約は、{legalBusiness.businessName}
          （以下「当社」）が提供する「InvoiceJP」（以下「本サービス」）の利用条件を定めるものです。
          登録ユーザーは本規約に同意のうえ利用するものとします。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">第2条（アカウント管理）</h2>
        <p>
          ユーザーは、自己の責任でアカウント情報を管理し、第三者に貸与・共有してはなりません。
          不正利用が疑われる場合、当社は利用停止等の措置を行うことがあります。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">第3条（料金および支払）</h2>
        <p>
          本サービスの有料プラン、従量課金、請求サイクルは購入画面または料金ページに表示します。
          決済はStripeを通じて行い、返金は法令上必要な場合を除き行いません。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">第4条（禁止事項）</h2>
        <p>
          ユーザーは、法令違反、公序良俗違反、第三者権利侵害、不正アクセス、
          リバースエンジニアリング、過度な負荷を与える行為をしてはなりません。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">第5条（サービス停止・変更）</h2>
        <p>
          当社は、保守、障害対応、法令対応その他運営上必要な場合、事前通知のうえ、
          本サービスの全部または一部を変更・停止できるものとします。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">第6条（知的財産権）</h2>
        <p>
          本サービスに関するプログラム、デザイン、商標等の権利は当社または正当な権利者に帰属します。
          ユーザーがアップロードしたデータの権利は、ユーザーまたは権利者に留保されます。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">第7条（免責）</h2>
        <p>
          当社は、本サービスの正確性、完全性、特定目的適合性を保証しません。
          抽出結果はユーザーの確認を前提とし、当社はユーザーの業務判断に基づく損害について責任を負いません。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">第8条（損害賠償の制限）</h2>
        <p>
          当社の責任は、当社に故意または重過失がある場合を除き、
          ユーザーが直近12か月に当社へ支払った利用料金の総額を上限とします。
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">第9条（規約変更）</h2>
        <p>
          当社は、法令上許容される範囲で本規約を変更できます。
          重要な変更は、本サイトまたは登録メールアドレスへの通知で告知します。
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-slate-900">第10条（準拠法・合意管轄）</h2>
        <p>本規約は{legalBusiness.governingLaw}に準拠します。</p>
        <p>
          本サービスに関して紛争が生じた場合、{legalBusiness.jurisdiction}
          を第一審の専属的合意管轄裁判所とします。
        </p>
      </section>
    </article>
  );
}
