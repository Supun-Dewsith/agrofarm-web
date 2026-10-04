import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/auth';
import { useTranslation } from 'react-i18next';

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

interface Farms {
  farmIDs: number;
  farmNames: string;
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
  category: string;
  categoryBg: string;
  quantity: string;
  lastRestocked: string;
  status: string;
  farmId: string;

  quantityValue: number;
  unit: string;
  alertLimit: number;
}

interface NewInventoryItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  alertLimit: number;
  farmIDs: number;
}

interface InventoryRequest {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  alertLimit: number;
  farmIds: number;
}

interface InventoryResponse {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  alertLimit: number;
  farmIds?: number;
  farmIDs?: number;
}

const Inventory = () => {
  const { t } = useTranslation();
  const [farms, setFarms] = useState<Farms[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('all');

  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] =
    useState<LowStockItem[]>([]);

  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] =
    useState<string>('');

  const [showModal, setShowModal] =
    useState<boolean>(false);

  /* ============================================================
     ADD INVENTORY STATE
     ============================================================ */

  const [formData, setFormData] =
    useState<NewInventoryItem>({
      name: '',
      category: 'Fertilizer',
      quantity: 0,
      unit: 'kg',
      alertLimit: 0,
      farmIDs: 0
    });

  /* ============================================================
     UPDATE INVENTORY STATE
     ============================================================ */

  const [showUpdateModal, setShowUpdateModal] =
    useState<boolean>(false);

  const [updateFormData, setUpdateFormData] =
    useState<InventoryRequest>({
      id: 0,
      name: '',
      category: 'Fertilizer',
      quantity: 0,
      unit: 'kg',
      alertLimit: 0,
      farmIds: 0
    });

  const [selectedInventoryItem, setSelectedInventoryItem] =
    useState<InventoryItem | null>(null);

  const categories = [
    'All',
    'Fertilizer',
    'Pesticide & Crop Protection',
    'Equipment',
    'Machinery',
    'Seeds'
  ];

  const getCategoryBackground = (category: string) => {
    switch (category) {
      case 'Fertilizer':
        return 'bg-green-100 text-green-700';

      case 'Pesticide & Crop Protection':
        return 'bg-red-100 text-red-700';

      case 'Equipment':
        return 'bg-blue-100 text-blue-700';

      case 'Machinery':
        return 'bg-purple-100 text-purple-700';

      case 'Seeds':
        return 'bg-yellow-100 text-yellow-700';

      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const fetchFarms = async () => {
    try {
      const response =
        await fetchWithAuth('/api/crops/farms');

      if (!response.ok) {
        throw new Error('Failed to fetch farms');
      }

      const data =
        (await response.json()) as Farms[];

      console.log(
        'Farms API response:',
        data
      );

      setFarms(data);

    } catch (err) {
      console.error(
        'Error fetching farms:',
        err
      );

      setError(
        t('Failed to load farms.')
      );
    }
  };

  const fetchInventory = async () => {
    try {
      const response =
        await fetchWithAuth(
          '/api/inventory/all'
        );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch inventory'
        );
      }

      const data =
        (await response.json()) as InventoryResponse[];

      console.log(
        'Inventory API response:',
        data
      );

      const formattedInventory: InventoryItem[] =
        data.map((item) => {

          const farmId =
            item.farmIds ??
            item.farmIDs;

          return {
            id: String(item.id),

            name: item.name,

            category: item.category,

            categoryBg:
              getCategoryBackground(
                item.category
              ),

            quantity:
              `${item.quantity} ${item.unit}`,

            lastRestocked:
              new Date()
                .toISOString()
                .split('T')[0],

            status:
              item.quantity <=
              item.alertLimit
                ? 'Low Stock'
                : 'In Stock',

            farmId:
              farmId !== undefined
                ? String(farmId)
                : '',

            quantityValue:
              item.quantity,

            unit:
              item.unit,

            alertLimit:
              item.alertLimit
          };
        });

      console.log(
        'Formatted inventory:',
        formattedInventory
      );

      setInventory(
        formattedInventory
      );

    } catch (err) {
      console.error(
        'Error fetching inventory:',
        err
      );

      setError(
        t('Failed to load inventory.')
      );
    }
  };

  const fetchLowStockAlerts = async () => {
    try {
      const response =
        await fetchWithAuth(
          '/api/inventory/lowstock'
        );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch low stock alerts'
        );
      }

      const data =
        (await response.json()) as LowStockItem[];

      console.log(
        'Low stock API response:',
        data
      );

      const formattedData =
        data.map((item) => ({
          ...item,
          id: String(item.id),
          farmId: String(item.farmId)
        }));

      setLowStockAlerts(
        formattedData
      );

    } catch (err) {
      console.error(
        'Error fetching low stock alerts:',
        err
      );

      setError(
        t('Failed to load low stock alerts.')
      );
    }
  };

  useEffect(() => {
    fetchFarms();
    fetchInventory();
    fetchLowStockAlerts();
  }, []);

  /* ============================================================
     MAIN INVENTORY FILTER
     ============================================================ */

  const filteredInventory =
    inventory.filter((item) => {

      const matchesFarm =
        selectedFarm === 'all' ||
        String(item.farmId) ===
          String(selectedFarm);

      const matchesCategory =
        activeTab === 'All' ||
        item.category === activeTab;

      const matchesSearch =
        item.name
          .toLowerCase()
          .includes(
            searchQuery.toLowerCase()
          );

      return (
        matchesFarm &&
        matchesCategory &&
        matchesSearch
      );
    });

  /* ============================================================
     LOW STOCK FILTER
     ============================================================ */

  const filteredLowStockAlerts =
    lowStockAlerts.filter((item) => {

      const matchesFarm =
        selectedFarm === 'all' ||
        String(item.farmId) ===
          String(selectedFarm);

      const matchesSearch =
        item.name
          .toLowerCase()
          .includes(
            searchQuery.toLowerCase()
          );

      return (
        matchesFarm &&
        matchesSearch
      );
    });

  /* ============================================================
     ADD INVENTORY
     ============================================================ */

  const resetInventoryForm = () => {
    setFormData({
      name: '',
      category: 'Fertilizer',
      quantity: 0,
      unit: 'kg',
      alertLimit: 0,
      farmIDs:
        farms.length > 0
          ? farms[0].farmIDs
          : 0
    });
  };

  const handleAddInventory = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setSuccessMessage('');

    if (!formData.name.trim()) {
      setError(
        t('Please enter an inventory name.')
      );
      return;
    }

    if (formData.quantity < 0) {
      setError(
        t('Quantity cannot be negative.')
      );
      return;
    }

    if (formData.alertLimit < 0) {
      setError(
        t('Alert limit cannot be negative.')
      );
      return;
    }

    if (!formData.farmIDs) {
      setError(
        t('Please select a farm.')
      );
      return;
    }

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        quantity: formData.quantity,
        unit: formData.unit,
        alertLimit: formData.alertLimit,
        farmIDs: formData.farmIDs
      };

      console.log(
        'Adding inventory:',
        payload
      );

      const response =
        await fetchWithAuth(
          '/api/inventory/new',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body:
              JSON.stringify(payload)
          }
        );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          'Add inventory error:',
          errorText
        );

        throw new Error(
          errorText ||
          'Failed to add inventory'
        );
      }

      setSuccessMessage(
        t('Inventory item added successfully.')
      );

      resetInventoryForm();
      setShowModal(false);

      await fetchInventory();
      await fetchLowStockAlerts();

    } catch (err) {
      console.error(
        'Error adding inventory:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : t('Failed to add inventory item.')
      );
    }
  };

  /* ============================================================
     UPDATE INVENTORY
     ============================================================ */

  const openUpdateModal = (
    item: InventoryItem
  ) => {

    setSelectedInventoryItem(item);

    setUpdateFormData({
      id: Number(item.id),
      name: item.name,
      category: item.category,
      quantity: item.quantityValue,
      unit: item.unit,
      alertLimit: item.alertLimit,
      farmIds: Number(item.farmId)
    });

    setError('');
    setSuccessMessage('');

    setShowUpdateModal(true);
  };

  const resetUpdateForm = () => {

    setUpdateFormData({
      id: 0,
      name: '',
      category: 'Fertilizer',
      quantity: 0,
      unit: 'kg',
      alertLimit: 0,
      farmIds: 0
    });

    setSelectedInventoryItem(null);
  };

  const handleUpdateInventory = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    setError('');
    setSuccessMessage('');

    if (!selectedInventoryItem) {
      setError(
        t('No inventory item selected.')
      );
      return;
    }

    if (!updateFormData.name.trim()) {
      setError(
        t('Please enter an inventory name.')
      );
      return;
    }

    if (updateFormData.quantity < 0) {
      setError(
        t('Quantity cannot be negative.')
      );
      return;
    }

    if (updateFormData.alertLimit < 0) {
      setError(
        t('Alert limit cannot be negative.')
      );
      return;
    }

    if (!updateFormData.farmIds) {
      setError(
        t('Please select a farm.')
      );
      return;
    }

    try {

      const payload: InventoryRequest = {
        id: Number(
          selectedInventoryItem.id
        ),
        name: updateFormData.name,
        category:
          updateFormData.category,
        quantity:
          updateFormData.quantity,
        unit:
          updateFormData.unit,
        alertLimit:
          updateFormData.alertLimit,
        farmIds:
          updateFormData.farmIds
      };

      console.log(
        'Updating inventory:',
        payload
      );

      const response =
        await fetchWithAuth(
          '/api/inventory/update',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body:
              JSON.stringify(payload)
          }
        );

      if (!response.ok) {

        const errorText =
          await response.text();

        console.error(
          'Update inventory error:',
          errorText
        );

        throw new Error(
          errorText ||
          'Failed to update inventory'
        );
      }

      setSuccessMessage(
        t('Inventory item updated successfully.')
      );

      setShowUpdateModal(false);

      resetUpdateForm();

      await fetchInventory();
      await fetchLowStockAlerts();

    } catch (err) {

      console.error(
        'Error updating inventory:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : t('Failed to update inventory item.')
      );
    }
  };

  const totalItems =
    filteredInventory.length;

  const lowStockCount =
    filteredInventory.filter(
      (item) =>
        item.status === 'Low Stock'
    ).length;

  const categoriesCount =
    new Set(
      filteredInventory.map(
        (item) => item.category
      )
    ).size;

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>

          <h1 className="text-2xl font-bold text-gray-900">
            {t("Inventory Management")}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {t("Manage farm inventory, stock levels and supplies.")}
          </p>

        </div>

        <button
          onClick={() => {
            resetInventoryForm();
            setShowModal(true);
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-emerald-700 text-white text-sm font-semibold shadow-sm hover:bg-emerald-800 transition-colors"
        >
          <Plus size={18} />
          {t("Add Inventory")}
        </button>

      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>

          <button
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700"
          >
            <X size={18} />
          </button>

        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">

          <div className="flex items-center gap-2">
            <Check size={18} />
            {successMessage}
          </div>

          <button
            onClick={() =>
              setSuccessMessage('')
            }
            className="text-green-500 hover:text-green-700"
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          {/* Farm filter */}
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <MapPin size={19} />
            </div>

            <div>

              <label className="mb-1 block text-xs font-medium text-gray-500">
                {t("Select Farm")}
              </label>

              <select
                value={selectedFarm}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  console.log(
                    'Selected farm:',
                    value
                  );

                  setSelectedFarm(value);
                }}
                className="min-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              >

                <option value="all">
                  {t("All Farms")}
                </option>

                {farms.map((farm) => (
                  <option
                    key={farm.farmIDs}
                    value={String(
                      farm.farmIDs
                    )}
                  >
                    {farm.farmNames}
                  </option>
                ))}

              </select>

            </div>

          </div>

          {/* Search */}
          <div className="relative w-full lg:max-w-sm">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value
                )
              }
              placeholder={t("Search inventory...")}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />

          </div>

        </div>

      </div>

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">

        <div className="rounded-xl border border-gray-200 bg-white p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">
                {t("Total Items")}
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {totalItems}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Package size={22} />
            </div>

          </div>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">
                {t("Low Stock")}
              </p>

              <p className="mt-1 text-2xl font-bold text-red-600">
                {lowStockCount}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <AlertCircle size={22} />
            </div>

          </div>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-gray-500">
                {t("Categories")}
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {categoriesCount}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Sprout size={22} />
            </div>

          </div>

        </div>

      </div>

      {/* Category tabs */}
      <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">

        <div className="flex min-w-max">

          {categories.map((category) => (
            <button
              key={category}
              onClick={() =>
                setActiveTab(category)
              }
              className={`px-5 py-3 text-sm font-medium transition ${
                activeTab === category
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t(category)}
            </button>
          ))}

        </div>

      </div>

      {/* Low Stock Alerts */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white">

        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">

          <div className="flex items-center gap-2">

            <AlertCircle
              size={20}
              className="text-red-500"
            />

            <h2 className="font-semibold text-gray-900">
              {t("Low Stock Alerts")}
            </h2>

          </div>

          <button
            onClick={() => {
              fetchInventory();
              fetchLowStockAlerts();
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
          >
            <RefreshCw size={16} />
            {t("Refresh")}
          </button>

        </div>

        <div className="overflow-x-auto">

          {filteredLowStockAlerts.length === 0 ? (

            <div className="p-8 text-center text-sm text-gray-500">
              {t("No low stock items for this farm.")}
            </div>

          ) : (

            <table className="w-full">

              <thead>

                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">

                  <th className="px-5 py-3 font-medium">
                    {t("Item")}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t("Category")}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t("Current")}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t("Reorder At")}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t("Action")}
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredLowStockAlerts.map(
                  (item) => (

                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0"
                    >

                      <td className="px-5 py-4">
                        <span className="font-medium text-gray-900">
                          {item.name}
                        </span>
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${getCategoryBackground(
                            item.category
                          )}`}
                        >
                          {t(item.category)}
                        </span>

                      </td>

                      <td className="px-5 py-4 text-sm text-red-600">
                        {item.current}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {item.reorderAt}
                      </td>

                      <td className="px-5 py-4">

                        <button
                          onClick={() => {

                            const inventoryItem =
                              inventory.find(
                                (inventoryItem) =>
                                  inventoryItem.id ===
                                  item.id
                              );

                            if (inventoryItem) {
                              openUpdateModal(
                                inventoryItem
                              );
                            } else {
                              setError(
                                t('Unable to find this inventory item.')
                              );
                            }
                          }}
                          className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 transition hover:bg-green-50"
                        >
                          {t("Update")}
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          )}

        </div>

      </div>

      {/* Inventory table */}
      <div className="rounded-xl border border-gray-200 bg-white">

        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">

          <div>

            <h2 className="font-semibold text-gray-900">
              {t("All Inventory")}
            </h2>

            <p className="mt-1 text-xs text-gray-500">

              {selectedFarm === 'all'
                ? t('Showing inventory from all farms')
                : `${t('Showing inventory for')} ${
                    farms.find(
                      (farm) =>
                        String(
                          farm.farmIDs
                        ) === selectedFarm
                    )?.farmNames ||
                    t('selected farm')
                  }`}

            </p>

          </div>

          <div className="text-sm text-gray-500">
            {filteredInventory.length} {t("items")}
          </div>

        </div>

        <div className="overflow-x-auto">

          {filteredInventory.length === 0 ? (

            <div className="p-10 text-center">

              <Package
                size={42}
                className="mx-auto mb-3 text-gray-300"
              />

              <p className="font-medium text-gray-700">
                {t("No inventory found")}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {t("There are no inventory items matching your current filters.")}
              </p>

            </div>

          ) : (

            <table className="w-full">

              <thead>

                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">

                  <th className="px-5 py-3 font-medium">
                    {t("Item")}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t("Category")}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t("Quantity")}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t("Last Restocked")}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t("Status")}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t("Farm")}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t("Action")}
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredInventory.map(
                  (item) => {

                    const farm =
                      farms.find(
                        (farm) =>
                          String(
                            farm.farmIDs
                          ) ===
                          String(
                            item.farmId
                          )
                      );

                    return (

                      <tr
                        key={item.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                              <Package size={18} />
                            </div>

                            <span className="font-medium text-gray-900">
                              {item.name}
                            </span>

                          </div>

                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.categoryBg}`}
                          >
                            {t(item.category)}
                          </span>

                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-gray-800">
                          {item.quantity}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-500">
                          {item.lastRestocked}
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.status ===
                              'Low Stock'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {t(item.status)}
                          </span>

                        </td>

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2 text-sm text-gray-600">

                            <MapPin
                              size={15}
                              className="text-gray-400"
                            />

                            {farm?.farmNames ||
                              `Farm ${item.farmId}`}

                          </div>

                        </td>

                        <td className="px-5 py-4">

                          <button
                            onClick={() =>
                              openUpdateModal(item)
                            }
                            className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 transition hover:bg-green-50"
                          >
                            {t("Update")}
                          </button>

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          )}

        </div>

      </div>

      {/* ========================================================
          ADD INVENTORY MODAL
          ======================================================== */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">

              <div>

                <h2 className="text-lg font-semibold text-gray-900">
                  {t("Add Inventory Item")}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {t("Add a new item to your farm inventory.")}
                </p>

              </div>

              <button
                onClick={() => {
                  setShowModal(false);
                  resetInventoryForm();
                }}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={handleAddInventory}
              className="space-y-5 p-6"
            >

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("Inventory Name")}
                </label>

                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value
                    })
                  }
                  placeholder={t("e.g. Urea Fertilizer")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("Category")}
                </label>

                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category:
                        e.target.value
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >

                  <option value="Fertilizer">
                    {t("Fertilizer")}
                  </option>

                  <option value="Pesticide & Crop Protection">
                    {t("Pesticide & Crop Protection")}
                  </option>

                  <option value="Equipment">
                    {t("Equipment")}
                  </option>

                  <option value="Machinery">
                    {t("Machinery")}
                  </option>

                  <option value="Seeds">
                    {t("Seeds")}
                  </option>

                </select>

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("Farm")}
                </label>

                <select
                  value={formData.farmIDs}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      farmIDs:
                        Number(
                          e.target.value
                        )
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >

                  <option value={0}>
                    {t("Select Farm")}
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

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t("Quantity")}
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity:
                          Number(
                            e.target.value
                          )
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t("Unit")}
                  </label>

                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unit: e.target.value
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  >

                    <option value="kg">
                      kg
                    </option>

                    <option value="g">
                      g
                    </option>

                    <option value="L">
                      L
                    </option>

                    <option value="ml">
                      ml
                    </option>

                    <option value="units">
                      {t("units")}
                    </option>

                  </select>

                </div>

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("Alert Limit")}
                </label>

                <input
                  type="number"
                  min="0"
                  value={formData.alertLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      alertLimit:
                        Number(
                          e.target.value
                        )
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

                <p className="mt-1 text-xs text-gray-500">
                  {t("A low-stock alert will appear when quantity reaches this value.")}
                </p>

              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">

                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetInventoryForm();
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {t("Cancel")}
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
                >
                  <Check size={17} />
                  {t("Add Inventory")}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ========================================================
          UPDATE INVENTORY MODAL
          ======================================================== */}

      {showUpdateModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">

              <div>

                <h2 className="text-lg font-semibold text-gray-900">
                  {t("Update Inventory Item")}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {t("Update the selected farm inventory item.")}
                </p>

              </div>

              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  resetUpdateForm();
                }}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={handleUpdateInventory}
              className="space-y-5 p-6"
            >

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("Inventory Name")}
                </label>

                <input
                  type="text"
                  value={updateFormData.name}
                  onChange={(e) =>
                    setUpdateFormData({
                      ...updateFormData,
                      name: e.target.value
                    })
                  }
                  placeholder={t("e.g. Urea Fertilizer")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("Category")}
                </label>

                <select
                  value={
                    updateFormData.category
                  }
                  onChange={(e) =>
                    setUpdateFormData({
                      ...updateFormData,
                      category:
                        e.target.value
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >

                  <option value="Fertilizer">
                    {t("Fertilizer")}
                  </option>

                  <option value="Pesticide & Crop Protection">
                    {t("Pesticide & Crop Protection")}
                  </option>

                  <option value="Equipment">
                    {t("Equipment")}
                  </option>

                  <option value="Machinery">
                    {t("Machinery")}
                  </option>

                  <option value="Seeds">
                    {t("Seeds")}
                  </option>

                </select>

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("Farm")}
                </label>

                <select
                  value={
                    updateFormData.farmIds
                  }
                  onChange={(e) =>
                    setUpdateFormData({
                      ...updateFormData,
                      farmIds:
                        Number(
                          e.target.value
                        )
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >

                  <option value={0}>
                    {t("Select Farm")}
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

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t("Quantity")}
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      updateFormData.quantity
                    }
                    onChange={(e) =>
                      setUpdateFormData({
                        ...updateFormData,
                        quantity:
                          Number(
                            e.target.value
                          )
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t("Unit")}
                  </label>

                  <select
                    value={
                      updateFormData.unit
                    }
                    onChange={(e) =>
                      setUpdateFormData({
                        ...updateFormData,
                        unit: e.target.value
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  >

                    <option value="kg">
                      kg
                    </option>

                    <option value="g">
                      g
                    </option>

                    <option value="L">
                      L
                    </option>

                    <option value="ml">
                      ml
                    </option>

                    <option value="units">
                      {t("units")}
                    </option>

                  </select>

                </div>

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("Alert Limit")}
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    updateFormData.alertLimit
                  }
                  onChange={(e) =>
                    setUpdateFormData({
                      ...updateFormData,
                      alertLimit:
                        Number(
                          e.target.value
                        )
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

                <p className="mt-1 text-xs text-gray-500">
                  {t("A low-stock alert will appear when quantity reaches this value.")}
                </p>

              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">

                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    resetUpdateForm();
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {t("Cancel")}
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
                >
                  <Check size={17} />
                  {t("Update Inventory")}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default Inventory;