import React, { useState, useEffect } from 'react';

import { fetchWithAuth } from '../utils/auth';

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

// ==============================
// Interfaces
// ==============================

interface Farms {
  farmIDs: number;
  farmNames: string;
}

type InventoryCategory =
  | 'Fertilizer'
  | 'Pesticide & Crop Protection'
  | 'Equipment'
  | 'Machinery';

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
  category: InventoryCategory;
  categoryBg: string;
  quantity: string;
  lastRestocked: string;
  status: 'Low Stock' | 'In Stock';
  farmId: string;
}

// Object sent TO the backend.
// No ID because the database generates it.
interface NewInventoryItem {
  name: string;
  category: InventoryCategory;
  quantity: string;
  farmIDs: number;
}

// Object returned FROM the backend.
interface CreatedInventoryItem {
  id: number;
  name: string;
  category: InventoryCategory;
  quantity: string;
  farmIDs: number;
}

// ==============================
// Initial Data
// ==============================

const initialLowStockAlerts: LowStockItem[] = [
  {
    id: '1',
    name: 'Organic Fertilizer',
    current: '150 kg',
    reorderAt: '200 kg',
    farmId: '1',
    category: 'Fertilizer'
  },
  {
    id: '2',
    name: 'Organic Fertilizer',
    current: '150 kg',
    reorderAt: '200 kg',
    farmId: '2',
    category: 'Fertilizer'
  }
];

const initialInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Organic Fertilizer',
    category: 'Fertilizer',
    categoryBg: 'bg-emerald-100 text-emerald-800',
    quantity: '150 kg',
    lastRestocked: '2026-06-15',
    status: 'Low Stock',
    farmId: '1'
  },
  {
    id: '2',
    name: 'Pesticide Spray',
    category: 'Pesticide & Crop Protection',
    categoryBg: 'bg-red-100 text-red-800',
    quantity: '45 liters',
    lastRestocked: '2026-06-15',
    status: 'Low Stock',
    farmId: '2'
  }
];

// ==============================
// Component
// ==============================

export default function App() {
  const [farms, setFarms] = useState<Farms[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedFarm, setSelectedFarm] = useState<string>('all');

  const [activeTab, setActiveTab] = useState<
    'All' | InventoryCategory
  >('All');

  const [searchQuery, setSearchQuery] = useState<string>('');

  const [lowStockAlerts] = useState<LowStockItem[]>(
    initialLowStockAlerts
  );

  const [inventory, setInventory] = useState<InventoryItem[]>(
    initialInventory
  );

  const [isAddModalOpen, setIsAddModalOpen] =
    useState<boolean>(false);

  // ==============================
  // Form States
  // ==============================

  const [newItemName, setNewItemName] = useState('');

  const [newItemCategory, setNewItemCategory] =
    useState<InventoryCategory>('Fertilizer');

  const [newItemAmount, setNewItemAmount] = useState('');

  const [newItemUnit, setNewItemUnit] = useState('kg');

  const [newItemFarmId, setNewItemFarmId] =
    useState<number>(0);

  // ==============================
  // Fetch Farms
  // ==============================

  useEffect(() => {
    fetchWithAuth('/api/crops/farms')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch farms');
        }

        return res.json() as Promise<Farms[]>;
      })
      .then((data) => {
        if (data.length === 0) {
          setError('No farms found.');
          return;
        }

        setFarms(data);

        // Automatically select the first farm
        // for the Add Inventory form.
        setNewItemFarmId(data[0].farmIDs);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load farms.');
      });
  }, []);

  // ==============================
  // Filter Inventory
  // ==============================

  const filteredInventory = inventory.filter((item) => {
    const matchesFarm =
      selectedFarm === 'all' ||
      item.farmId === String(selectedFarm);

    const matchesTab =
      activeTab === 'All' ||
      item.category === activeTab;

    const matchesSearch =
      item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      item.quantity
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    return (
      matchesFarm &&
      matchesTab &&
      matchesSearch
    );
  });

  // ==============================
  // Filter Low Stock
  // ==============================

  const filteredLowStock =
    lowStockAlerts.filter((item) => {
      const matchesFarm =
        selectedFarm === 'all' ||
        item.farmId === String(selectedFarm);

      const matchesSearch =
        item.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      return (
        matchesFarm &&
        matchesSearch
      );
    });

  // ==============================
  // Add Inventory
  // ==============================

  const handleAddInventory = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (
      !newItemName.trim() ||
      !newItemAmount ||
      !newItemFarmId
    ) {
      return;
    }

    const formattedQuantity =
      `${newItemAmount} ${newItemUnit}`;

    // ==========================================
    // Object sent TO backend
    // ==========================================

    const payload: NewInventoryItem = {
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: formattedQuantity,
      farmIDs: newItemFarmId
    };

    try {
      const response = await fetchWithAuth(
        '/api/inventory/new',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          'Failed to add inventory item:',
          response.status,
          errorText
        );

        setError(
          'Failed to add inventory item.'
        );

        return;
      }

      // ==========================================
      // Backend response
      // ==========================================

      const createdItem: CreatedInventoryItem =
        await response.json();

      // ==========================================
      // Convert backend object into frontend object
      // ==========================================

      const inventoryItem: InventoryItem = {
        id: String(createdItem.id),

        name: createdItem.name,

        category: createdItem.category,

        categoryBg:
          createdItem.category === 'Equipment'
            ? 'bg-purple-100 text-purple-800'
            : createdItem.category === 'Machinery'
              ? 'bg-blue-100 text-blue-800'
              : createdItem.category ===
                'Pesticide & Crop Protection'
                ? 'bg-red-100 text-red-800'
                : 'bg-emerald-100 text-emerald-800',

        quantity: createdItem.quantity,

        lastRestocked:
          new Date()
            .toISOString()
            .split('T')[0],

        status: 'In Stock',

        farmId:
          String(createdItem.farmIDs)
      };

      // Add the new item to the beginning
      // of the existing inventory list.
      setInventory((previousInventory) => [
        inventoryItem,
        ...previousInventory
      ]);

      // Close modal
      setIsAddModalOpen(false);

      // Clear previous error
      setError(null);

      // Reset form
      setNewItemName('');
      setNewItemAmount('');
      setNewItemUnit('kg');
      setNewItemCategory('Fertilizer');

    } catch (error) {
      console.error(
        'Error submitting inventory item:',
        error
      );

      setError(
        'An error occurred while adding the inventory item.'
      );
    }
  };

  // ==============================
  // JSX
  // ==============================

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans text-gray-800 relative">

      <div className="max-w-7xl mx-auto space-y-6">

        {/* ==========================================
            Header & Farm Selector
        ========================================== */}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div>

            <h1 className="text-3xl font-bold text-[#2A471C] tracking-tight">
              Inventory Management
            </h1>

            <p className="text-sm text-gray-500 mt-0.5">
              Track and manage farm supplies across connected estates
            </p>

            {error && (
              <p className="text-xs text-red-500 mt-1">
                {error}
              </p>
            )}

          </div>

          <div className="flex items-center gap-3">

            {/* Farm Select */}

            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200">

              <MapPin className="w-4 h-4 text-[#2A471C]" />

              <select
                value={selectedFarm}
                onChange={(e) =>
                  setSelectedFarm(e.target.value)
                }
                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
              >

                <option value="all">
                  All Farms
                </option>

                {farms.map((farm) => (
                  <option
                    key={farm.farmIDs}
                    value={farm.farmIDs}
                  >
                    {farm.farmNames}
                  </option>
                ))}

              </select>

            </div>

            {/* Add Inventory */}

            <button
              onClick={() =>
                setIsAddModalOpen(true)
              }
              className="inline-flex items-center gap-2 bg-[#2A471C] hover:bg-[#203714] text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
            >

              <Plus className="w-4 h-4" />

              Add Inventory

            </button>

          </div>

        </div>

        {/* ==========================================
            Metric Cards
        ========================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Total Items */}

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">

            <div>

              <p className="text-xs font-medium text-gray-500">
                Total Items
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-1">
                {inventory.length}
              </p>

            </div>

            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">

              <Package className="w-6 h-6" />

            </div>

          </div>

          {/* Low Stock */}

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">

            <div>

              <p className="text-xs font-medium text-gray-500">
                Low Stock
              </p>

              <p className="text-3xl font-bold text-orange-600 mt-1">
                {lowStockAlerts.length}
              </p>

            </div>

            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500">

              <AlertCircle className="w-6 h-6" />

            </div>

          </div>

          {/* Fertilizers */}

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">

            <div>

              <p className="text-xs font-medium text-gray-500">
                Fertilizers
              </p>

              <p className="text-3xl font-bold text-cyan-600 mt-1">
                {
                  inventory.filter(
                    (i) =>
                      i.category === 'Fertilizer'
                  ).length
                }
              </p>

            </div>

            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-800">

              <Sprout className="w-6 h-6" />

            </div>

          </div>

          {/* Equipment */}

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">

            <div>

              <p className="text-xs font-medium text-gray-500">
                Equipment
              </p>

              <p className="text-3xl font-bold text-cyan-600 mt-1">
                {
                  inventory.filter(
                    (i) =>
                      i.category === 'Equipment'
                  ).length
                }
              </p>

            </div>

            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-400">

              <Wrench className="w-6 h-6" />

            </div>

          </div>

        </div>

        {/* ==========================================
            Search & Category Tabs
        ========================================== */}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-gray-50 rounded-xl border border-gray-100">

            {(
              [
                'All',
                'Fertilizer',
                'Pesticide & Crop Protection',
                'Equipment',
                'Machinery'
              ] as const
            ).map((tab) => (

              <button
                key={tab}
                onClick={() =>
                  setActiveTab(tab)
                }
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
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C]"
            />

          </div>

        </div>

        {/* ==========================================
            Low Stock Alerts
        ========================================== */}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">

          <h2 className="text-base font-bold text-gray-900">
            Low Stock Alerts
          </h2>

          <div className="space-y-3">

            {filteredLowStock.length > 0 ? (

              filteredLowStock.map((item) => (

                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-gray-100/80"
                >

                  <div>

                    <h3 className="font-semibold text-gray-900 text-sm">
                      {item.name}
                    </h3>

                    <p className="text-xs text-gray-500 mt-0.5">
                      Current: {item.current} | Reorder at:{' '}
                      {item.reorderAt}
                    </p>

                  </div>

                  <button
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >

                    <RefreshCw className="w-3.5 h-3.5" />

                    Reorder

                  </button>

                </div>

              ))

            ) : (

              <p className="text-sm text-gray-400 py-2">
                No low stock alerts matching your search.
              </p>

            )}

          </div>

        </div>

        {/* ==========================================
            All Inventory
        ========================================== */}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-4">

          <h2 className="text-base font-bold text-gray-900">
            All Inventory
          </h2>

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse">

              <thead>

                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">

                  <th className="py-3 px-4">
                    Item Name
                  </th>

                  <th className="py-3 px-4">
                    Category
                  </th>

                  <th className="py-3 px-4">
                    Quantity
                  </th>

                  <th className="py-3 px-4">
                    Last Restocked
                  </th>

                  <th className="py-3 px-4">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100 text-sm">

                {filteredInventory.length > 0 ? (

                  filteredInventory.map((row) => (

                    <tr
                      key={row.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >

                      <td className="py-4 px-4 font-medium text-gray-900 whitespace-nowrap">
                        {row.name}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">

                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${row.categoryBg}`}
                        >
                          {row.category}
                        </span>

                      </td>

                      <td className="py-4 px-4 text-gray-700 whitespace-nowrap text-xs font-medium">
                        {row.quantity}
                      </td>

                      <td className="py-4 px-4 text-gray-600 whitespace-nowrap text-xs">
                        {row.lastRestocked}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">

                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${
                            row.status === 'Low Stock'
                              ? 'bg-red-400'
                              : 'bg-emerald-600'
                          }`}
                        >
                          {row.status}
                        </span>

                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>

                    <td
                      colSpan={5}
                      className="text-center py-6 text-gray-400 text-sm"
                    >
                      No inventory records found matching your search.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* ==========================================
          Add Inventory Modal
      ========================================== */}

      {isAddModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-md transition-all">

          <div className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl w-full max-w-lg p-6 space-y-6 relative">

            {/* Modal Header */}

            <div className="flex items-center justify-between border-b border-gray-100 pb-4">

              <div>

                <h3 className="text-lg font-bold text-gray-900">
                  Add New Inventory Item
                </h3>

                <p className="text-xs text-gray-500 mt-0.5">
                  Fill in supply details below
                </p>

              </div>

              <button
                onClick={() =>
                  setIsAddModalOpen(false)
                }
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
              >

                <X className="w-4 h-4" />

              </button>

            </div>

            {/* Form */}

            <form
              onSubmit={handleAddInventory}
              className="space-y-4"
            >

              {/* Item Name */}

              <div>

                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Item Name
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. Potassium Nitrate Fertilizer"
                  value={newItemName}
                  onChange={(e) =>
                    setNewItemName(e.target.value)
                  }
                  className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C]"
                />

              </div>

              {/* Category + Quantity */}

              <div className="grid grid-cols-2 gap-4">

                {/* Category */}

                <div>

                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>

                  <select
                    value={newItemCategory}
                    onChange={(e) =>
                      setNewItemCategory(
                        e.target.value as InventoryCategory
                      )
                    }
                    className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C]"
                  >

                    <option value="Fertilizer">
                      Fertilizer
                    </option>

                    <option value="Pesticide & Crop Protection">
                      Pesticide & Crop Protection
                    </option>

                    <option value="Equipment">
                      Equipment
                    </option>

                    <option value="Machinery">
                      Machinery
                    </option>

                  </select>

                </div>

                {/* Quantity */}

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
                      onChange={(e) =>
                        setNewItemAmount(
                          e.target.value
                        )
                      }
                      className="w-3/5 px-3 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C]"
                    />

                    <select
                      value={newItemUnit}
                      onChange={(e) =>
                        setNewItemUnit(
                          e.target.value
                        )
                      }
                      className="w-2/5 px-2 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C] cursor-pointer"
                    >

                      <option value="kg">
                        kg
                      </option>

                      <option value="liters">
                        liters
                      </option>

                      <option value="units">
                        units
                      </option>

                      <option value="bags">
                        bags
                      </option>

                      <option value="packets">
                        packets
                      </option>

                      <option value="tons">
                        tons
                      </option>

                    </select>

                  </div>

                </div>

              </div>

              {/* Assign Farm */}

              <div>

                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Assign to Farm
                </label>

                <select
                  value={newItemFarmId}
                  onChange={(e) =>
                    setNewItemFarmId(
                      Number(e.target.value)
                    )
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A471C]/20 focus:border-[#2A471C]"
                >

                  {farms.map((farm) => (

                    <option
                      key={farm.farmIDs}
                      value={farm.farmIDs}
                    >
                      {farm.farmNames}
                    </option>

                  ))}

                </select>

              </div>

              {/* Buttons */}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">

                <button
                  type="button"
                  onClick={() =>
                    setIsAddModalOpen(false)
                  }
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