import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProducerLayout from '../../components/layout/ProducerLayout';
import EventModal from '../../components/producer/EventModal';
import AnimalModal from '../../components/producer/AnimalModal';
import HealthStatusModal from '../../components/producer/HealthStatusModal';
import ServiceModal from '../../components/producer/ServiceModal';
import { animalsAPI } from '../../api/animals';
import { animalEventsAPI } from '../../api/animalEvents';
import { movementsAPI } from '../../api/movements';
import { farmsAPI } from '../../api/farms';
import { servicesAPI } from '../../api/services';
import { resolveEventDisplay } from '../../lib/eventRegistry';
import EventIcon from '../../lib/eventIcons';
import { uploadToImgbb } from '../../lib/imgbb';
import EditAnimalModal from '../../components/producer/EditAnimalModal';
import toast from 'react-hot-toast';
import { canUseFeature } from '../../lib/plan';

// ── Event Detail Panel ────────────────────────────────────────────────────────
// Shown when the user clicks "Ver" on a timeline entry.
// Supports viewing, editing mutable fields, and deleting with confirmation.

function EventDetailPanel({ event, animalId, onClose, onUpdated, onDeleted }) {
  const [mode, setMode]       = useState('view'); // 'view' | 'edit' | 'confirm-delete'
  const [saving, setSaving]   = useState(false);
  const [formData, setFormData] = useState({
    eventDate:   event.date
      ? new Date(event.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    description: '',
    cost:        '',
  });

  // Decode the clean description from the raw description (strip domain prefix)
  const resolved = resolveEventDisplay(event.eventType, event.description);

  // Populate edit form from resolved clean description on open
  useEffect(() => {
    setFormData({
      eventDate:   event.date
        ? new Date(event.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      description: resolved.cleanDescription || '',
      cost:        event.cost != null ? String(event.cost) : '',
    });
    setMode('view');
  }, [event.eventId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Re-encode the description with the domain prefix if it was an Otro-encoded event
      let encodedDescription;
      if (event.eventType === 'Otro' && resolved.domainKey !== 'Otro') {
        // Rebuild with prefix: "DomainKey | notes"
        encodedDescription = formData.description.trim()
          ? `${resolved.domainKey} | ${formData.description.trim()}`
          : resolved.domainKey;
      } else {
        encodedDescription = formData.description.trim() || null;
      }

      await animalEventsAPI.updateEvent(animalId, event.eventId, {
        eventDate:   new Date(formData.eventDate + 'T12:00:00').toISOString(),
        description: encodedDescription,
        cost:        formData.cost ? parseFloat(formData.cost) : null,
        workerId:    null,
      });
      toast.success('Evento actualizado');
      onUpdated();
      onClose();
    } catch (err) {
      console.error('Update event error:', err);
      toast.error(err.response?.data?.message || 'Error al actualizar el evento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await animalEventsAPI.deleteEvent(animalId, event.eventId);

      let successMsg = 'Evento eliminado';
      if (event.eventType === 'Muerte') {
        successMsg = 'Evento de muerte eliminado. El animal fue reactivado.';
      } else if (event.eventType === 'RegistroPeso') {
        successMsg = 'Peso eliminado. El peso del animal fue recalculado.';
      }

      toast.success(successMsg);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Delete event error:', err);
      toast.error(err.response?.data?.message || 'Error al eliminar el evento');
    } finally {
      setSaving(false);
    }
  };

  const isStateLinked = resolved.stateLinked;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: resolved.badgeBg }}
            >
              {resolved.icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{resolved.label}</h2>
              <p className="text-xs text-gray-400">{resolved.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* View mode */}
          {mode === 'view' && (
            <>
              {isStateLinked && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  Este tipo de evento afecta el estado del animal. Al editarlo o eliminarlo,
                  el estado se actualizará automáticamente.
                </div>
              )}
              {resolved.critical && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  Evento crítico — eliminar reactivará el animal y lo devolverá al hato activo.
                </div>
              )}

              <div className="space-y-3 text-sm">
                <Row label="Fecha">
                  {new Date(event.date).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </Row>
                <Row label="Descripción">
                  {resolved.cleanDescription || <span className="text-gray-400 italic">Sin notas</span>}
                </Row>
                {event.cost != null && event.eventType === 'RegistroPeso' && (
                  <Row label="Peso registrado">{Number(event.cost).toLocaleString()} kg</Row>
                )}
                {event.cost != null && event.eventType !== 'RegistroPeso' && (
                  <Row label="Costo / Monto">${Number(event.cost).toLocaleString()}</Row>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setMode('edit')}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 border-gray-200 text-gray-700 hover:border-[#3FA79F] hover:text-[#3FA79F] transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => setMode('confirm-delete')}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </>
          )}

          {/* Edit mode */}
          {mode === 'edit' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha del evento</label>
                <input
                  type="date"
                  value={formData.eventDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData(p => ({ ...p, eventDate: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas / Descripción</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detalles adicionales…"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors resize-none"
                />
              </div>
              {event.eventType === 'RegistroPeso' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Peso registrado (kg)</label>
                  <input
                    type="number"
                    value={formData.cost}
                    min="0"
                    step="0.1"
                    onChange={e => setFormData(p => ({ ...p, cost: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
                  />
                </div>
              )}
              {event.eventType !== 'RegistroPeso' && event.cost != null && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Costo / Monto</label>
                  <input
                    type="number"
                    value={formData.cost}
                    min="0"
                    step="0.01"
                    onChange={e => setFormData(p => ({ ...p, cost: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#3FA79F] text-sm transition-colors"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setMode('view')} disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#3FA79F' }}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </>
          )}

          {/* Delete confirmation */}
          {mode === 'confirm-delete' && (
            <>
              <div className="px-3 py-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-800 mb-1">¿Eliminar este evento?</p>
                <p className="text-xs text-red-700 leading-relaxed">
                  {resolved.critical
                    ? 'Al eliminar este registro de muerte, el animal será reactivado y volverá al hato activo.'
                    : resolved.stateLinked
                    ? 'Al eliminar este registro, el estado del animal será recalculado automáticamente.'
                    : 'Esta acción no puede deshacerse desde la interfaz.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMode('view')} disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={handleDelete} disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50">
                  {saving ? 'Eliminando…' : 'Eliminar evento'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-shrink-0 pt-0.5 w-28">
        {label}
      </span>
      <span className="text-sm text-gray-800 text-right break-words">{children}</span>
    </div>
  );
}

// ── AnimalDetail Page ─────────────────────────────────────────────────────────

// GenealogyNode and GenealogyTree are now in GenealogyPanel.jsx

// ── Photo update modal ────────────────────────────────────────────────────────
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function CameraOverlay({ onCapture, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady]           = useState(false);
  const [camError, setCamError]     = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  const startStream = async (facing) => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setCamError('No se pudo acceder a la cámara. Verifica los permisos.');
        console.error(err);
      }
    }
  };

  useEffect(() => { startStream(facingMode); return () => streamRef.current?.getTracks().forEach(t => t.stop()); }, [facingMode]);

  const handleCapture = () => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      streamRef.current?.getTracks().forEach(t => t.stop());
      onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {camError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-white">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <p className="text-sm text-center text-red-300">{camError}</p>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted onCanPlay={() => setReady(true)}
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
        )}
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
          <button type="button" onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); }}
            className="flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Cancelar
          </button>
          <button type="button" onClick={() => setFacingMode(p => p === 'environment' ? 'user' : 'environment')}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center py-8 bg-black">
        <button type="button" onClick={handleCapture} disabled={!ready || !!camError}
          className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 disabled:opacity-40 transition-all flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}

function PhotoUpdateModal({ animalId, currentUrl, onClose, onUpdated }) {
  const [file, setFile]           = useState(null);   // File object selected by user
  const [localUrl, setLocalUrl]   = useState(null);   // ObjectURL for instant preview
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus]       = useState('idle'); // 'idle' | 'uploading' | 'saving'
  const [error, setError]         = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef(null);

  // Revoke the object URL when the component unmounts or a new file is chosen
  useEffect(() => {
    return () => { if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [localUrl]);

  const applyFile = (f) => {
    setError(null);
    if (!f.type.startsWith('image/')) {
      setError('Solo se permiten imágenes (JPG, PNG, WEBP, etc.).');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError('La imagen no puede superar 10 MB.');
      return;
    }
    if (localUrl) URL.revokeObjectURL(localUrl);
    setFile(f);
    setLocalUrl(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f);
  };

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
    // Reset input so the same file can be re-selected if user clears and picks again
    e.target.value = '';
  };

  const handleClearFile = () => {
    if (localUrl) URL.revokeObjectURL(localUrl);
    setFile(null);
    setLocalUrl(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || status !== 'idle') return;

    setError(null);
    setStatus('uploading');
    try {
      // 1. Upload image to ImgBB
      const { url } = await uploadToImgbb(file);

      setStatus('saving');
      // 2. Fetch current animal data to preserve all required PUT fields
      const animal = await animalsAPI.getAnimalById(animalId);

      // 3. Persist the returned URL in the backend
      await animalsAPI.updateAnimal(animalId, {
        name:       animal.name,
        breed:      animal.breed,
        color:      animal.color || null,
        sex:        animal.sex,
        birthDate:  animal.birthDate,
        weight:     animal.currentWeight,
        farmId:     animal.farmId,
        divisionId: animal.divisionId || null,
        photoUrl:   url,
        motherRef:  animal.motherRef  || null,
        fatherRef:  animal.fatherRef  || null,
      });

      toast.success('Foto actualizada correctamente');
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al subir la imagen. Intenta de nuevo.');
      setStatus('idle');
    }
  };

  const busy = status !== 'idle';

  const statusLabel = {
    uploading: 'Subiendo a ImgBB…',
    saving:    'Guardando en sistema…',
  }[status] || 'Subir foto';

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Foto del animal</h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Camera overlay */}
        {showCamera && (
          <CameraOverlay
            onCapture={f => { setShowCamera(false); applyFile(f); }}
            onClose={() => setShowCamera(false)}
          />
        )}

        {/* Drop zone / preview */}
        {localUrl ? (
          /* ── Preview ── */
          <div className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
            <img
              src={localUrl}
              alt="Vista previa"
              className="w-full h-52 object-contain"
            />
            {!busy && (
              <button
                onClick={handleClearFile}
                className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full shadow-sm flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                title="Quitar imagen"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          /* ── Drop zone + camera ── */
          <div className="space-y-2">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 h-36 rounded-xl border-2 border-dashed cursor-pointer transition-colors select-none ${
                isDragging
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-gray-200 bg-gray-50 hover:border-teal-300 hover:bg-teal-50/40'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">Arrastra una imagen aquí</p>
              <p className="text-xs text-gray-400 text-center px-4">
                o haz clic para seleccionar · JPG, PNG, WEBP · máx. 10 MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => setShowCamera(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Tomar foto con cámara
            </button>
          </div>
        )}

        {/* Current photo hint (when no new file chosen yet) */}
        {currentUrl && !localUrl && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <img
              src={currentUrl}
              alt=""
              className="w-6 h-6 rounded object-cover flex-shrink-0"
              onError={e => { e.target.style.display = 'none'; }}
            />
            Foto actual · subir una nueva la reemplazará
          </div>
        )}

        {/* Upload progress steps */}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4 animate-spin text-teal-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>
              {status === 'uploading' && 'Subiendo imagen a ImgBB…'}
              {status === 'saving'    && 'Guardando URL en el sistema…'}
            </span>
          </div>
        )}

        {/* Inline error */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || busy}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
            style={{ backgroundColor: '#3FA79F' }}
          >
            {busy ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {statusLabel}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Subir foto
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Parto Performance Chart ───────────────────────────────────────────────────
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function PartoBarChart({ items, highlightIndex, labelKey, countKey }) {
  const BAR_W = 28;
  const GAP   = 10;
  const H     = 80;
  const maxCount = Math.max(...items.map(i => i[countKey]), 1);
  const svgW  = items.length * (BAR_W + GAP) + GAP;

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(svgW, 200)} height={H + 28} className="overflow-visible">
        {items.map((item, i) => {
          const count = item[countKey];
          const barH  = count > 0 ? Math.max(6, Math.round((count / maxCount) * H)) : 0;
          const x     = GAP + i * (BAR_W + GAP);
          const y     = H - barH;
          const isHL  = i === highlightIndex;
          return (
            <g key={item[labelKey]}>
              {count === 0 ? (
                <rect x={x} y={H - 3} width={BAR_W} height={3} rx={2} fill="#F1F5F9" />
              ) : (
                <rect x={x} y={y} width={BAR_W} height={barH} rx={4} fill={isHL ? '#3FA79F' : '#94D5D0'} />
              )}
              {count > 0 && (
                <text x={x + BAR_W / 2} y={y - 4} textAnchor="middle" fontSize={10} fontWeight="700" fill={isHL ? '#3FA79F' : '#64748B'}>
                  {count}
                </text>
              )}
              <text x={x + BAR_W / 2} y={H + 16} textAnchor="middle" fontSize={9} fill={isHL ? '#3FA79F' : '#94A3B8'} fontWeight={isHL ? '700' : '400'}>
                {item[labelKey]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PartoPerformanceChart({ rawEvents }) {
  const [view, setView] = useState('year'); // 'year' | 'all'

  const partoEvents = rawEvents
    .filter(e => e.eventType === 'Otro' && typeof e.description === 'string' && e.description.startsWith('Parto |'))
    .map(e => new Date(e.eventDate || e.date))
    .filter(d => !isNaN(d))
    .sort((a, b) => a - b);

  if (partoEvents.length === 0) return null;

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-based

  // ── Vista: este año por mes ──────────────────────────────────────────────
  const byMonth = Array.from({ length: 12 }, (_, m) => ({
    label: MESES_CORTOS[m],
    month: m,
    count: partoEvents.filter(d => d.getFullYear() === currentYear && d.getMonth() === m).length,
  }));
  const thisYearCount = byMonth.reduce((s, m) => s + m.count, 0);

  // ── Vista: todos los años ────────────────────────────────────────────────
  const yearSet = [...new Set(partoEvents.map(d => d.getFullYear()))].sort((a, b) => a - b);
  const byYear  = yearSet.map(y => ({
    label: String(y),
    year:  y,
    count: partoEvents.filter(d => d.getFullYear() === y).length,
  }));
  const currentYearIdx = byYear.findIndex(y => y.year === currentYear);

  // ── Interval stats (global, based on all partos) ─────────────────────────
  let avgMonths = null, minMonths = null, maxMonths = null;
  if (partoEvents.length >= 2) {
    const intervals = [];
    for (let i = 1; i < partoEvents.length; i++) {
      intervals.push((partoEvents[i] - partoEvents[i - 1]) / (1000 * 60 * 60 * 24 * 30.44));
    }
    avgMonths = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    minMonths = Math.round(Math.min(...intervals));
    maxMonths = Math.round(Math.max(...intervals));
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Desempeño Reproductivo</p>
          <p className="text-xs text-gray-500">
            {view === 'year' ? `Partos en ${currentYear}` : 'Partos por año'}
          </p>
        </div>
        {/* Switch */}
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          <button
            onClick={() => setView('year')}
            className={`px-3 py-1.5 transition-colors ${view === 'year' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={view === 'year' ? { backgroundColor: '#3FA79F' } : {}}
          >
            {currentYear}
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${view === 'all' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={view === 'all' ? { backgroundColor: '#3FA79F' } : {}}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* Stat pill */}
      <p className="text-2xl font-bold mb-3" style={{ color: '#3FA79F' }}>
        {view === 'year' ? thisYearCount : partoEvents.length}
        <span className="text-sm font-normal text-gray-400 ml-1">
          {view === 'year' ? 'partos este año' : 'partos en total'}
        </span>
      </p>

      {/* Chart */}
      {view === 'year' ? (
        <PartoBarChart items={byMonth} highlightIndex={currentMonth} labelKey="label" countKey="count" />
      ) : (
        <PartoBarChart items={byYear} highlightIndex={currentYearIdx} labelKey="label" countKey="count" />
      )}

      {/* Interval stats */}
      {avgMonths !== null && (
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-gray-800">{avgMonths}m</p>
            <p className="text-xs text-gray-400">intervalo prom.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{minMonths}m</p>
            <p className="text-xs text-gray-400">mín.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{maxMonths}m</p>
            <p className="text-xs text-gray-400">máx.</p>
          </div>
        </div>
      )}
      {partoEvents.length === 1 && (
        <p className="mt-2 text-xs text-gray-400 text-center">Registra más partos para ver el intervalo promedio.</p>
      )}
    </div>
  );
}

export default function AnimalDetail() {
  const { animalId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading]                     = useState(true);
  const [animal, setAnimal]                       = useState(null);
  const [timelineEvents, setTimelineEvents]       = useState([]);
  const [timelineMovements, setTimelineMovements] = useState([]);
  const [rawEvents, setRawEvents]                 = useState([]);   // for Destete check
  const [showEventModal, setShowEventModal]       = useState(false);
  const [eventTypePreset, setEventTypePreset]     = useState(null);
  const [showPesoModal, setShowPesoModal]         = useState(false);
  const [showActionMenu, setShowActionMenu]       = useState(false);
  const [showHealthStatusModal, setShowHealthStatusModal] = useState(false);
  const [showPartoAnimalModal, setShowPartoAnimalModal]   = useState(false);
  const [partoMotherAnimal, setPartoMotherAnimal]         = useState(null);
  const [selectedEvent, setSelectedEvent]         = useState(null); // for detail panel
  const [showPhotoModal, setShowPhotoModal]       = useState(false);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [showEditModal, setShowEditModal]         = useState(false);
  const [animalMovements, setAnimalMovements]     = useState([]);
  const [animalServices, setAnimalServices]       = useState([]);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [assigningTag, setAssigningTag]           = useState(false);
  const [tagInput, setTagInput]                   = useState('');
  const [savingTag, setSavingTag]                 = useState(false);

  const fetchAnimalDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await animalsAPI.getAnimalById(animalId);
      setAnimal(data);
    } catch {
      toast.error('Error al cargar los detalles del animal');
    } finally {
      setLoading(false);
    }
  }, [animalId]);

  const handleAssignTag = async () => {
    if (!tagInput.trim()) return;
    setSavingTag(true);
    try {
      const updated = await animalsAPI.assignTag(animalId, tagInput.trim());
      setAnimal(updated);
      setAssigningTag(false);
      setTagInput('');
      toast.success('Arete asignado correctamente');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al asignar el arete');
    } finally {
      setSavingTag(false);
    }
  };

  const fetchAnimalTimeline = useCallback(async () => {
    try {
      const entries = await animalsAPI.getAnimalTimeline(animalId);
      setTimelineEvents(entries.filter(e => e.entryType === 'EVENT'));
      setTimelineMovements(entries.filter(e => e.entryType === 'MOVEMENT'));
    } catch {
      // non-fatal
    }
  }, [animalId]);

  const fetchRawEvents = useCallback(async () => {
    try {
      const data = await animalsAPI.getAnimalEvents(animalId);
      setRawEvents(Array.isArray(data) ? data : (data?.items ?? []));
    } catch {
      // non-fatal
    }
  }, [animalId]);

  const fetchAnimalServices = useCallback(async () => {
    try {
      const data = await servicesAPI.getServicesByAnimal(animalId);
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      // Sort newest first
      list.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
      setAnimalServices(list);
    } catch {
      // non-fatal
    }
  }, [animalId]);

  const fetchAnimalMovements = useCallback(async () => {
    try {
      const [movements, farms] = await Promise.all([
        movementsAPI.getMovementsByAnimal(animalId),
        farmsAPI.getAllFarms(),
      ]);
      const farmMap = {};
      (Array.isArray(farms) ? farms : []).forEach(f => { farmMap[f.id] = f.name; });
      const enriched = (Array.isArray(movements) ? movements : []).map(m => ({
        ...m,
        fromFarmName: m.fromFarmId ? (farmMap[m.fromFarmId] || 'Finca desconocida') : null,
        toFarmName:   m.toFarmId   ? (farmMap[m.toFarmId]   || 'Finca desconocida') : null,
      }));
      setAnimalMovements(enriched);
    } catch {
      // non-fatal
    }
  }, [animalId]);

  useEffect(() => {
    fetchAnimalDetails();
    fetchAnimalTimeline();
    fetchRawEvents();
    fetchAnimalMovements();
    fetchAnimalServices();
  }, [fetchAnimalDetails, fetchAnimalTimeline, fetchRawEvents, fetchAnimalMovements, fetchAnimalServices]);

  const handleEventCreated = () => {
    setShowEventModal(false);
    setEventTypePreset(null);
    fetchAnimalDetails();
    fetchAnimalTimeline();
    fetchRawEvents();
    fetchAnimalMovements();
  };

  // Parto: EventModal delegates to this → open AnimalModal for cría registration.
  // After the calf is created, we create a Parto event on the mother.
  const handlePartoRegistered = (motherAnimal) => {
    setPartoMotherAnimal(motherAnimal);
    setShowPartoAnimalModal(true);
  };

  const handleCalfCreated = async () => {
    if (partoMotherAnimal) {
      try {
        await animalEventsAPI.createEvent({
          animalId:    partoMotherAnimal.id,
          eventType:   'Otro',
          eventDate:   new Date().toISOString(),
          description: 'Parto | Cría registrada exitosamente',
        });
      } catch (err) {
        // Non-fatal: the calf exists even if the mother's event fails.
        console.warn('Parto event on mother failed (non-fatal):', err);
      }
    }
    setShowPartoAnimalModal(false);
    setPartoMotherAnimal(null);
    fetchAnimalDetails();
    fetchAnimalTimeline();
    fetchRawEvents();
    fetchAnimalMovements();
    toast.success('Cría registrada. Parto registrado en el historial de la madre.');
  };


  const handleQuickWeightRegistration = () => {
    setShowPesoModal(true);
    setShowActionMenu(false);
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Desconocida';
    const diffMs   = Date.now() - new Date(birthDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    const months = Math.floor(diffDays / 30.44);
    if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    const years = Math.floor(months / 12);
    const rem   = months % 12;
    return rem === 0 ? `${years} ${years === 1 ? 'año' : 'años'}` : `${years}a ${rem}m`;
  };

  const getHealthStatusConfig = (status) => {
    const configs = {
      Sano: {
        label: 'Sano', color: 'text-gray-700', bgColor: 'bg-green-50', borderColor: 'border-green-200',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
      Enfermo: {
        label: 'Enfermo', color: 'text-gray-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      },
      EnTratamiento: {
        label: 'En Tratamiento', color: 'text-gray-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
      },
      Critico: {
        label: 'Crítico', color: 'text-gray-700', bgColor: 'bg-red-50', borderColor: 'border-red-200',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
      Fallecido: {
        label: 'Fallecido', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      },
    };
    return configs[status] || {
      label: 'Sin datos', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    };
  };

  const getStatusConfig = (status) => {
    const configs = {
      Activo:  { label: 'Activo',  color: 'bg-green-50 text-green-700 border-green-200' },
      Vendido: { label: 'Vendido', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      Muerto:  { label: 'Muerto',  color: 'bg-red-50 text-red-700 border-red-200' },
      Perdido: { label: 'Perdido', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    };
    return configs[status] || { label: status, color: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  const SERVICE_TYPE_LABELS = {
    Vacunacion:     'Vacunación',
    Desparasitacion:'Desparasitación',
    Medicacion:     'Medicación',
    Banio:          'Baño',
    Alimentacion:   'Alimentación',
    Inseminacion:   'Inseminación',
    Pesaje:         'Pesaje',
    Herrado:        'Herrado',
    Sangria:        'Sangría',
  };

  const timeAgo = (dateStr) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return 'hoy';
    if (days === 1) return 'ayer';
    if (days < 7)  return `hace ${days} días`;
    if (days < 30) return `hace ${Math.floor(days / 7)} sem.`;
    if (days < 365)return `hace ${Math.floor(days / 30)} meses`;
    return `hace ${Math.floor(days / 365)} años`;
  };

  if (loading) {
    return (
      <ProducerLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4" style={{ color: '#3FA79F' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Cargando detalles del animal...</p>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  if (!animal) {
    return (
      <ProducerLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Animal no encontrado</h3>
            <button onClick={() => navigate('/producer/animales')}
              className="mt-4 px-6 py-2.5 text-white rounded-lg font-medium"
              style={{ backgroundColor: '#3FA79F' }}>
              Volver a Animales
            </button>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  const healthConfig  = getHealthStatusConfig(animal.healthStatus);
  const statusConfig  = getStatusConfig(animal.status);
  const age           = calculateAge(animal.birthDate);
  const isActive      = animal.status === 'Activo';

  return (
    <ProducerLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* ── Hero card ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {animal.photoUrl ? (
            /* ── Hero image band ── */
            <div className="relative h-52 sm:h-64">
              <img
                src={animal.photoUrl}
                alt={animal.name || `#${animal.tagNumber}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setShowPhotoLightbox(true)}
                title="Ver foto"
              />
              {/* gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />

              {/* back button — top left */}
              <button
                onClick={() => navigate('/producer/animales')}
                className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/30 backdrop-blur-sm text-white text-xs font-medium rounded-lg hover:bg-black/45 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </button>

              {/* info overlay — bottom (pointer-events-none so clicks pass through to image) */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 pointer-events-none">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white font-mono rounded text-xs font-medium border border-white/30">
                    {animal.tagNumber ? `#${animal.tagNumber}` : 'Sin arete'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border backdrop-blur-sm ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded font-medium border backdrop-blur-sm ${animal.sex === 'Macho' ? 'bg-blue-500/70 text-white border-blue-300/50' : 'bg-rose-500/70 text-white border-rose-300/50'}`}>
                    {animal.sex}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded font-medium border backdrop-blur-sm ${healthConfig.bgColor} ${healthConfig.color} ${healthConfig.borderColor}`}>
                    {healthConfig.label}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-white leading-tight drop-shadow-sm">
                  {animal.name || 'Sin nombre asignado'}
                </h1>
                <p className="text-sm text-white/75 mt-0.5">
                  {animal.breed}{animal.color ? ` · ${animal.color}` : ''}
                </p>
              </div>
            </div>
          ) : (
            /* ── No photo: compact info card ── */
            <div className="p-4">
              <button
                onClick={() => navigate('/producer/animales')}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver a Explorador
              </button>
              <div className="flex items-start gap-3">
                {/* Add photo placeholder */}
                <button
                  onClick={() => setShowPhotoModal(true)}
                  title="Agregar foto"
                  className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-0.5 hover:border-[#3FA79F] hover:bg-teal-50/50 transition-colors group"
                >
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-[#3FA79F] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[9px] text-gray-400 group-hover:text-[#3FA79F] transition-colors leading-none">Foto</span>
                </button>
                {/* Name + breed + pills */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold leading-tight mb-0.5" style={{ color: '#3FA79F' }}>
                    {animal.name || 'Sin nombre asignado'}
                  </h1>
                  <p className="text-sm text-gray-500 mb-2">
                    {animal.breed}{animal.color ? ` · ${animal.color}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {assigningTag ? (
                      <div className="flex flex-col gap-1">
                        {animal.tagNumber && (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            ⚠ Estás cambiando un arete ya asignado. El número de arete es un registro único — asegúrate de que el nuevo valor es correcto.
                          </p>
                        )}
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="text"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAssignTag(); if (e.key === 'Escape') { setAssigningTag(false); setTagInput(''); } }}
                            placeholder="Ej: A001"
                            className="w-24 px-2 py-0.5 text-xs border border-[#3FA79F] rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#3FA79F]"
                            disabled={savingTag}
                          />
                          <button
                            onClick={handleAssignTag}
                            disabled={savingTag || !tagInput.trim()}
                            className="px-2 py-0.5 bg-[#3FA79F] text-white text-xs rounded hover:bg-[#35918A] disabled:opacity-50 transition-colors"
                          >
                            {savingTag ? '...' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => { setAssigningTag(false); setTagInput(''); }}
                            className="px-1.5 py-0.5 text-gray-400 hover:text-gray-600 text-xs"
                          >✕</button>
                        </div>
                      </div>
                    ) : animal.tagNumber ? (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-700 font-mono rounded border border-gray-200 text-xs font-medium">
                          #{animal.tagNumber}
                        </span>
                        <button
                          onClick={() => { setTagInput(animal.tagNumber); setAssigningTag(true); }}
                          title="Editar arete"
                          className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningTag(true)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-medium hover:bg-amber-100 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Sin arete · Asignar
                      </button>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded font-medium border ${animal.sex === 'Macho' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      {animal.sex}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded font-medium border ${healthConfig.color} ${healthConfig.bgColor} ${healthConfig.borderColor}`}>
                      {healthConfig.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Quick Actions bar ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible flex divide-x divide-gray-100">

          {/* Registrar Evento */}
          <button
            onClick={() => isActive && setShowEventModal(true)}
            disabled={!isActive}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 transition-colors ${
              isActive ? 'hover:bg-teal-50/60 text-[#3FA79F]' : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium leading-none">Registrar evento</span>
          </button>

          {/* Editar datos */}
          <button
            onClick={() => setShowEditModal(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 hover:bg-gray-50 transition-colors text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-xs font-medium leading-none">Editar datos</span>
          </button>

          {/* Más opciones */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="w-full flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 hover:bg-gray-50 transition-colors text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <span className="text-xs font-medium leading-none">Más opciones</span>
            </button>

            {showActionMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActionMenu(false)} />
                <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {isActive && (
                    <button
                      onClick={handleQuickWeightRegistration}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                      Registrar Peso
                    </button>
                  )}
                  {isActive && (
                    <button
                      onClick={() => { setShowActionMenu(false); setShowHealthStatusModal(true); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Cambiar Estado de Salud
                    </button>
                  )}
                  <button
                    onClick={() => { setShowActionMenu(false); setShowPhotoModal(true); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Cambiar foto
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* General Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
            Información General
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Ubicación Actual</p>
              <p className="text-sm font-semibold text-gray-900">{animal.farmName || 'Sin finca'}</p>
              <p className="text-xs text-gray-600">{animal.divisionName || 'Sin división'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Nacimiento</p>
              <p className="text-sm font-semibold text-gray-900">
                {animal.birthDate
                  ? new Date(animal.birthDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Desconocida'}
              </p>
              <p className="text-xs text-gray-600">Edad: {age}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Peso Actual</p>
              <p className="text-sm font-semibold text-gray-900">
                {animal.currentWeight ? `${animal.currentWeight} kg` : 'Sin registro'}
              </p>
              <p className="text-xs text-gray-600">Último registrado</p>
            </div>
            {animal.sex !== 'Macho' && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Crías registradas</p>
                <p className="text-sm font-semibold text-gray-900">{animal.offspringCount ?? 0}</p>
                <p className="text-xs text-gray-600">
                  {animal.lastBirthDate
                    ? `Último: ${new Date(animal.lastBirthDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : 'Sin partos registrados'}
                </p>
              </div>
            )}
          </div>

          {/* Madre / Padre — visible para todos los planes */}
          {(animal.motherId || animal.motherRef || animal.fatherId || animal.fatherRef) && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Madre</p>
                {animal.motherId ? (
                  <button
                    onClick={() => navigate(`/producer/animales/${animal.motherId}`)}
                    className="text-sm font-semibold text-left hover:underline"
                    style={{ color: '#3FA79F' }}
                  >
                    #{animal.motherTagNumber}
                    {animal.motherName ? ` · ${animal.motherName}` : ''}
                  </button>
                ) : animal.motherRef ? (
                  <p className="text-sm font-semibold text-gray-900">{animal.motherRef}</p>
                ) : (
                  <p className="text-sm text-gray-400">No registrada</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Padre</p>
                {animal.fatherId ? (
                  <button
                    onClick={() => navigate(`/producer/animales/${animal.fatherId}`)}
                    className="text-sm font-semibold text-left hover:underline"
                    style={{ color: '#3FA79F' }}
                  >
                    #{animal.fatherTagNumber}
                    {animal.fatherName ? ` · ${animal.fatherName}` : ''}
                  </button>
                ) : animal.fatherRef ? (
                  <p className="text-sm font-semibold text-gray-900">{animal.fatherRef}</p>
                ) : (
                  <p className="text-sm text-gray-400">No registrado</p>
                )}
              </div>
            </div>
          )}

          {/* Hierro */}
          {animal.brandId && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
              {animal.brandPhotoUrl && (
                <img src={animal.brandPhotoUrl} alt={animal.brandName} className="w-10 h-10 object-contain rounded border border-gray-200 bg-gray-50 p-0.5" onError={e => { e.target.style.display = 'none'; }} />
              )}
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Hierro</p>
                <p className="text-sm font-semibold text-gray-900">{animal.brandName}</p>
                {animal.brandedAt && (
                  <p className="text-xs text-gray-500">
                    Marcado el {new Date(animal.brandedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Parto performance chart — hembras con al menos 1 parto */}
        {animal.sex !== 'Macho' && animal.offspringCount > 0 && (
          <PartoPerformanceChart rawEvents={rawEvents} />
        )}

        {/* Genealogy — navigate to dedicated page */}
        {(() => {
          const genealogyAllowed = canUseFeature('genealogy');
          return (
            <button
              onClick={() => navigate(`/producer/animales/${animalId}/genealogy`)}
              className={`w-full bg-white rounded-xl shadow-sm border px-4 py-3.5 flex items-center justify-between gap-4 transition-all group ${
                genealogyAllowed
                  ? 'border-gray-200 hover:bg-gray-50/50 hover:border-gray-300'
                  : 'border-gray-100 opacity-75 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  genealogyAllowed ? 'bg-gray-100 group-hover:bg-teal-50' : 'bg-gray-50'
                }`}>
                  {genealogyAllowed ? (
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-[#3FA79F] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold text-left ${genealogyAllowed ? 'text-gray-900' : 'text-gray-400'}`}>
                    Árbol genealógico
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 text-left">
                    {genealogyAllowed
                      ? ((animal.motherId || animal.motherRef) && (animal.fatherId || animal.fatherRef)
                          ? 'Ver pedigrí completo: padres, abuelos y crías'
                          : (animal.motherId || animal.motherRef || animal.fatherId || animal.fatherRef)
                          ? 'Ver árbol genealógico'
                          : 'Sin datos genealógicos registrados')
                      : 'Requiere plan Crecimiento o superior'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!genealogyAllowed && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: '#EDF7F5', color: '#2B8A82', border: '1px solid #B2DEDA' }}>
                    Plan Crecimiento
                  </span>
                )}
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })()}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column */}
          <div className="space-y-5">
            {/* Health Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Estado de Salud</h3>
                {isActive && (
                  <button onClick={() => setShowHealthStatusModal(true)}
                    className="text-xs font-medium hover:underline" style={{ color: '#3FA79F' }}>
                    Cambiar Estado
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-lg ${healthConfig.bgColor} border ${healthConfig.borderColor} flex items-center justify-center ${healthConfig.color}`}>
                  {healthConfig.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{healthConfig.label}</p>
                  <p className="text-xs text-gray-500">Estado actual del animal</p>
                </div>
              </div>
              <div className={`px-3 py-2 rounded-lg ${
                animal.healthStatus === 'Enfermo' || animal.healthStatus === 'Critico'
                  ? `${healthConfig.bgColor} border ${healthConfig.borderColor}`
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <p className="text-xs font-medium text-gray-700">
                  {animal.healthStatus === 'Enfermo' || animal.healthStatus === 'Critico'
                    ? 'Requiere atención veterinaria'
                    : 'Animal en buen estado'}
                </p>
              </div>
            </div>

            {/* Reproductive Status — only for females */}
            {animal.sex !== 'Macho' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                  Estado Reproductivo
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {animal.offspringCount > 0 ? `${animal.offspringCount} cría(s) registrada(s)` : 'Sin partos registrados'}
                      </p>
                      <p className="text-xs text-gray-500">Estado reproductivo actual</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500">Último parto</p>
                      <p className="text-gray-700">
                        {animal.lastBirthDate
                          ? new Date(animal.lastBirthDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'Sin registros'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total crías</p>
                      <p className="text-gray-700">{animal.offspringCount ?? 0} registradas</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Movement History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                Historial de Movimientos
              </h3>
              {animalMovements.length > 0 ? (
                <div className="space-y-2">
                  {animalMovements.slice(0, 5).map((movement, idx) => (
                    <div key={movement.id ?? idx} className="px-3 py-2 bg-gray-50 rounded border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <p className="text-xs font-medium text-gray-900">
                          {movement.fromFarmName
                            ? `${movement.fromFarmName} → ${movement.toFarmName}`
                            : movement.toFarmName || 'Sin finca origen'}
                        </p>
                      </div>
                      {movement.reason && (
                        <p className="text-xs text-gray-500 mb-0.5">{movement.reason}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(movement.movementDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-6">Sin movimientos registrados</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Services History */}
            {(() => {
              // Compute distinct types present
              const types = [...new Set(animalServices.map(s => s.serviceType))];
              // Last service per type (list is already sorted newest-first)
              const lastByType = {};
              animalServices.forEach(s => { if (!lastByType[s.serviceType]) lastByType[s.serviceType] = s; });
              const filtered = serviceTypeFilter
                ? animalServices.filter(s => s.serviceType === serviceTypeFilter)
                : animalServices;
              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                    Historial de Servicios
                  </h3>

                  {animalServices.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6">Sin servicios registrados</p>
                  ) : (
                    <>
                      {/* "Última vez" chips — only shown in "Todos" view */}
                      {!serviceTypeFilter && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Object.entries(lastByType).map(([type, svc]) => {
                            const label = SERVICE_TYPE_LABELS[type] || type;
                            const date  = svc.completedDate || svc.scheduledDate;
                            return (
                              <button
                                key={type}
                                onClick={() => setServiceTypeFilter(type)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-teal-400 hover:bg-teal-50 transition-all group"
                              >
                                <span className="text-xs font-semibold text-gray-700 group-hover:text-teal-800">{label}</span>
                                <span className="text-xs text-gray-400 group-hover:text-teal-600">{timeAgo(date)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Filter pills */}
                      {types.length > 1 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <button
                            onClick={() => setServiceTypeFilter('')}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                              !serviceTypeFilter
                                ? 'text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            style={!serviceTypeFilter ? { backgroundColor: '#3FA79F' } : {}}
                          >
                            Todos
                          </button>
                          {types.map(type => (
                            <button key={type}
                              onClick={() => setServiceTypeFilter(serviceTypeFilter === type ? '' : type)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                serviceTypeFilter === type
                                  ? 'text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              style={serviceTypeFilter === type ? { backgroundColor: '#3FA79F' } : {}}
                            >
                              {SERVICE_TYPE_LABELS[type] || type}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Filtered service list */}
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {filtered.map((svc, idx) => {
                          const label    = SERVICE_TYPE_LABELS[svc.serviceType] || svc.serviceType;
                          const date     = svc.completedDate || svc.scheduledDate;
                          const done     = svc.status === 'Completado';
                          return (
                            <div key={svc.id ?? idx} className="px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`flex-shrink-0 w-2 h-2 rounded-full ${done ? 'bg-teal-500' : 'bg-amber-400'}`} />
                                  <span className="text-xs font-semibold text-gray-900 truncate">{label}</span>
                                  {svc.notes && (
                                    <span className="text-xs text-gray-500 truncate hidden sm:block">— {svc.notes}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${done ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {done ? 'Completado' : 'Pendiente'}
                                  </span>
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                              {svc.notes && (
                                <p className="text-xs text-gray-500 mt-1 sm:hidden truncate">{svc.notes}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Events Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">
                Línea de Tiempo de Eventos
              </h3>
              {timelineEvents.length > 0 ? (
                <div className="space-y-2">
                  {timelineEvents.map((event, idx) => {
                    const resolved = resolveEventDisplay(event.eventType, event.description);
                    return (
                      <div key={event.eventId ?? idx}
                        className="flex gap-3 px-3 py-2 bg-gray-50 rounded border border-gray-100">
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center"
                          style={{ backgroundColor: resolved.badgeBg }}
                          title={resolved.label}
                        >
                          <EventIcon
                            iconType={resolved.iconType}
                            className="w-4 h-4"
                            style={{ color: resolved.badgeFg }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900">
                                {resolved.label}
                                {resolved.critical && (
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">crítico</span>
                                )}
                              </p>
                              {resolved.cleanDescription && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">{resolved.cleanDescription}</p>
                              )}
                              {event.cost != null && (
                                <p className="text-xs text-gray-400 mt-0.5">${Number(event.cost).toLocaleString()}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <p className="text-xs text-gray-400">
                                {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              {event.eventId && (
                                <button
                                  onClick={() => setSelectedEvent(event)}
                                  className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-[#3FA79F] hover:text-[#3FA79F] transition-colors"
                                >
                                  Ver
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-6">Sin eventos registrados</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event / Service Modal */}
      <EventModal
        isOpen={showEventModal}
        animalId={animal.id}
        animal={animal}
        eventTypePreset={eventTypePreset}
        existingEvents={rawEvents}
        onClose={() => {
          setShowEventModal(false);
          setEventTypePreset(null);
        }}
        onEventCreated={handleEventCreated}
        onPartoRegistered={handlePartoRegistered}
      />

      {/* Parto → new cría registration */}
      {showPartoAnimalModal && (
        <AnimalModal
          isOpen={showPartoAnimalModal}
          onClose={() => {
            setShowPartoAnimalModal(false);
            setPartoMotherAnimal(null);
          }}
          onAnimalCreated={handleCalfCreated}
          initialData={partoMotherAnimal ? {
            origin:         'Parto',
            motherId:       partoMotherAnimal.id,
            selectedMother: partoMotherAnimal,
            farmId:         partoMotherAnimal.farmId         ?? '',
            divisionId:     partoMotherAnimal.divisionId     ?? '',
          } : null}
        />
      )}

      {/* Peso registration via ServiceModal */}
      {showPesoModal && (
        <ServiceModal
          presetTipo="Pesaje"
          presetFarmId={animal.farmId ?? null}
          presetDivisionId={animal.divisionId ?? null}
          presetAnimalId={animal.id}
          onClose={() => setShowPesoModal(false)}
          onSuccess={() => {
            setShowPesoModal(false);
            fetchAnimalDetails();
            fetchAnimalTimeline();
          }}
        />
      )}

      {/* Health Status Modal */}
      {showHealthStatusModal && (
        <HealthStatusModal
          animal={animal}
          onClose={() => setShowHealthStatusModal(false)}
          onStatusChanged={() => {
            setShowHealthStatusModal(false);
            fetchAnimalDetails();
            fetchAnimalTimeline();
          }}
        />
      )}

      {/* Event Detail Panel */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          animalId={animal.id}
          onClose={() => setSelectedEvent(null)}
          onUpdated={() => {
            setSelectedEvent(null);
            fetchAnimalDetails();
            fetchAnimalTimeline();
            fetchRawEvents();
          }}
          onDeleted={() => {
            setSelectedEvent(null);
            fetchAnimalDetails();
            fetchAnimalTimeline();
            fetchRawEvents();
          }}
        />
      )}

      {/* Photo lightbox */}
      {showPhotoLightbox && animal.photoUrl && (
        <div
          className="fixed inset-0 bg-black/92 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPhotoLightbox(false)}
        >
          <div className="relative flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={animal.photoUrl}
              alt={animal.name || `#${animal.tagNumber}`}
              className="block max-w-[92vw] max-h-[80vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
            />
            {/* close */}
            <button
              onClick={() => setShowPhotoLightbox(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* change photo action */}
            <button
              onClick={() => { setShowPhotoLightbox(false); setShowPhotoModal(true); }}
              className="mt-3 py-2 px-5 bg-white/10 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Cambiar foto
            </button>
          </div>
        </div>
      )}

      {/* Photo update modal */}
      {showPhotoModal && (
        <PhotoUpdateModal
          animalId={animal.id}
          currentUrl={animal.photoUrl}
          onClose={() => setShowPhotoModal(false)}
          onUpdated={() => {
            setShowPhotoModal(false);
            fetchAnimalDetails();
          }}
        />
      )}

      {/* Edit animal data modal */}
      <EditAnimalModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        animal={animal}
        onSaved={() => {
          fetchAnimalDetails();
        }}
      />
    </ProducerLayout>
  );
}
