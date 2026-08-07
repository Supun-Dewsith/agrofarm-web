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
}


interface farms {
  id: number;
  name: string;
}



// ---------------  data -------------------

const INITIAL_CROPS: Crop[] = [
  {
    id: '1',
    name: 'Tomato',
    variety: 'Cherry Tomato',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600',
    field: 'Field A',
    area: '5 acres',
    growthStage: 'Flowering',
    progress: 65,
    status: 'Healthy',
  },
  {
    id: '2',
    name: 'CORN',
    variety: '',
    image: 'https://images.unsplash.com/photo-1551754655-cd9e3bac822b?auto=format&fit=crop&q=80&w=600',
    field: 'Field B',
    area: '15 acres',
    growthStage: 'Grain Filling',
    progress: 85,
    status: 'Healthy',
  },
  {
    id: '3',
    name: 'RICE',
    variety: 'Basmati',
    image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&q=80&w=600',
    field: 'Field C',
    area: '12 acres',
    growthStage: 'Tillering',
    progress: 45,
    status: 'Moderate',
  },
];


// ------------- function page --------------
export default function Page() {


  


  // ------------ usestate --------------------
  const navigate = useNavigate();
  const [crops] = useState<Crop[]>(INITIAL_CROPS);
  const [selectedFilter, setSelectedFilter] = useState<string>('All Crops');

  const [items, setItems] = useState<farms[]>([]);
  const [selected, setSelected] = useState('');

  

  const [error, setError] = useState("");




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


{/*useEffect(() => {
    fetchWithAuth('/api/crops/crops')
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
      
  }, []);*/}

  



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
      <div>  

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {/* cropinserting button */}
        <div>
          <button onClick={() => navigate("/home/cropInsert")}>
            Insert Crops
          </button>

        {/* choose farm dropdown list */}
        </div>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select an option</option>
            
            {items.map((item) => (
              <option key={item.id} value={item.id}> 
                {/* What the user actually reads on the screen */}
                {item.name} 
              </option>
            ))}
          </select>

        <div>

        </div>

      </div>


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
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Planted</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Harvest</span>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}