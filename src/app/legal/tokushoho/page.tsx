import type { Metadata } from "next";
import { legalBusiness, legalLastUpdated } from "@/lib/legal";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | InvoiceJP",
  description: "InvoiceJPの特定商取引法に基づく表記です。",
};

const rows = [
  { label: "販売事業者", value: legalBusiness.businessName },
  { label: "運営責任者", value: legalBusiness.representative },
  { label: "所在地", value: legalBusiness.address },
  { label: "電話番号", value: legalBusiness.phone },
  { label: "メールアドレス", value: legalBusiness.email },
  { label: "サイトURL", value: legalBusiness.appUrl },
  {
    label: "販売価格",
    value: "各プランの価格は購入画面に税込/税抜の別を明記して表示します。",
  },
  {
    label: "商品代金以外の必要料金",
    value: "通信費、インターネット接続費、銀行振込手数料等はお客様負担です。",
  },
  {
    label: "お支払い方法",
    value: "クレジットカード（Stripe）",
  },
  {
    label: "お支払い時期",
    value: "サブスクリプション申込時に決済され、以降は契約更新日に自動課金されます。",
  },
  {
    label: "サービス提供時期",
    value: "決済完了後、直ちに利用可能です（システムメンテナンス時を除く）。",
  },
  {
    label: "返品・キャンセル",
    value:
      "デジタルサービスの性質上、購入後の返金は原則対応しません。法令上の返金義務がある場合を除きます。",
  },
  {
    label: "中途解約",
    value:
      "次回更新日前までにStripeカスタマーポータルから解約手続きを行ってください。解約後は次回更新日以降に請求停止となります。",
  },
  {
    label: "動作環境",
    value: "最新の主要ブラウザ（Chrome / Edge / Safari / Firefox）",
  },
  {
    label: "お問い合わせ受付時間",
    value: legalBusiness.supportHours,
  },
];

export default function TokushohoPage() {
  return (
    <article className="space-y-5 text-sm text-slate-800">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">特定商取引法に基づく表記</h1>
        <p className="mt-2 text-xs text-slate-600">最終更新日: {legalLastUpdated}</p>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        {rows.map((row) => (
          <dl key={row.label} className="grid border-b border-slate-200 bg-white last:border-b-0 md:grid-cols-[220px_1fr]">
            <dt className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">{row.label}</dt>
            <dd className="px-4 py-3">{row.value}</dd>
          </dl>
        ))}
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        電話番号・住所の表示を省略する場合は、法令要件を満たす開示請求導線（フォーム/メール）を必ず設置してください。
      </p>
    </article>
  );
}
