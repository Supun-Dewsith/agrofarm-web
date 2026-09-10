import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, CheckCircle, AlertTriangle, AlertCircle, Filter, Calendar } from 'lucide-react';
import { data, useNavigate } from 'react-router';
import { fetchWithAuth } from '~/utils/auth';






// --------------- interfaces ------------------

interface Crop {
  id: string;
  name: string;
  variety: string;
  image: string;
  field: string;
  area: string;
  growthStage: string;
  progress: number;
  status: 'Healthy' | 'Moderate' | 'Critical';
  plantDate: string;
  harvestDate: string;
}


interface farms {
  farmIDs: number;
  farmNames: string;
}






// ------------- function page --------------
export default function Page() {


  


  // ------------ usestate --------------------
  const navigate = useNavigate();
  
  const [selectedFilter, setSelectedFilter] = useState<string>('All Crops');

  const [items, setItems] = useState<farms[]>([]);
  const [selected, setSelected] = useState('');
  const [crops, setCrops] = useState<Crop[]>([]);
  

  const [error, setError] = useState("");


  // ------------- functions ------------

  function checkFarmId(){
    
  }


  async function handleDelete(cropId: string) {

  const confirmed = window.confirm(
    "Are you sure you want to delete this crop?"
  );

  if (!confirmed) {
    return;
  }

  try {

    const response = await fetchWithAuth(
      `/api/crops/${cropId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete crop");
    }

    // Remove deleted crop from the current list
    setCrops((currentCrops) =>
      currentCrops.filter((crop) => crop.id !== cropId)
    );

  } catch (error) {

    console.error(error);
    setError("Failed to delete crop.");

  }
}

  // ------------- methods -------------  

    // ---------  get methods  --------

    // request farms

  useEffect(() => {
    fetchWithAuth('/api/crops/farms')
      .then((res) => res.json())
      .then((data: unknown) => {

        const farms = data as farms[];

         if (farms.length === 0) {
          setError("No farms found.");
         } else{
          console.log(data);
          setItems(data as farms[]);
         }
      })
      .catch(console.error);
      
  }, []); 


    // request crop details

  useEffect(() => {

    if (!selected){
      return;
    }
    console.log("Selected farm ID: ",selected);

    fetchWithAuth('/api/crops/crops', {
      method: "POST",
      body: JSON.stringify(Number(selected)),
    })
      .then((res) => res.json())
      .then((data: unknown) => {

        const crops = data as Crop[];

         if (crops.length === 0) {
          setError("No crops found.");
          setCrops([]);
         } else{
          console.log(data);
          setCrops(data as Crop[]);
         }
      })
      .catch(console.error);
      
  }, [selected]);  

  



  // ------------ filters --------------------
  const totalCrops = crops.length;
  const healthyCount = crops.filter(c => c.status === 'Healthy').length;
  const moderateCount = crops.filter(c => c.status === 'Moderate').length;
  const criticalCount = crops.filter(c => c.status === 'Critical').length;

  const filteredCrops = useMemo(() => {
    if (selectedFilter === 'All Crops') return crops;
    return crops.filter(c => c.status.toLowerCase() === selectedFilter.toLowerCase());
  }, [crops, selectedFilter]);





  // ------------ the web page -----------


  return (
    <div className="min-h-screen bg-gray-50/50 p-6 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

    {/* cropinserting button and choose farm button*/}
      {/* Crop actions and farm selection */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Select Farm
            </p>

            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full sm:w-64 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select a farm</option>

              {items.map((item) => (
                <option key={item.farmIDs} value={item.farmIDs}>
                  {item.farmNames}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate("/home/cropInsert")}
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-emerald-700 text-white text-sm font-semibold shadow-sm hover:bg-emerald-800 transition-colors"
          >
            + Insert Crop
          </button>

        </div>

        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}


        {/* Top Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Crops */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Crops</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalCrops}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Healthy */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Healthy</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{healthyCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          {/* Moderate */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Moderate</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{moderateCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Critical */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Critical</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{criticalCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white border border-gray-200 text-emerald-700 shadow-sm">
            <Filter className="w-4 h-4" />
          </div>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option>All Crops</option>
            <option>Healthy</option>
            <option>Moderate</option>
            <option>Critical</option>
          </select>
        </div>

        {/* Crops Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCrops.map((crop) => (
            <div key={crop.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between p-5 space-y-4">
              
              {/* Image Section */}
              <div className="relative h-48 rounded-2xl overflow-hidden">
                <img src={crop.image} alt={crop.name} className="w-full h-full object-cover" />
              </div>

              {/* Title / Variety */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{crop.name}</h2>
                {crop.variety && <p className="text-sm text-gray-500">{crop.variety}</p>}
              </div>

              {/* Details List */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100 text-sm">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Field:</span>
                  <span className="font-semibold text-gray-900">{crop.field}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Area:</span>
                  <span className="font-semibold text-gray-900">{crop.area}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Growth Stage:</span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                    {crop.growthStage}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-semibold text-gray-600">
                  <span>Progress</span>
                  <span>{crop.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-700 h-full rounded-full"
                    style={{ width: `${crop.progress}%` }}
                  />
                </div>
              </div>

              {/* Footer Icons / Dates */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-gray-400 text-xs">

                {/* Planted Date */}
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1 text-gray-900 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {crop.plantDate
                        ? new Date(crop.plantDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>

                  <span className="text-gray-400 mt-1">
                    Planted
                  </span>
                </div>

                {/* Harvest Date */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-gray-900 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {crop.harvestDate
                        ? new Date(crop.harvestDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>

                  <span className="text-gray-400 mt-1">
                    Harvest
                  </span>
                </div>

              </div>
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => navigate(`/home/cropUpdate/${crop.id}`)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition"
                >
                  Update
                </button>

                <button
                  onClick={() => handleDelete(crop.id)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition"
                >
                  Delete
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}