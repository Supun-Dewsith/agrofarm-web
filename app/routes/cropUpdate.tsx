import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Sprout, MapPin, Calendar, Layers, PlusCircle, Check } from 'lucide-react';
import { fetchWithAuth, getAuthData } from '../utils/auth';
import { useTranslation } from 'react-i18next';

interface FarmOption {
  id: string;
  name: string;
  location: string;
}






interface ApiErrorResponse {
  message?: string;
  error?: string;
  status?: number;
}

interface NewfarmResponse {
  respomse: string;
}

interface Farm {
  id: number;
  name: string;
  location: string;
}


interface Farms{
  farmIDs: number;
  farmNames: string;
}

interface Fields{
  id: number;
  field_name: string;
  field_size: number;
  size_unit: number;
}

// ----------------- functions ---------------------//




export default function Page() {
  const { t } = useTranslation();
  const { id } = useParams();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [farms, setFarms] = useState<Farms[]>([]);
  const [fields, setFields] = useState<Fields[]>([]);
  const [error, setError] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [selectedfarmname, setSelectedFarmName] = useState('Select a farm');
  const [selectedfieldname, setSelectedFieldName] = useState('Select a farm');
  const [cropImage, setCropImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    cropName: '',
    variety: '',
    farmId: '',
    fieldId: '',
    growthStage: 'Planted',
    progress: 0 as 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100,
    status: 'Healthy' as 'Healthy' | 'Moderate' | 'Critical',
    plantDate: '',
    harvestDate: '',
  });




  // ----------------- methods -------------------//

  useEffect(() => {
  if (!id) return;

  fetchWithAuth(`/api/crops/${id}`)
    .then((res) => res.json())
    .then((data: any) => {

      setFormData({
        cropName: data.name,
        variety: data.variety,
        farmId: String(data.farmId),
        fieldId: String(data.fieldId),
        growthStage: data.growthStage,
        progress: data.progress,
        status: data.status,
        plantDate: data.plantDate
          ? data.plantDate.substring(0, 10)
          : '',
        harvestDate: data.harvestDate
          ? data.harvestDate.substring(0, 10)
          : '',
      });

      setSelectedFarm(String(data.farmId));
      setSelectedField(String(data.fieldId));

      if (data.image) {
        setImagePreview(data.image);
      }
    })
    .catch((err) => {
      console.error("Failed to load crop:", err);
      setError(t("Failed to load crop."));
    });
}, [id, t]);


  // --------------- get farms ------------//
  useEffect(() => {
      fetchWithAuth('/api/crops/farms')
        .then((res) => res.json())
        .then((data: unknown) => {
  
          const farms = data as Farms[];
  
           if (farms.length === 0) {
            setError(t("No farms found."));
           } else{
            setFarms(data as Farms[]);
           }
        })
        .catch(console.error);
        
    }, [t]); 

  // ----------------- get fields ------------------//
  useEffect(() => {
  if (!selectedFarm) {
    setFields([]);
    return;
  }

  fetchWithAuth('/api/crops/fields', {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(Number(selectedFarm)),
  })
    .then((res) => res.json())
    .then((data: unknown) => {

      if (!Array.isArray(data)) {
        console.error("Expected fields array but received:", data);
        setFields([]);
        setError(t("Invalid fields response from server."));
        return;
      }

      if (data.length === 0) {
        setError(t("No fields found."));
        setFields([]);
      } else {
        setFields(data as Fields[]);
      }
    })
    .catch((err) => {
      console.error(err);
      setFields([]);
    });

  }, [selectedFarm, t]);




  


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!id) return;

  const cropData = {
    ...formData,
    farmId: Number(formData.farmId),
    fieldId: Number(formData.fieldId),
    progress: Number(formData.progress),
    plantDate: formData.plantDate
      ? `${formData.plantDate}T00:00:00`
      : null,
    harvestDate: formData.harvestDate
      ? `${formData.harvestDate}T00:00:00`
      : null,
  };


  try {
    const response = await fetchWithAuth(`/api/crops/update/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cropData),
    });

    if (!response.ok) {
      throw new Error("Failed to update crop");
    }

    setSubmitted(true);


  } catch (error) {
    console.error(error);
    setError(t("Failed to update crop."));
  }
};

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 font-sans text-gray-800">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("Update Crop")}</h1>
            <p className="text-sm text-gray-400 mt-1">{t("Modify crop details and assigned farmer's field.")}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sprout className="w-6 h-6" />
          </div>
        </div>

        {/* Success Alert */}
        {submitted && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-medium">
            <Check className="w-5 h-5 text-emerald-600" />
            {t("Crop successfully updated!")}
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Crop Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t("Crop Name")}
              </label>
              <input
                type="text"
                name="cropName"
                required
                value={formData.cropName}
                onChange={handleChange}
                placeholder={t("e.g. Tomato, Corn, Rice")}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Variety */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t("Variety / Subtype")}
              </label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleChange}
                placeholder={t("e.g. Cherry Tomato, Basmati")}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

          </div>

          {/* Farm & Field Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Select Farm */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t("Planted Farm")}
              </label>
              <select
                name="farmId"
                required
                value={formData.farmId}
                onChange={(e) => {
                  setSelectedFarm(e.target.value);
                  setSelectedFarmName(e.target.options[e.target.selectedIndex].text);
                  handleChange(e);
                }}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{t(selectedfarmname)}</option>
                {farms.map((farm) => (
                  <option key={farm.farmIDs} value={farm.farmIDs}>
                    {farm.farmNames}
                  </option>
                ))}
              </select>
            </div>
{/* --------------------------------------------------------------------------------------------------------------------- */}
            {/* Field Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t("Field Name / Designation")}
              </label>
              <select
                name="fieldId"
                required
                value={formData.fieldId}
                onChange={(e) => {
                  setSelectedField(e.target.value);
                  setSelectedFieldName(e.target.options[e.target.selectedIndex].text);
                  handleChange(e);
                }}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{t("Select a field...")}</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.field_name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Area & Growth Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            

            {/* Growth Stage */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t("Initial Growth Stage")}
              </label>
              <select
                name="growthStage"
                value={formData.growthStage}
                onChange={handleChange}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Planted">{t("Planted")}</option>
                <option value="Tillering">{t("Tillering")}</option>
                <option value="Flowering">{t("Flowering")}</option>
                <option value="Grain Filling">{t("Grain Filling")}</option>
                <option value="Maturity">{t("Maturity")}</option>
              </select>
            </div>

          </div>

          {/* Status & Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t("Crop Health Status")}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Healthy">{t("Healthy")}</option>
                <option value="Moderate">{t("Moderate")}</option>
                <option value="Critical">{t("Critical")}</option>
              </select>
            </div>

            {/* Progress */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t("Progress Percentage (%)")}
              </label>
              <select
                name="progress"
                value={formData.progress}
                onChange={handleChange}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="0">0</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="40">40</option>
                <option value="50">50</option>
                <option value="60">60</option>
                <option value="70">70</option>
                <option value="80">80</option>
                <option value="90">90</option>
                <option value="100">100</option>
              </select>
            </div>

          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t("Planted Date")}
              </label>
              <input
                type="date"
                name="plantDate"
                value={formData.plantDate}
                onChange={handleChange}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t("Expected Harvest Date")}
              </label>
              <input
                type="date"
                name="harvestDate"
                value={formData.harvestDate}
                onChange={handleChange}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-600"
              />
            </div>

          </div>
          
          {/* --- insert picture ---- */}
          <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t("Crop Image")}
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (file) {
                      setCropImage(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm"
                />

                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt={t("Crop preview")}
                      className="w-48 h-48 object-cover rounded-xl border border-gray-200"
                    />
                  </div>
                )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-6 py-3 rounded-xl transition-colors shadow-sm text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              {t("Update Crop Record")}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}