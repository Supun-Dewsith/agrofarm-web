import React, { useState } from 'react';
import { 
  Package, 
  AlertCircle, 
  Sprout, 
  Wrench, 
  RefreshCw 
} from 'lucide-react';

// Define TypeScript interfaces for data models
interface LowStockItem {
  id: string;
  name: string;
  current: string;
  reorderAt: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: 'Fertilizer' | 'Pesticide' | 'Equipment';
  categoryBg: string;
  quantity: string;
  stockLevelPercent: number;
  stockLevelText: string;
  lastRestocked: string;
  status: 'Low Stock' | 'In Stock';
}

const initialLowStockAlerts: LowStockItem[] = [
  { id: '1', name: 'Organic Fertilizer', current: '150 kg', reorderAt: '200 kg' },
  { id: '2', name: 'Organic Fertilizer', current: '150 kg', reorderAt: '200 kg' },
  { id: '3', name: 'Organic Fertilizer', current: '150 kg', reorderAt: '200 kg' },
];

const initialInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Organic Fertilizer',
    category: 'Fertilizer',
    categoryBg: 'bg-emerald-100 text-emerald-800',
    quantity: '150 kg',
    stockLevelPercent: 75,
    stockLevelText: '75% of record level',
    lastRestocked: '2026-06-15',
    status: 'Low Stock',
  },
  {
    id: '2',
    name: 'Pesticide Spray',
    category: 'Pesticide',
    categoryBg: 'bg-emerald-100 text-emerald-800',
    quantity: '45 liters',
    stockLevelPercent: 90,
    stockLevelText: '90% of recorder level',
    lastRestocked: '2026-06-15',
    status: 'Low Stock',
  },
];

export default function InventoryManagement() {
  const [lowStockAlerts] = useState<LowStockItem[]>(initialLowStockAlerts);
  const [inventory] = useState<InventoryItem[]>(initialInventory);

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-[#2A471C] tracking-tight">
            Inventory Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track and manage farm supplies
          </p>
        </div>

        {/* 4 Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Items Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">5</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Package className="w-6 h-6" />
            </div>
          </div>

          {/* Low Stock Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Low Stock</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">3</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Fertilizers Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Fertilizers</p>
              <p className="text-3xl font-bold text-cyan-600 mt-1">1</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-800">
              <Sprout className="w-6 h-6" />
            </div>
          </div>

          {/* Equipment Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Equipment</p>
              <p className="text-3xl font-bold text-cyan-600 mt-1">1</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-400">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Low Stock Alerts Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900">Low Stock Alerts</h2>
          
          <div className="space-y-3">
            {lowStockAlerts.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-gray-100/80"
              >
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Current: {item.current} | Reorder at: {item.reorderAt}
                  </p>
                </div>
                <button className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recorder
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* All Inventory Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900">All Inventory</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4">Last Restocked</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {inventory.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    
                    {/* Item Name */}
                    <td className="py-4 px-4 font-medium text-gray-900 whitespace-nowrap">
                      {row.name}
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${row.categoryBg}`}>
                        {row.category}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="py-4 px-4 text-gray-700 whitespace-nowrap text-xs font-medium">
                      {row.quantity}
                    </td>

                    {/* Stock Level Progress Bar */}
                    <td className="py-4 px-4 w-48 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-[#2A471C] h-full rounded-full" 
                            style={{ width: `${row.stockLevelPercent}%` }}
                          ></div>
                        </div>
                        <p className="text-[11px] text-gray-400">{row.stockLevelText}</p>
                      </div>
                    </td>

                    {/* Last Restocked */}
                    <td className="py-4 px-4 text-gray-600 whitespace-nowrap text-xs">
                      {row.lastRestocked}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-red-400">
                        {row.status}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}