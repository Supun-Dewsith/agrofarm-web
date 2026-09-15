import React, { useState, useMemo, useEffect } from 'react';
import { fetchWithAuth } from '~/utils/auth';

import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  MoreVertical, 
  CheckCircle2, 
  Users 
} from 'lucide-react';

// Define TypeScript interfaces for the data model
interface Worker {
  id: number;
  initials: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  farm: string;
  tasks: string[];
  status: 'active' | 'Inactive';
  joinDate: string;
  profilePicture: string;
}

const [workers, setWorkers] = useState<Worker[]>([]);
const [error, setError] = useState("");

useEffect(() => {
    fetchWithAuth('/api/worker/workers')
      .then((res) => res.json())
      .then((data: unknown) => {

        const workers = data as [];

         if (workers.length === 0) {
          setError("No farms found.");
         } else{
          console.log(data);
          setWorkers(data as Worker[]);
         }
      })
      .catch(console.error);
      
  }, []); 

const initialFarmers: Worker[] = [
  {
    id: '1',
    initials: 'AP',
    name: 'Asanka Pradeep',
    phone: '+94070 23 65 483',
    email: 'Asankapradeep@agri.com',
    location: 'Niwala, SL',
    farm: '25 acres',
    tasks: ['cron', 'cocount', 'Rice'],
    status: 'active',
    joinDate: '2024.01.12',
    profilePicture: 'bg-emerald-900',
  },
  {
    id: '2',
    initials: 'PD',
    name: 'Pathum Dilshan',
    phone: '+94070 23 65 484',
    email: 'pathumdilshan@agri.com',
    location: 'Gamapaha, SL',
    farm: '15 acres',
    tasks: ['Tomatto'],
    status: 'active',
    joinDate: '2023.03.12',
    profilePicture: 'bg-emerald-900',
  },
  {
    id: '3',
    initials: 'KT',
    name: 'Kasun Tharindu',
    phone: '+94070 23 65 485',
    email: 'kusuntharindu@agri.com',
    location: 'Athanagalla, SL',
    farm: '4 acres',
    tasks: ['chill', 'cocount'],
    status: 'active',
    joinDate: '2024.01.12',
    profilePicture: 'bg-emerald-950',
  },
  {
    id: '4',
    initials: 'KT',
    name: 'Kavin Thivakar',
    phone: '+94070 23 65 486',
    email: 'kavinthivakar@agri.com',
    location: 'Mawannalla, SL',
    farm: '5 acres',
    tasks: ['cocount'],
    status: 'active',
    joinDate: '2024.11.12',
    profilePicture: 'bg-emerald-950',
  },
  {
    id: '5',
    initials: 'NC',
    name: 'Nuwan Chalanka',
    phone: '+94070 23 65 487',
    email: 'nuwanchalanka@agri.com',
    location: 'Kuliyapitiya, SL',
    farm: '2 acres',
    tasks: ['Rice', 'cocount'],
    status: 'Inactive',
    joinDate: '2021.01.12',
    profilePicture: 'bg-emerald-800',
  },
  {
    id: '6',
    initials: 'SE',
    name: 'Sajith Eranga',
    phone: '+94070 23 65 488',
    email: 'sajitheranga@agri.com',
    location: 'Niwala, SL',
    farm: '5 acres',
    tasks: ['cron'],
    status: 'active',
    joinDate: '2022.06.19',
    profilePicture: 'bg-emerald-900',
  },
  {
    id: '7',
    initials: 'KD',
    name: 'Kasun dilshan',
    phone: '+94070 23 65 499',
    email: 'kasunmadushanka@agri.com',
    location: 'kandy, SL',
    farm: '7 acres',
    tasks: ['potato'],
    status: 'active',
    joinDate: '2024.01.12',
    profilePicture: 'bg-emerald-900',
  },
];

export default function FarmerManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter logic based on search input
  const filteredFarmers = workers.filter((farmer) => 
    farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = workers.filter(f => f.status === 'active').length;
  const totalCount = workers.length;

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2A471C] tracking-tight">
              Farmer Management
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Manage and track all registered farmers
            </p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 bg-[#2A471C] hover:bg-[#203714] text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer">
            <Plus className="w-4 h-4" />
            + Add Farmer
          </button>
        </div>

        {/* Metric Cards & Search Bar Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Search Bar Container */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-emerald-700">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Search farmers by name, location, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Active Farmers Metric Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Farmers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{activeCount}</p>
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-emerald-600 flex items-center justify-center p-0.5">
              <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div>
            </div>
          </div>

          {/* Total Farmers Metric Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Farmers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalCount}</p>
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-blue-600 flex items-center justify-center p-0.5">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
            </div>
          </div>

        </div>

        {/* Data Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">
                  <th className="py-4 px-6">Worker</th>
                  <th className="py-4 px-6">Contact</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Farm Size</th>
                  <th className="py-4 px-6">tasks</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Join Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredFarmers.length > 0 ? (
                  filteredFarmers.map((farmer) => (
                    <tr key={farmer.id} className="hover:bg-gray-50/50 transition-colors">
                      
                      {/* Framer Info */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                            {farmer.profilePicture ? (
                              <img
                                src={farmer.profilePicture}
                                alt={farmer.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold text-xs">
                                {farmer.initials}
                              </div>
                            )}
                          </div>

                          <span className="font-semibold text-gray-900">
                            {farmer.name}
                          </span>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{farmer.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{farmer.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{farmer.location}</span>
                        </div>
                      </td>

                      {/* Farm Size */}
                      <td className="py-4 px-6 whitespace-nowrap text-gray-700 text-xs font-medium">
                        {farmer.farm}
                      </td>

                      {/* tasks Tags */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {farmer.tasks.map((crop, index) => (
                            <span 
                              key={index} 
                              className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium"
                            >
                              {crop}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${
                          farmer.status === 'active' ? 'bg-[#008728]' : 'bg-gray-400'
                        }`}>
                          {farmer.status}
                        </span>
                      </td>

                      {/* Join Date */}
                      <td className="py-4 px-6 whitespace-nowrap text-gray-600 text-xs">
                        {farmer.joinDate}
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
                    <td colSpan={8} className="text-center py-8 text-gray-400 text-sm">
                      No farmers found matching your search.
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