import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Coins,
  ExternalLink,
  Leaf,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { fetchWithAuth, getAuthData } from "~/utils/auth";
import OfficialMarketPrices from "~/components/OfficialMarketPrices";

type Crop = {
  cropId: number;
  cropName: string;
  variety?: string;
  farmId: number;
  farmName: string;
  fieldId?: number;
  fieldName?: string;
  expectedHarvestDate?: string;
};

type Harvest = {
  id: number;
  cropId: number;
  cropName: string;
  variety?: string;
  farmName: string;
  fieldName?: string;
  harvestedOn: string;
  quantityKg: number;
  grade?: string;
  unitPriceLkrPerKg?: number;
  soldMarket?: string;
  notes?: string;
};

type MarketPrice = {
  id: number;
  commodityName: string;
  marketName: string;
  observedOn: string;
  daysOld?: number;
  priceLkrPerKg: number;
  priceType: string;
  sourceName: string;
  sourceUrl?: string;
  distanceKm?: number;
  googleMapsUrl?: string;
  changeSincePreviousPercent?: number;
};

type Summary = {
  totalQuantityKg: number;
  cropCount: number;
  recordCount: number;
  recordedSalesLkr: number;
};

const HARTI_URL = "https://www.harti.gov.lk/daily-price.php";

const EMPTY_SUMMARY: Summary = {
  totalQuantityKg: 0,
  cropCount: 0,
  recordCount: 0,
  recordedSalesLkr: 0,
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 " +
  "text-sm text-slate-900 outline-none placeholder:text-slate-400 " +
  "focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 " +
  "px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 " +
  "bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition " +
  "hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

function money(value: unknown) {
  const amount = Number(value);
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function quantityLabel(value: unknown) {
  const amount = Number(value);
  return new Intl.NumberFormat("en-LK", {
    maximumFractionDigits: 3,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function todayInSriLanka() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dateLabel(value?: string) {
  if (!value) return "—";

  const day = value.slice(0, 10);
  const date = new Date(`${day}T12:00:00+05:30`);

  return Number.isNaN(date.getTime())
    ? day
    : date.toLocaleDateString("en-LK", {
        timeZone: "Asia/Colombo",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function safeLink(value?: string) {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

async function ensureSuccess(response: Response) {
  if (response.ok) return;

  const body: unknown = await response.json().catch(() => null);

  if (body && typeof body === "object") {
    const details = body as Record<string, unknown>;
    const message = details.message ?? details.detail ?? details.error;

    if (typeof message === "string") {
      throw new Error(message);
    }
  }

  throw new Error(`Request failed (${response.status}).`);
}

async function readJson<T>(response: Response): Promise<T> {
  await ensureSuccess(response);
  return response.json() as Promise<T>;
}

function textValue(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function optionalNumber(form: FormData, name: string) {
  const value = textValue(form, name);
  return value === "" ? null : Number(value);
}

export default function HarvestPage() {
  const { t } = useTranslation();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [records, setRecords] = useState<Harvest[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [prices, setPrices] = useState<MarketPrice[]>([]);

  const [selectedCropId, setSelectedCropId] = useState("");
  const [priceType, setPriceType] = useState("WHOLESALE");
  const [expectedKg, setExpectedKg] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [editing, setEditing] = useState<Harvest | null>(null);
  const [priceReload, setPriceReload] = useState(0);

  const canManagePrices = role === "ADMIN" || role === "SUPERVISOR";

  useEffect(() => {
    try {
      setRole((getAuthData()?.role ?? "").toUpperCase());
    } catch {
      setRole("");
    }
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const responses = await Promise.all([
        fetchWithAuth("/api/harvest/options"),
        fetchWithAuth("/api/harvest"),
        fetchWithAuth("/api/harvest/summary"),
      ]);

      const [cropData, recordData, summaryData] = await Promise.all([
        readJson<Crop[]>(responses[0]),
        readJson<Harvest[]>(responses[1]),
        readJson<Summary>(responses[2]),
      ]);

      if (
        !Array.isArray(cropData) ||
        !Array.isArray(recordData) ||
        !summaryData ||
        typeof summaryData !== "object"
      ) {
        throw new Error("The server returned invalid harvest information.");
      }

      setCrops(cropData);
      setRecords(recordData);
      setSummary(summaryData);

      setSelectedCropId((current) =>
        cropData.some((crop) => String(crop.cropId) === current)
          ? current
          : String(cropData[0]?.cropId ?? ""),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!selectedCropId) {
      setPrices([]);
      setPriceError("");
      setPricesLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();

    setPrices([]);
    setPriceError("");
    setPricesLoading(true);

    async function loadPrices() {
      try {
        const response = await fetchWithAuth(
          `/api/harvest/market-prices?cropId=${encodeURIComponent(selectedCropId)}`,
          { signal: controller.signal },
        );

        const data = await readJson<MarketPrice[]>(response);

        if (!Array.isArray(data)) {
          throw new Error("The server returned invalid market prices.");
        }

        if (active) setPrices(data);
      } catch (err) {
        if (active) setPriceError(errorMessage(err));
      } finally {
        if (active) setPricesLoading(false);
      }
    }

    void loadPrices();

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCropId, priceReload]);

  const selectedCrop = crops.find(
    (crop) => String(crop.cropId) === selectedCropId,
  );

  const comparablePrices = useMemo(
    () =>
      prices
        .filter(
          (price) =>
            price.priceType === priceType &&
            Number.isFinite(Number(price.priceLkrPerKg)) &&
            Number(price.priceLkrPerKg) > 0,
        )
        .sort(
          (a, b) =>
            Number(b.priceLkrPerKg) - Number(a.priceLkrPerKg),
        ),
    [prices, priceType],
  );

  const bestPrice = comparablePrices[0];

  const nearest = useMemo(
    () =>
      comparablePrices
        .filter(
          (price) =>
            price.distanceKm != null &&
            Number.isFinite(Number(price.distanceKm)) &&
            Number(price.distanceKm) >= 0,
        )
        .sort(
          (a, b) => Number(a.distanceKm) - Number(b.distanceKm),
        )[0],
    [comparablePrices],
  );

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) =>
      [
        record.cropName,
        record.variety,
        record.farmName,
        record.fieldName,
        record.soldMarket,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [records, search]);

  const kg = Number(expectedKg);
  const validKg =
    expectedKg.trim() !== "" && Number.isFinite(kg) && kg > 0;

  function openHarvest(record: Harvest | null = null) {
    setEditing(record);
    setFormError("");
    setShowHarvestForm(true);
  }

  function openPriceForm() {
    setFormError("");
    setShowPriceForm(true);
  }

  async function saveHarvest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const form = new FormData(event.currentTarget);
    const cropId = Number(form.get("cropId"));
    const quantityKg = Number(form.get("quantityKg"));
    const unitPrice = optionalNumber(form, "unitPriceLkrPerKg");
    const harvestedOn = textValue(form, "harvestedOn");

    if (
      !Number.isInteger(cropId) ||
      cropId <= 0 ||
      !Number.isFinite(quantityKg) ||
      quantityKg <= 0 ||
      !harvestedOn ||
      harvestedOn > todayInSriLanka() ||
      (unitPrice !== null &&
        (!Number.isFinite(unitPrice) || unitPrice <= 0))
    ) {
      setFormError(t("Enter a valid crop, harvest date, quantity and sale price."));
      return;
    }

    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      const response = await fetchWithAuth(
        editing ? `/api/harvest/${editing.id}` : "/api/harvest",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify({
            cropId,
            harvestedOn,
            quantityKg,
            grade: textValue(form, "grade") || null,
            unitPriceLkrPerKg: unitPrice,
            soldMarket: textValue(form, "soldMarket") || null,
            notes: textValue(form, "notes") || null,
          }),
        },
      );

      await ensureSuccess(response);

      setShowHarvestForm(false);
      setEditing(null);
      setNotice(
        editing ? t("Harvest record updated.") : t("Harvest record saved."),
      );

      await loadPage();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function savePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const form = new FormData(event.currentTarget);
    const cropId = Number(form.get("cropId"));
    const price = Number(form.get("priceLkrPerKg"));
    const observedOn = textValue(form, "observedOn");
    const latitude = optionalNumber(form, "marketLatitude");
    const longitude = optionalNumber(form, "marketLongitude");
    const sourceUrl = textValue(form, "sourceUrl");

    if (
      !Number.isInteger(cropId) ||
      cropId <= 0 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !observedOn ||
      observedOn > todayInSriLanka() ||
      !textValue(form, "marketName") ||
      !textValue(form, "sourceName")
    ) {
      setFormError(t("Enter a valid crop, market, report date, price and source."));
      return;
    }

    if (
      (latitude === null) !== (longitude === null) ||
      (latitude !== null &&
        (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
      (longitude !== null &&
        (!Number.isFinite(longitude) || Math.abs(longitude) > 180))
    ) {
      setFormError(t("Enter both valid market coordinates, or leave both empty."));
      return;
    }

    if (sourceUrl && !safeLink(sourceUrl)?.startsWith("https://")) {
      setFormError(t("Enter a valid HTTPS source link."));
      return;
    }

    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      const response = await fetchWithAuth(
        "/api/harvest/market-prices",
        {
          method: "POST",
          body: JSON.stringify({
            cropId,
            marketName: textValue(form, "marketName"),
            observedOn,
            priceLkrPerKg: price,
            priceType: textValue(form, "priceType"),
            sourceName: textValue(form, "sourceName"),
            sourceUrl: sourceUrl || null,
            marketLatitude: latitude,
            marketLongitude: longitude,
          }),
        },
      );

      await ensureSuccess(response);

      setSelectedCropId(String(cropId));
      setPriceType(textValue(form, "priceType"));
      setPriceReload((value) => value + 1);
      setShowPriceForm(false);
      setNotice(t("Market price saved with its report date and source."));
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteHarvest(record: Harvest) {
    if (deletingId !== null) return;

    if (
      !window.confirm(
        `${t("Delete the harvest record for")} ${record.cropName} ${t("on")} ${dateLabel(record.harvestedOn)}?`,
      )
    ) {
      return;
    }

    setDeletingId(record.id);
    setError("");
    setNotice("");

    try {
      const response = await fetchWithAuth(
        `/api/harvest/${record.id}`,
        { method: "DELETE" },
      );

      await ensureSuccess(response);
      setNotice(t("Harvest record deleted."));
      await loadPage();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              {t("AgroFarm / Harvest")}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t("Harvest & Market Prices")}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("Record your harvest and compare dated market prices.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButton}
              disabled={loading || pricesLoading}
              onClick={() => {
                void loadPage();
                setPriceReload((value) => value + 1);
              }}
            >
              <RefreshCw
                size={16}
                className={loading || pricesLoading ? "animate-spin" : ""}
              />
              {t("Refresh")}
            </button>

            <button
              type="button"
              className={primaryButton}
              disabled={loading || crops.length === 0}
              onClick={() => openHarvest()}
            >
              <Plus size={17} />
              {t("Record harvest")}
            </button>
          </div>
        </header>

        {error && <Message kind="error">{error}</Message>}
        {notice && <Message kind="success">{notice}</Message>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            title={t("Harvested · last 30 days")}
            value={`${quantityLabel(summary.totalQuantityKg)} kg`}
            icon={<Leaf size={20} />}
          />
          <Stat
            title={t("Crops harvested · last 30 days")}
            value={quantityLabel(summary.cropCount)}
            icon={<Leaf size={20} />}
          />
          <Stat
            title={t("Harvest entries · last 30 days")}
            value={quantityLabel(summary.recordCount)}
            icon={<Calendar size={20} />}
          />
          <Stat
            title={t("Recorded harvest value · last 30 days")}
            value={money(summary.recordedSalesLkr)}
            icon={<Coins size={20} />}
          />
        </section>

        <OfficialMarketPrices cropName={selectedCrop?.cropName} variety={selectedCrop?.variety} />

        <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-emerald-50/70 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t("Manual market observations")}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  {t("Open the official bulletin and enter the reported price, market and publication date. Saved prices are manual observations.")}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <a
                  href={HARTI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={secondaryButton}
                >
                  <ExternalLink size={16} />
                  {t("Open HARTI")}
                </a>

                {canManagePrices && (
                  <button
                    type="button"
                    className={primaryButton}
                    disabled={loading || crops.length === 0}
                    onClick={openPriceForm}
                  >
                    <Plus size={16} />
                    {t("Add market price")}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={t("Registered crop")}>
                <select
                  value={selectedCropId}
                  onChange={(event) => {
                    setSelectedCropId(event.target.value);
                    setExpectedKg("");
                  }}
                  className={inputClass}
                  disabled={loading || crops.length === 0}
                >
                  {crops.length === 0 && (
                    <option value="">{t("No registered crops")}</option>
                  )}
                  {crops.map((crop) => (
                    <option key={crop.cropId} value={crop.cropId}>
                      {crop.cropName}
                      {crop.variety ? ` · ${crop.variety}` : ""}
                      {" — "}
                      {crop.farmName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t("Compare price type")}>
                <select
                  value={priceType}
                  onChange={(event) => setPriceType(event.target.value)}
                  className={inputClass}
                >
                  <option value="WHOLESALE">{t("Wholesale")}</option>
                  <option value="FARMGATE">{t("Farm-gate")}</option>
                  <option value="RETAIL">{t("Retail")}</option>
                </select>
              </Field>

              <Field label={t("Expected quantity (kg)")}>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={expectedKg}
                  onChange={(event) => setExpectedKg(event.target.value)}
                  placeholder={t("e.g. 100")}
                  className={inputClass}
                />
              </Field>
            </div>

            {selectedCrop && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {selectedCrop.cropName}
                  {selectedCrop.variety ? ` · ${selectedCrop.variety}` : ""}
                </span>
                <span>
                  {selectedCrop.farmName}
                  {selectedCrop.fieldName ? ` / ${selectedCrop.fieldName}` : ""}
                </span>
                {selectedCrop.expectedHarvestDate && (
                  <span>
                    {t("Expected harvest:")} {dateLabel(selectedCrop.expectedHarvestDate)}
                  </span>
                )}
              </div>
            )}

            {priceError ? (
              <Message kind="error">{priceError}</Message>
            ) : pricesLoading ? (
              <EmptyState title={t("Loading saved market prices…")} />
            ) : !selectedCrop ? (
              <EmptyState
                title={t("Select a registered crop")}
                description={t("Register a crop first to start recording harvests and market prices.")}
              />
            ) : comparablePrices.length === 0 ? (
              <EmptyState
                title={t("No saved prices for this price type")}
                description={t("Check the HARTI bulletin and add a dated observation. Only prices returned by the backend are shown.")}
              />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Highlight
                    title={t("Highest saved observation")}
                    value={`${money(bestPrice.priceLkrPerKg)} / kg`}
                    detail={`${bestPrice.marketName} · ${dateLabel(bestPrice.observedOn)}`}
                  />
                  <Highlight
                    title={t("Nearest priced market")}
                    value={nearest?.marketName ?? t("Coordinates needed")}
                    detail={
                      nearest
                        ? `${t("Approximately")} ${quantityLabel(nearest.distanceKm)} ${t("km straight-line")}`
                        : t("Enter market coordinates when adding a price.")
                    }
                  />
                  <Highlight
                    title={t("Estimated gross revenue")}
                    value={
                      validKg
                        ? money(kg * Number(bestPrice.priceLkrPerKg))
                        : t("Enter quantity")
                    }
                    detail={
                      validKg
                        ? `${quantityLabel(kg)} kg ${t("at the highest reported price")}`
                        : t("Calculated using the selected price type.")
                    }
                  />
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">{t("Market")}</th>
                        <th className="px-4 py-3">{t("Price / kg")}</th>
                        <th className="px-4 py-3">{t("Report date")}</th>
                        <th className="px-4 py-3">{t("Distance")}</th>
                        <th className="px-4 py-3">{t("Source")}</th>
                        <th className="px-4 py-3">{t("Gross revenue")}</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {comparablePrices.map((price) => {
                        const source = safeLink(price.sourceUrl);
                        const route = safeLink(price.googleMapsUrl);

                        return (
                          <tr key={price.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900">
                                {price.marketName}
                              </p>
                              {Number(price.priceLkrPerKg) ===
                                Number(bestPrice.priceLkrPerKg) && (
                                <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  {t("HIGHEST SAVED")}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-900">
                              {money(price.priceLkrPerKg)}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {dateLabel(price.observedOn)}
                              {Number(price.daysOld) > 0 && (
                                <span className="block text-xs text-amber-700">{price.daysOld} {t("days old · saved observation")}</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {price.distanceKm != null
                                ? `~${quantityLabel(price.distanceKm)} km`
                                : "—"}
                              {route && (
                                <a
                                  href={route}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-700"
                                >
                                  <MapPin size={12} />
                                  {t("View route")}
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {source ? (
                                <a
                                  href={source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-emerald-700 underline"
                                >
                                  {price.sourceName}
                                  <ExternalLink size={12} />
                                </a>
                              ) : (
                                price.sourceName
                              )}
                            </td>
                            <td className="px-4 py-4 font-medium text-slate-800">
                              {validKg
                                ? money(kg * Number(price.priceLkrPerKg))
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <p className="text-xs leading-5 text-slate-500">
              {t("Prices are manually entered observations, not live quotes or guaranteed buyer offers. Check the report date and variety. Gross revenue excludes transport, fees and losses. Distance is a straight-line estimate.")}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {t("Harvest records")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredRecords.length} {t("matching records")}
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                aria-label={t("Search harvest records")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Search crop, farm or market")}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {loading ? (
            <EmptyState title={t("Loading harvest records…")} />
          ) : filteredRecords.length === 0 ? (
            <EmptyState
              title={search ? t("No matching records") : t("No harvest records yet")}
              description={
                search
                  ? t("Try a different crop, farm or market name.")
                  : t("Use Record harvest to add your first entry.")
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t("Crop / farm")}</th>
                    <th className="px-5 py-3">{t("Harvest date")}</th>
                    <th className="px-5 py-3">{t("Quantity")}</th>
                    <th className="px-5 py-3">{t("Grade")}</th>
                    <th className="px-5 py-3">{t("Sale / buyer")}</th>
                    <th className="px-5 py-3">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {record.cropName}
                          {record.variety ? ` · ${record.variety}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {record.farmName}
                          {record.fieldName ? ` / ${record.fieldName}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {dateLabel(record.harvestedOn)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {quantityLabel(record.quantityKg)} kg
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {record.grade || t("Not graded")}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-700">
                          {record.soldMarket || t("Not entered")}
                        </p>
                        {record.unitPriceLkrPerKg != null && (
                          <p className="mt-1 text-xs text-slate-500">
                            {money(record.unitPriceLkrPerKg)} / kg
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${record.cropName} harvest`}
                            onClick={() => openHarvest(record)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId !== null}
                            aria-label={`Delete ${record.cropName} harvest`}
                            onClick={() => void deleteHarvest(record)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showHarvestForm && (
        <Modal
          title={editing ? t("Edit harvest record") : t("Record harvest")}
          busy={saving}
          onClose={() => setShowHarvestForm(false)}
        >
          <form onSubmit={saveHarvest} className="space-y-4">
            {formError && <Message kind="error">{formError}</Message>}

            <fieldset disabled={saving} className="space-y-4">
              <Field label={t("Registered crop")}>
                <select
                  name="cropId"
                  required
                  defaultValue={String(editing?.cropId ?? selectedCropId)}
                  className={inputClass}
                >
                  {editing &&
                    !crops.some((crop) => crop.cropId === editing.cropId) && (
                      <option value={editing.cropId}>
                        {editing.cropName} — {editing.farmName}
                      </option>
                    )}
                  {crops.map((crop) => (
                    <option key={crop.cropId} value={crop.cropId}>
                      {crop.cropName}
                      {crop.variety ? ` · ${crop.variety}` : ""}
                      {" — "}
                      {crop.farmName}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Harvest date")}>
                  <input
                    name="harvestedOn"
                    type="date"
                    required
                    max={todayInSriLanka()}
                    defaultValue={
                      editing?.harvestedOn?.slice(0, 10) ?? todayInSriLanka()
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label={t("Quantity (kg)")}>
                  <input
                    name="quantityKg"
                    type="number"
                    required
                    min="0.001"
                    step="0.001"
                    defaultValue={editing?.quantityKg ?? ""}
                    className={inputClass}
                  />
                </Field>

                <Field label={t("Quality grade")}>
                  <input
                    name="grade"
                    maxLength={30}
                    defaultValue={editing?.grade ?? ""}
                    placeholder={t("e.g. Grade A")}
                    className={inputClass}
                  />
                </Field>

                <Field label={t("Sale price (LKR / kg)")}>
                  <input
                    name="unitPriceLkrPerKg"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={editing?.unitPriceLkrPerKg ?? ""}
                    placeholder={t("Optional")}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label={t("Buyer / market")}>
                <input
                  name="soldMarket"
                  maxLength={150}
                  defaultValue={editing?.soldMarket ?? ""}
                  placeholder={t("Optional")}
                  className={inputClass}
                />
              </Field>

              <Field label={t("Notes")}>
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={1000}
                  defaultValue={editing?.notes ?? ""}
                  placeholder={t("Quality, storage or other details")}
                  className={inputClass}
                />
              </Field>
            </fieldset>

            <FormActions
              saving={saving}
              label={editing ? t("Update harvest") : t("Save harvest")}
              onCancel={() => setShowHarvestForm(false)}
            />
          </form>
        </Modal>
      )}

      {showPriceForm && canManagePrices && (
        <Modal
          title={t("Add a market price")}
          busy={saving}
          onClose={() => setShowPriceForm(false)}
        >
          <form onSubmit={savePrice} className="space-y-4">
            <div className="rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              {t("Use the price and date printed in the HARTI bulletin. Enter prices in LKR per kilogram.")}
              <a
                href={HARTI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block font-semibold underline"
              >
                {t("Open HARTI bulletin")}
              </a>
            </div>

            {formError && <Message kind="error">{formError}</Message>}

            <fieldset disabled={saving} className="space-y-4">
              <Field label={t("Registered crop")}>
                <select
                  name="cropId"
                  required
                  defaultValue={selectedCropId}
                  className={inputClass}
                >
                  {crops.map((crop) => (
                    <option key={crop.cropId} value={crop.cropId}>
                      {crop.cropName}
                      {crop.variety ? ` · ${crop.variety}` : ""}
                      {" — "}
                      {crop.farmName}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Market name")}>
                  <input
                    name="marketName"
                    required
                    maxLength={150}
                    placeholder={t("e.g. Dambulla")}
                    className={inputClass}
                  />
                </Field>

                <Field label={t("Price type")}>
                  <select
                    name="priceType"
                    defaultValue={priceType}
                    className={inputClass}
                  >
                    <option value="WHOLESALE">{t("Wholesale")}</option>
                    <option value="FARMGATE">{t("Farm-gate")}</option>
                    <option value="RETAIL">{t("Retail")}</option>
                  </select>
                </Field>

                <Field label={t("Report / observation date")}>
                  <input
                    name="observedOn"
                    type="date"
                    required
                    max={todayInSriLanka()}
                    className={inputClass}
                  />
                </Field>

                <Field label={t("Price (LKR / kg)")}>
                  <input
                    name="priceLkrPerKg"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 250.00"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label={t("Source name")}>
                <input
                  name="sourceName"
                  required
                  maxLength={120}
                  defaultValue="HARTI"
                  className={inputClass}
                />
              </Field>

              <Field label={t("Source / report link")}>
                <input
                  name="sourceUrl"
                  type="url"
                  maxLength={500}
                  defaultValue={HARTI_URL}
                  className={inputClass}
                />
              </Field>

              <details className="rounded-xl border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  {t("Market location — optional")}
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {t("Enter both coordinates to calculate straight-line distance.")}
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label={t("Latitude")}>
                    <input
                      name="marketLatitude"
                      type="number"
                      min="-90"
                      max="90"
                      step="0.0000001"
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t("Longitude")}>
                    <input
                      name="marketLongitude"
                      type="number"
                      min="-180"
                      max="180"
                      step="0.0000001"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </details>
            </fieldset>

            <FormActions
              saving={saving}
              label={t("Save market price")}
              onCancel={() => setShowPriceForm(false)}
            />
          </form>
        </Modal>
      )}
    </main>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{title}</p>
        <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
          {icon}
        </span>
      </div>
      <p className="mt-4 break-words text-2xl font-bold text-slate-900">
        {value}
      </p>
    </article>
  );
}

function Highlight({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
        {title}
      </p>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Message({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${
        kind === "error"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {children}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function FormActions({
  saving,
  label,
  onCancel,
}: {
  saving: boolean;
  label: string;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button
        type="button"
        disabled={saving}
        onClick={onCancel}
        className={secondaryButton}
      >
        {t("Cancel")}
      </button>
      <button type="submit" disabled={saving} className={primaryButton}>
        {saving ? t("Saving…") : label}
      </button>
    </div>
  );
}

function Modal({
  title,
  busy,
  onClose,
  children,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close form"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}