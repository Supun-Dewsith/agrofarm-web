import { useTranslation } from "react-i18next";

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[400px]">
      <h1 className="text-xl font-bold text-gray-900">{t("Module Workspace")}</h1>
      <p className="text-sm text-gray-400 mt-1">{t("Ready for implementation.")}</p>
    </div>
  );
}