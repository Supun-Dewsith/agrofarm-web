import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertCircle, 
  Sprout, 
  Wrench, 
  RefreshCw, 
  Plus, 
  MapPin, 
  X,
  Check,
  Search
} from 'lucide-react';

interface Farm {
  id: string;
  name: string;
  location: string;
}

interface LowStockItem {
  id: string;
  name: string;
  current: string;
  reorderAt: string;
  farmId: string;
  category: string;
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
  farmId: string;
}

async function getFarms(): Promise<Farm[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'all', name: 'All Farms', location: 'Multiple Locations' },
        { id: 'farm-1', name: 'Niwala Green Estate', location: 'Niwala, SL' },
        { id: 'farm-2', name: 'Gamapaha Agro Farm', location: 'Gamapaha, SL' },
        { id: 'farm-3', name: 'Athanagalla Plantation', location: 'Athanagalla, SL' },
      ]);
    }, 250);
  });
}

const initialLowStockAlerts: LowStockItem[] = [
  { id: '1', name: 'Organic Fertilizer', current: '150 kg', reorderAt: '200 kg', farmId: 'farm-1', category: 'Fertilizer' },
  { id: '2', name: 'Organic Fertilizer', current: '150 kg', reorderAt: '200 kg', farmId: 'farm-2', category: 'Fertilizer' },
  { id: '3', name: 'Organic Fertilizer', current: '150 kg', reorderAt: '200 kg', farmId: 'farm-3', category: 'Fertilizer' },
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
    farmId: 'farm-1',
  },
  {
    id: '2',
    name: 'Pesticide Spray',
    category: 'Pesticide',
    categoryBg: 'bg-emerald-100 text-emerald-800',
    quantity: '45 liters',
    stockLevelPercent: 90,
    stockLevelText: '90% of record level',
    lastRestocked: '2026-06-15',
    status: 'Low Stock',
    farmId: 'farm-2',
  },
  {
    id: '3',
    name: 'Heavy Tiller Tractor',
    category: 'Equipment',
    categoryBg: 'bg-purple-100 text-purple-800',
    quantity: '4 units',
    stockLevelPercent: 100,
    stockLevelText: '100% optimal level',
    lastRestocked: '2026-06-01',
    status: 'In Stock',
    farmId: 'farm-3',
  }
];

export default function App() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'All' | 'Fertilizer' | 'Pesticide' | 'Equipment'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lowStockAlerts] = useState<LowStockItem[]>(initialLowStockAlerts);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form states for new item with unit selection
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Fertilizer' | 'Pesticide' | 'Equipment'>('Fertilizer');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemFarmId, setNewItemFarmId] = useState('farm-1');

  useEffect(() => {
    getFarms().then((data) => {
      setFarms(data);
    });
  }, []);

  const filteredInventory = inventory.filter(item => {
    const matchesFarm = selectedFarm === 'all' || item.farmId === selectedFarm;
    const matchesTab = activeTab === 'All' || item.category === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.quantity.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFarm && matchesTab && matchesSearch;
  });

  const filteredLowStock = lowStockAlerts.filter(item => {
    const matchesFarm = selectedFarm === 'all' || item.farmId === selectedFarm;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFarm && matchesSearch;
  });

  const handleAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemAmount) return;

    const formattedQuantity = `${newItemAmount} ${newItemUnit}`;

    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: newItemName,
      category: newItemCategory,
      categoryBg: newItemCategory === 'Fertilizer' ? 'bg-emerald-100 text-emerald-800' : newItemCategory === 'Pesticide' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800',
      quantity: formattedQuantity,
      stockLevelPercent: 100,
      stockLevelText: '100% optimal level',
      lastRestocked: new Date().toISOString().split('T')[0],
      status: 'In Stock',
      farmId: newItemFarmId,
    };

    setInventory([newItem, ...inventory]);
    setIsAddModalOpen(false);
    // Reset form
    setNewItemName('');
    setNewItemAmount('');
    setNewItemUnit('kg');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans text-gray-800 relative">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header & Farm Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2A471C] tracking-tight">
              Inventory Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track and manage farm supplies across connected estates
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Farm Select Dropdown */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200">
              <MapPin className="w-4 h-4 text-[#2A471C]" />
              <select 
                value={selectedFarm}
                onChange={(e) => setSelectedFarm(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
              >
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Add Inventory Button */}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#2A471C] hover:bg-[#203714] text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Inventory
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{inventory.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Package className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Low Stock</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{lowStockAlerts.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Fertilizers</p>
              <p className="text-3xl font-bold text-cyan-600 mt-1">
                {inventory.filter(i => i.category === 'Fertilizer').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-800">
              <Sprout className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Equipment</p>
              <p className="text-3xl font-bold text-cyan-600 mt-1">
                {inventory.filter(i => i.category === 'Equipment').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-400">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Search Bar & Category Tabs Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-gray-50 rounded-xl border border-gray-100">
            {(['All', 'Fertilizer', 'Pesticide', 'Equipment'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-[#2A471C] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search inventory items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C]"
            />
          </div>

        </div>

        {/* Low Stock Alerts Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900">Low Stock Alerts</h2>
          
          <div className="space-y-3">
            {filteredLowStock.length > 0 ? (
              filteredLowStock.map((item, index) => (
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
                    Reorder
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 py-2">No low stock alerts matching your search.</p>
            )}
          </div>
        </div>

        {/* All Inventory Table */}
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
                {filteredInventory.length > 0 ? (
                  filteredInventory.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4 font-medium text-gray-900 whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${row.categoryBg}`}>
                          {row.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-700 whitespace-nowrap text-xs font-medium">
                        {row.quantity}
                      </td>
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
                      <td className="py-4 px-4 text-gray-600 whitespace-nowrap text-xs">
                        {row.lastRestocked}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${
                          row.status === 'Low Stock' ? 'bg-red-400' : 'bg-emerald-600'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-400 text-sm">
                      No inventory records found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Frosted Glass Add Inventory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-md transition-all">
          <div className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl w-full max-w-lg p-6 space-y-6 relative">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add New Inventory Item</h3>
                <p className="text-xs text-gray-500 mt-0.5">Fill in supply details below</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddInventory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Item Name
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Potassium Nitrate Fertilizer"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select 
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C]"
                  >
                    <option value="Fertilizer">Fertilizer</option>
                    <option value="Pesticide">Pesticide</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>

                {/* Quantity & Unit Dropdown Row */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Quantity & Unit
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      min="1"
                      required
                      placeholder="Amount"
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(e.target.value)}
                      className="w-3/5 px-3 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C]"
                    />
                    <select
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="w-2/5 px-2 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C] cursor-pointer"
                    >
                      <option value="kg">kg</option>
                      <option value="liters">liters</option>
                      <option value="units">units</option>
                      <option value="bags">bags</option>
                      <option value="packets">packets</option>
                      <option value="tons">tons</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Assign to Farm
                </label>
                <select 
                  value={newItemFarmId}
                  onChange={(e) => setNewItemFarmId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C]"
                >
                  {farms.filter(f => f.id !== 'all').map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} ({farm.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-[#2A471C] hover:bg-[#203714] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Save Item
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}