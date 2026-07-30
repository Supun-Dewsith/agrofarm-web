import { useState, useEffect } from 'react';
import { Sprout, MapPin, Calendar, Layers, PlusCircle, Check } from 'lucide-react';
import { fetchWithAuth, getAuthData } from '../utils/auth';

interface FarmOption {
  id: string;
  name: string;
  location: string;
}




const INITIAL_FARMS: FarmOption[] = [
  { id: '1', name: 'Asanka Pradeep', location: 'Niwala, SL' },
  { id: '2', name: 'Pathum Dilshan', location: 'Gamapaha, SL' },
  { id: '3', name: 'Kasun Tharindu', location: 'Athanagalla, SL' },
  { id: '4', name: 'Kavin Thivakar', location: 'Mawannalla, SL' },
  { id: '5', name: 'Nuwan Chalanka', location: 'Kuliyapitiya, SL' },
];

interface ApiErrorResponse {
  message?: string;
  error?: string;
  status?: number;
}

export default function Page() {

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [farms, setFarms] = useState<any>(null);

useEffect(() => {
  const loadFarmdetails = async () => {

      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetchWithAuth(
          "http://localhost:8080/api/crops/farms",
          {
            method: "GET"
          }
        );

        const data = await response.json();
        if (!response.ok) {
          const errorData = data as ApiErrorResponse;
          setErrorMessage(errorData.message || "There are no farms rejistered under this user.");
          setFarms(null);
        } else {
          setFarms(data);
        }
      } catch (err) {
        console.error("Failed to fetch farm data:", err);
        setErrorMessage("No farms rejistered.");
        setFarms(null);
      } finally {
        setLoading(false);
      }
  };

  loadFarmdetails();
}, []);






  const [formData, setFormData] = useState({
    cropName: '',
    variety: '',
    farmId: '',
    fieldName: '',
    area: '',
    growthStage: 'Planted',
    progress: 0 as 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100,
    status: 'Healthy' as 'Healthy' | 'Moderate' | 'Critical',
    plantDate: '',
    harvestDate: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Handle form submission logic here (e.g., API call or state update)
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 font-sans text-gray-800">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Crop</h1>
            <p className="text-sm text-gray-400 mt-1">Register a new crop and assign it to a farmer's field.</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sprout className="w-6 h-6" />
          </div>
        </div>

        {/* Success Alert */}
        {submitted && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-medium">
            <Check className="w-5 h-5 text-emerald-600" />
            Crop successfully registered and assigned to the selected farm!
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Crop Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Crop Name
              </label>
              <input
                type="text"
                name="cropName"
                required
                value={formData.cropName}
                onChange={handleChange}
                placeholder="e.g. Tomato, Corn, Rice"
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Variety */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Variety / Subtype
              </label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleChange}
                placeholder="e.g. Cherry Tomato, Basmati"
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

          </div>

          {/* Farm & Field Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Select Farm */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Planted Farm
              </label>
              <select
                name="farmId"
                required
                value={formData.farmId}
                onChange={handleChange}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select a farm...</option>
                {INITIAL_FARMS.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name} ({farm.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Field Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Field Name / Designation
              </label>
              <input
                type="text"
                name="fieldName"
                required
                value={formData.fieldName}
                onChange={handleChange}
                placeholder="e.g. Field A"
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

          </div>

          {/* Area & Growth Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Area */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Farm Area Size
              </label>
              <input
                type="text"
                name="area"
                required
                value={formData.area}
                onChange={handleChange}
                placeholder="e.g. 5 acres"
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Growth Stage */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Initial Growth Stage
              </label>
              <select
                name="growthStage"
                value={formData.growthStage}
                onChange={handleChange}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Planted">Planted</option>
                <option value="Tillering">Tillering</option>
                <option value="Flowering">Flowering</option>
                <option value="Grain Filling">Grain Filling</option>
                <option value="Maturity">Maturity</option>
              </select>
            </div>

          </div>

          {/* Status & Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Crop Health Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Healthy">Healthy</option>
                <option value="Moderate">Moderate</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Progress */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Progress Percentage (%)
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
                Planted Date
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
                Expected Harvest Date
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

          {/* Submit Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-6 py-3 rounded-xl transition-colors shadow-sm text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Save Crop Record
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}