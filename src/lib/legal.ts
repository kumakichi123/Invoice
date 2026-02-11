function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

function required(value: string, label: string): string {
  return value || `【要設定】${label}`;
}

const appUrlRaw = normalize(process.env.NEXT_PUBLIC_APP_URL);
const appUrl = appUrlRaw ? appUrlRaw.replace(/\/+$/, "") : "http://localhost:3000";

const businessNameRaw = normalize(process.env.LEGAL_BUSINESS_NAME);
const representativeRaw = normalize(process.env.LEGAL_REPRESENTATIVE);
const addressRaw = normalize(process.env.LEGAL_ADDRESS);
const phoneRaw = normalize(process.env.LEGAL_PHONE);
const emailRaw = normalize(process.env.LEGAL_CONTACT_EMAIL || process.env.FEEDBACK_NOTIFY_TO);

export const legalBusiness = {
  appUrl,
  businessName: required(businessNameRaw, "販売事業者名"),
  representative: required(representativeRaw, "代表者名"),
  address: required(addressRaw, "住所"),
  phone: required(phoneRaw, "電話番号"),
  email: required(emailRaw, "問い合わせメールアドレス"),
  supportHours: normalize(process.env.LEGAL_SUPPORT_HOURS) || "平日10:00-17:00（土日祝を除く）",
  contactFormUrl: normalize(process.env.LEGAL_CONTACT_FORM_URL) || `${appUrl}/dashboard`,
  governingLaw: normalize(process.env.LEGAL_GOVERNING_LAW) || "日本法",
  jurisdiction: normalize(process.env.LEGAL_JURISDICTION) || "東京地方裁判所",
};

const missingMap = [
  { label: "販売事業者名", value: businessNameRaw },
  { label: "代表者名", value: representativeRaw },
  { label: "住所", value: addressRaw },
  { label: "電話番号", value: phoneRaw },
  { label: "問い合わせメールアドレス", value: emailRaw },
];

export const missingLegalFieldLabels = missingMap
  .filter((field) => !field.value)
  .map((field) => field.label);

export const legalLastUpdated = "2026年2月11日";
