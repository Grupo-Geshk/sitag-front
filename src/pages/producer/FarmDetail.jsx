import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProducerLayout from '../../components/layout/ProducerLayout';
import DivisionModal from '../../components/producer/DivisionModal';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { getProducerId } from '../../lib/auth';
import toast from 'react-hot-toast';

export default function FarmDetail() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [farm, setFarm] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [isDivisionModalOpen, setIsDivisionModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState(null);
  const [isEditingFarmName, setIsEditingFarmName] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
    fetchFarmDetail();
    fetchDivisions();
  }, [farmId]);

  const fetchFarmDetail = async () => {
    try {
      setLoading(true);
      const producerId = getProducerId();
      const farmData = await farmsAPI.getFarmById(farmId);
      setFarm(farmData);
      setFarmName(farmData.name);
    } catch (error) {
      console.error('Error fetching farm:', error);
      toast.error('Error al cargar los detalles de la finca');
    } finally {
      setLoading(false);
    }
  };

  const fetchDivisions = async () => {
    try {
      const divisionsData = await divisionsAPI.getDivisionsByFarm(farmId);
      setDivisions(divisionsData);
    } catch (error) {
      console.error('Error fetching divisions:', error);
    }
  };

  const handleDivisionSaved = () => {
    fetchDivisions();
  };

  const handleEditDivision = (division) => {
    setEditingDivision(division);
    setIsDivisionModalOpen(true);
  };

  const handleDeleteDivision = async (divisionId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta división? Los animales asignados quedarán sin división.')) {
      return;
    }

    try {
      await divisionsAPI.deleteDivision(divisionId);
      toast.success('División eliminada exitosamente');
      fetchDivisions();
    } catch (error) {
      console.error('Error deleting division:', error);
      toast.error('Error al eliminar la división');
    }
  };

  const handleSaveFarmName = async () => {
    try {
      await farmsAPI.updateFarm(farmId, {
        name: farmName,
        location: farm.location,
        type: farm.type,
        tenancy: farm.tenancy
      });
      toast.success('Nombre de finca actualizado');
      setIsEditingFarmName(false);
      fetchFarmDetail();
    } catch (error) {
      console.error('Error updating farm name:', error);
      toast.error('Error al actualizar el nombre');
    }
  };

  if (loading) {
    return (
      <ProducerLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4" style={{ color: '#3FA79F' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Cargando detalles de la finca...</p>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  if (!farm) {
    return (
      <ProducerLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Finca no encontrada</h3>
            <button
              onClick={() => navigate('/producer/fincas')}
              className="mt-4 px-6 py-2.5 text-white rounded-lg font-medium"
              style={{ backgroundColor: '#3FA79F' }}
            >
              Volver a Fincas
            </button>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  // Mock data for demo - will be replaced with actual API calls
  const estadoHato = {
    totalAnimales: farm.animalsCount || 0,
    animalesActivos: farm.animalsCount || 0,
    animalesMachos: 0,
    animalesHembras: 0,
    animalesEnfermos: 0,
  };

  const recentEvents = [];
  const recentMovements = [];

  return (
    <ProducerLayout>
      <DivisionModal
        isOpen={isDivisionModalOpen}
        onClose={() => {
          setIsDivisionModalOpen(false);
          setEditingDivision(null);
        }}
        farmId={farmId}
        division={editingDivision}
        onDivisionSaved={handleDivisionSaved}
      />

      <div className="max-w-6xl mx-auto space-y-5">
        {/* Layer 1: Farm Context and Actions */}
        <div className="space-y-3">
          {/* Breadcrumb */}
          <button
            onClick={() => navigate('/producer/fincas')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Fincas
          </button>

          {/* Contextual Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditingFarmName ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    className="text-2xl font-bold px-2 py-1 border-2 rounded focus:outline-none"
                    style={{ borderColor: '#3FA79F', color: '#3FA79F' }}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveFarmName}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded"
                    style={{ backgroundColor: '#3FA79F' }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setFarmName(farm.name);
                      setIsEditingFarmName(false);
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold" style={{ color: '#3FA79F' }}>
                    {farm.name}
                  </h1>
                  <button
                    onClick={() => setIsEditingFarmName(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Editar nombre"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Farm metadata - grouped and cohesive */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`px-2.5 py-1 rounded border font-medium ${farm.tenancy === 'Propia' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                  {farm.tenancy === 'Propia' ? 'Propia' : 'Arrendada'}
                </span>
                <span className="text-gray-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {farm.location}
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-600">{farm.type}</span>
              </div>
            </div>

            {/* Actions Area */}
            <div className="flex items-center gap-2">
              {/* Primary Action */}
              <button
                onClick={() => toast.info('Función en desarrollo')}
                className="px-4 py-2.5 text-white rounded-lg font-medium hover:brightness-95 transition-all flex items-center gap-2"
                style={{ backgroundColor: '#3FA79F' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar Evento
              </button>

              {/* Secondary Actions Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  className="px-3 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Más acciones"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {showActionMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowActionMenu(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                      <button
                        onClick={() => { setShowActionMenu(false); toast.info('Función en desarrollo'); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Registrar Movimiento
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => { setShowActionMenu(false); setIsDivisionModalOpen(true); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                        </svg>
                        Gestionar Divisiones
                      </button>
                      <button
                        onClick={() => { setShowActionMenu(false); toast.info('Función en desarrollo'); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Gestionar Servicios
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Layer 2: Herd Status - Unified Metrics Component */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
            Estado General del Hato
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center px-3 py-2.5 bg-gray-50 rounded border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Total</p>
              <p className="text-xl font-bold" style={{ color: '#3FA79F' }}>{estadoHato.totalAnimales}</p>
            </div>
            <div className="text-center px-3 py-2.5 bg-gray-50 rounded border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Activos</p>
              <p className="text-xl font-bold text-gray-900">{estadoHato.animalesActivos}</p>
            </div>
            <div className="text-center px-3 py-2.5 bg-gray-50 rounded border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Machos</p>
              <p className="text-xl font-bold text-gray-900">{estadoHato.animalesMachos}</p>
            </div>
            <div className="text-center px-3 py-2.5 bg-gray-50 rounded border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Hembras</p>
              <p className="text-xl font-bold text-gray-900">{estadoHato.animalesHembras}</p>
            </div>
            <div className="text-center px-3 py-2.5 bg-gray-50 rounded border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Enfermos</p>
              <p className="text-xl font-bold" style={{ color: estadoHato.animalesEnfermos > 0 ? '#D97706' : '#3FA79F' }}>
                {estadoHato.animalesEnfermos}
              </p>
            </div>
          </div>
        </div>

        {/* Layer 2: Farm Structure - Divisions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Divisiones ({divisions.length})
            </h3>
            <button
              onClick={() => setIsDivisionModalOpen(true)}
              className="text-xs font-medium hover:underline flex items-center gap-1"
              style={{ color: '#3FA79F' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar División
            </button>
          </div>

          {divisions.length === 0 ? (
            <div className="text-center py-8 px-4 bg-gray-50 rounded border border-gray-100">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">Sin divisiones configuradas</p>
              <p className="text-xs text-gray-500 mb-3">Organiza tu finca en divisiones para un mejor control del hato</p>
              <button
                onClick={() => setIsDivisionModalOpen(true)}
                className="text-xs font-medium hover:underline"
                style={{ color: '#3FA79F' }}
              >
                Crear primera división
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {divisions.map((division) => (
                <div key={division.id} className="group relative border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-0.5">{division.name}</h4>
                      {division.description && (
                        <p className="text-xs text-gray-600 line-clamp-1">{division.description}</p>
                      )}
                    </div>
                    {/* Action buttons - show on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() => handleEditDivision(division)}
                        className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                        title="Editar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteDivision(division.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-bold" style={{ color: '#3FA79F' }}>0</span>
                    <span className="text-xs text-gray-500">animales</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Layer 3: Recent Activity - Complementary Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Recent Events */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
              Eventos Recientes
            </h3>
            {recentEvents.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-gray-900 font-medium mb-1">Sin eventos registrados</p>
                <p className="text-xs text-gray-500 mb-3">Los eventos de esta finca aparecerán aquí</p>
                <button
                  onClick={() => toast.info('Función en desarrollo')}
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#3FA79F' }}
                >
                  Registrar primer evento
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentEvents.map((event) => (
                  <div key={event.id} className="px-3 py-2 bg-gray-50 rounded border border-gray-100">
                    <p className="text-xs font-medium text-gray-900">{event.type}</p>
                    <p className="text-xs text-gray-500">{event.date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Movements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
              Movimientos Recientes
            </h3>
            {recentMovements.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p className="text-sm text-gray-900 font-medium mb-1">Sin movimientos registrados</p>
                <p className="text-xs text-gray-500 mb-3">Los movimientos entre fincas aparecerán aquí</p>
                <button
                  onClick={() => toast.info('Función en desarrollo')}
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#3FA79F' }}
                >
                  Registrar primer movimiento
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMovements.map((movement) => (
                  <div key={movement.id} className="px-3 py-2 bg-gray-50 rounded border border-gray-100">
                    <p className="text-xs font-medium text-gray-900">{movement.description}</p>
                    <p className="text-xs text-gray-500">{movement.date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProducerLayout>
  );
}
