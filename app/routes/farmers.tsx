import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '~/utils/auth';
import { Search, Plus, Phone, Mail, MoreVertical } from 'lucide-react';

interface Worker {
  id: number;
  name: string;
  phone: string;
  email: string;
  farm: string;
  tasks: string[];
  status: string;
  joinDate: string;
  profilePicture: string;
  role: string;
}

interface Farm {
  farmIDs: number;
  farmNames: string;
}

export default function FarmerManagement() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [workerError, setWorkerError] = useState('');
  const [farmError, setFarmError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('all');

  // Fetch workers
  useEffect(() => {
    fetchWithAuth('/api/worker/workers')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Worker API is not available');
        }

        return res.json();
      })
      .then((data) => {
        console.log('Worker API response:', data);

        if (Array.isArray(data)) {
          setWorkers(data);
          setWorkerError('');
        } else {
          console.error('Expected worker array but received:', data);
          setWorkers([]);
          setWorkerError('Worker data is currently unavailable.');
        }
      })
      .catch((err) => {
        console.error('Worker API error:', err);
        setWorkers([]);
        setWorkerError('Worker data is currently unavailable.');
      });
  }, []);

  // Fetch farms
  useEffect(() => {
    fetchWithAuth('/api/worker/farms')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Farm API is not available');
        }

        return res.json();
      })
      .then((data) => {
        console.log('Farm API response:', data);

        if (Array.isArray(data)) {
          setFarms(data);
          setFarmError('');
        } else {
          console.error('Expected farm array but received:', data);
          setFarms([]);
          setFarmError('Farm data is currently unavailable.');
        }
      })
      .catch((err) => {
        console.error('Farm API error:', err);
        setFarms([]);
        setFarmError('Farm data is currently unavailable.');
      });
  }, []);

  // Search + farm filtering
  const filteredWorkers = workers.filter((worker) => {
    const matchesSearch =
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.farm.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFarm =
      selectedFarm === 'all' ||
      worker.farm === selectedFarm;

    return matchesSearch && matchesFarm;
  });

  const activeCount = workers.filter((worker) => worker.status.toLowerCase() === 'active').length;
  const totalCount = workers.length;

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2A471C] tracking-tight">Farmer Management</h1>
            <p className="text-sm text-gray-600 mt-0.5">Manage and track all registered farmers</p>
          </div>

          <button className="inline-flex items-center justify-center gap-2 bg-[#2A471C] hover:bg-[#203714] text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer">
            <Plus className="w-4 h-4" />
            Add Farmer
          </button>
        </div>

        {/* Search + Filter + Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Search and Farm Filter */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">

            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-700" />

              <input
                type="text"
                placeholder="Search farmers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Farm Filter */}
            <select
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">All Farms</option>

              {farms.map((farm) => (
                <option key={farm.farmIDs} value={farm.farmNames}>
                  {farm.farmNames}
                </option>
              ))}
            </select>

            {farmError && (
              <p className="text-xs text-gray-400">{farmError}</p>
            )}

          </div>

          {/* Active Farmers */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Farmers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{activeCount}</p>
            </div>

            <div className="w-6 h-6 rounded-full border-2 border-emerald-600 flex items-center justify-center p-0.5">
              <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
            </div>
          </div>

          {/* Total Farmers */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Farmers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalCount}</p>
            </div>

            <div className="w-6 h-6 rounded-full border-2 border-blue-600 flex items-center justify-center p-0.5">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
            </div>
          </div>

        </div>

        {/* Farmers Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse">

              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">
                  <th className="py-4 px-6">Farmer</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Contact</th>
                  <th className="py-4 px-6">Farm</th>
                  <th className="py-4 px-6">Tasks</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Join Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-sm">

                {filteredWorkers.length > 0 ? (

                  filteredWorkers.map((worker) => (

                    <tr key={`${worker.id}-${worker.farm}`} className="hover:bg-gray-50/50 transition-colors">

                      {/* Farmer */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">

                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">

                            {worker.profilePicture ? (
                              <img src={worker.profilePicture} alt={worker.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold text-xs">
                                {worker.name.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            )}

                          </div>

                          <span className="font-semibold text-gray-900">{worker.name}</span>

                        </div>
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">{worker.role}</td>

                      {/* Contact */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="space-y-1">

                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{worker.phone}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{worker.email}</span>
                          </div>

                        </div>
                      </td>

                      {/* Farm */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-gray-700 text-xs font-medium">{worker.farm}</span>
                      </td>

                      {/* Tasks */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">

                          {Array.isArray(worker.tasks) && worker.tasks.map((task, index) => (
                            <span key={index} className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              {task}
                            </span>
                          ))}

                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${worker.status.toLowerCase() === 'active' ? 'bg-[#008728]' : 'bg-gray-400'}`}>
                          {worker.status}
                        </span>
                      </td>

                      {/* Join Date */}
                      <td className="py-4 px-6 whitespace-nowrap text-gray-600 text-xs">
                        {worker.joinDate}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 whitespace-nowrap text-right">
                        <button className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                      {workerError
                        ? workerError
                        : searchTerm || selectedFarm !== 'all'
                          ? 'No farmers found matching your filters.'
                          : 'No farmer data available.'}
                    </td>
                  </tr>

                )}

              </tbody>

            </table>

          </div>
        </div>

      </div>
    </div>
  );
}
