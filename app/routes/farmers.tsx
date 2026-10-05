import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '~/utils/auth';
import {
  Search,
  Plus,
  Phone,
  Mail,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);

  const [workerError, setWorkerError] = useState('');
  const [farmError, setFarmError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('all');

  // Which three-dot menu is currently open
  const [openActionId, setOpenActionId] = useState<number | null>(null);

  // User selected for deletion
  const [deleteWorker, setDeleteWorker] = useState<Worker | null>(null);

  // Delete loading state
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  // =========================
  // Fetch Workers
  // =========================
  useEffect(() => {
    fetchWithAuth('/api/worker/workers')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Worker API is not available');
        }

        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkers(data);
          setWorkerError('');
        } else {
          setWorkers([]);
        }
      })
      .catch((err) => {
        console.error('Worker API error:', err);
        setWorkers([]);
        setWorkerError('Worker data is currently unavailable.');
      });
  }, []);

  // =========================
  // Fetch Farms
  // =========================
  useEffect(() => {
    fetchWithAuth('/api/worker/farms')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Farm API is not available');
        }

        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setFarms(data);
          setFarmError('');
        } else {
          setFarms([]);
        }
      })
      .catch((err) => {
        console.error('Farm API error:', err);
        setFarms([]);
        setFarmError('Farm data is currently unavailable.');
      });
  }, []);

  // =========================
  // Search + Farm Filtering
  // =========================
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

  const activeCount = workers.filter(
    (worker) => worker.status.toLowerCase() === 'active'
  ).length;

  const totalCount = workers.length;

  // =========================
  // Delete Button
  // =========================
  const handleDeleteClick = (worker: Worker) => {
    setOpenActionId(null);
    setDeleteWorker(worker);
  };

  // =========================
  // Confirm Delete
  // =========================
  const handleConfirmDelete = async () => {
    if (!deleteWorker) return;

    setIsDeleting(true);

    try {
      const response = await fetchWithAuth('/api/worker/delete', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        // User ID is sent directly as the body
        // Example: 5
        body: JSON.stringify(deleteWorker.id),
      });

      if (!response.ok) {
        throw new Error('Failed to delete worker');
      }

      // Remove the deleted worker from the frontend
      setWorkers((currentWorkers) =>
        currentWorkers.filter(
          (worker) => worker.id !== deleteWorker.id
        )
      );

      // Close confirmation popup
      setDeleteWorker(null);

    } catch (error) {
      console.error('Delete worker error:', error);

      alert(t('Failed to delete this user. Please try again.'));

    } finally {
      setIsDeleting(false);
    }
  };

  // =========================
  // Update Button
  // =========================
  const handleUpdateClick = (worker: Worker) => {
    setOpenActionId(null);

    // You can change this route later
    navigate(`/home/register-users`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-6 font-sans text-gray-800">

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* =========================
            Header
        ========================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2A471C] tracking-tight">
              {t("Worker Management")}
            </h1>

            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              {t("Manage and track all registered workers")}
            </p>
          </div>

          <button
            onClick={() => navigate('/home/register-users')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2A471C] hover:bg-[#203714] text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t("Add Worker")}
          </button>

        </div>

        {/* =========================
            Search + Filter + Statistics
        ========================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Search and Farm Filter */}
          <div className="sm:col-span-2 lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">

            {/* Search */}
            <div className="relative w-full">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-700" />

              <input
                type="text"
                placeholder={t("Search farmers...")}
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

              <option value="all">
                {t("All Farms")}
              </option>

              {farms.map((farm) => (
                <option
                  key={farm.farmIDs}
                  value={farm.farmNames}
                >
                  {farm.farmNames}
                </option>
              ))}

            </select>

            {farmError && (
              <p className="text-xs text-gray-400">
                {t(farmError)}
              </p>
            )}

          </div>

          {/* Active Farmers */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("Active Farmers")}
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-1">
                {activeCount}
              </p>
            </div>

            <div className="w-6 h-6 rounded-full border-2 border-emerald-600 flex items-center justify-center p-0.5">
              <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
            </div>

          </div>

          {/* Total Farmers */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("Total Farmers")}
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-1">
                {totalCount}
              </p>
            </div>

            <div className="w-6 h-6 rounded-full border-2 border-blue-600 flex items-center justify-center p-0.5">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
            </div>

          </div>

        </div>

        {/* =========================
            Farmers Table
        ========================= */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse">

              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">

                  <th className="py-4 px-6">
                    {t("Farmer")}
                  </th>

                  <th className="py-4 px-6">
                    {t("Role")}
                  </th>

                  <th className="py-4 px-6">
                    {t("Contact")}
                  </th>

                  <th className="py-4 px-6">
                    {t("Farm")}
                  </th>

                  <th className="py-4 px-6">
                    {t("Tasks")}
                  </th>

                  <th className="py-4 px-6">
                    {t("Status")}
                  </th>

                  <th className="py-4 px-6">
                    {t("Join Date")}
                  </th>

                  <th className="py-4 px-6 text-right">
                    {t("Actions")}
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-sm">

                {filteredWorkers.length > 0 ? (

                  filteredWorkers.map((worker) => (

                    <tr
                      key={`${worker.id}-${worker.farm}`}
                      className="hover:bg-gray-50/50 transition-colors"
                    >

                      {/* Farmer */}
                      <td className="py-4 px-6 whitespace-nowrap">

                        <div className="flex items-center gap-3">

                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">

                            {worker.profilePicture ? (

                              <img
                                src={worker.profilePicture}
                                alt={worker.name}
                                className="w-full h-full object-cover"
                              />

                            ) : (

                              <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold text-xs">

                                {worker.name
                                  .split(' ')
                                  .map((name) => name[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}

                              </div>

                            )}

                          </div>

                          <span className="font-semibold text-gray-900">
                            {worker.name}
                          </span>

                        </div>

                      </td>

                      {/* Role */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {t(worker.role)}
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-6 whitespace-nowrap">

                        <div className="space-y-1">

                          <div className="flex items-center gap-2 text-xs text-gray-600">

                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />

                            <span>
                              {worker.phone}
                            </span>

                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-600">

                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />

                            <span>
                              {worker.email}
                            </span>

                          </div>

                        </div>

                      </td>

                      {/* Farm */}
                      <td className="py-4 px-6 whitespace-nowrap">

                        <span className="text-gray-700 text-xs font-medium">
                          {worker.farm}
                        </span>

                      </td>

                      {/* Tasks */}
                      <td className="py-4 px-6">

                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">

                          {Array.isArray(worker.tasks) &&
                            worker.tasks.map((task, index) => (

                              <span
                                key={index}
                                className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium"
                              >
                                {t(task)}
                              </span>

                            ))}

                        </div>

                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">

                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${
                            worker.status.toLowerCase() === 'active'
                              ? 'bg-[#008728]'
                              : 'bg-gray-400'
                          }`}
                        >
                          {t(worker.status)}
                        </span>

                      </td>

                      {/* Join Date */}
                      <td className="py-4 px-6 whitespace-nowrap text-gray-600 text-xs">
                        {worker.joinDate}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 whitespace-nowrap text-right relative">

                        <button
                          onClick={() =>
                            setOpenActionId(
                              openActionId === worker.id
                                ? null
                                : worker.id
                            )
                          }
                          className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Action Menu */}
                        {openActionId === worker.id && (

                          <div className="absolute right-6 top-12 z-20 w-36 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">

                            {/* Update */}
                            <button
                              onClick={() =>
                                handleUpdateClick(worker)
                              }
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                            >

                              <Pencil className="w-4 h-4 text-gray-500" />

                              {t("Update")}

                            </button>

                            {/* Delete */}
                            <button
                              onClick={() =>
                                handleDeleteClick(worker)
                              }
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >

                              <Trash2 className="w-4 h-4" />

                              {t("Delete")}

                            </button>

                          </div>

                        )}

                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>

                    <td
                      colSpan={8}
                      className="text-center py-12 text-gray-400 text-sm"
                    >

                      {workerError
                        ? t(workerError)
                        : searchTerm || selectedFarm !== 'all'
                          ? t('No farmers found matching your filters.')
                          : t('No farmer data available.')}

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* =========================
          Delete Confirmation Popup
      ========================= */}
      {deleteWorker && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">

            {/* Popup Header */}
            <div className="flex items-start justify-between">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">

                  <Trash2 className="w-5 h-5 text-red-600" />

                </div>

                <div>

                  <h2 className="text-lg font-semibold text-gray-900">
                    {t("Delete User")}
                  </h2>

                  <p className="text-xs text-gray-500 mt-0.5">
                    {t("This action cannot be undone.")}
                  </p>

                </div>

              </div>

              <button
                onClick={() => setDeleteWorker(null)}
                disabled={isDeleting}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* Popup Message */}
            <div className="mt-5">

              <p className="text-sm text-gray-600">

                {t("Are you sure you want to delete")}{' '}

                <span className="font-semibold text-gray-900">
                  {deleteWorker.name}
                </span>

                ?

              </p>

            </div>

            {/* Popup Buttons */}
            <div className="flex justify-end gap-3 mt-6">

              {/* Cancel */}
              <button
                onClick={() => setDeleteWorker(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {t("Cancel")}
              </button>

              {/* Delete */}
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >

                {isDeleting
                  ? t('Deleting...')
                  : t('Delete')}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}