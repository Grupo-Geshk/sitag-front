import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { animalsAPI } from '../../api/animals';
import { animalEventsAPI } from '../../api/animalEvents';
import { farmsAPI } from '../../api/farms';
import { divisionsAPI } from '../../api/divisions';
import { getProducerId } from '../../lib/auth';
import { uploadToImgbb } from '../../lib/imgbb';
import Modal from '../common/Modal';
import BreedCombobox from './BreedCombobox';

// ── Weaning question helper ────────────────────────────────────────────────────
// Renders a yes/no toggle asking whether the animal is already weaned.
// Only appears for Compra and Otros origins (not Parto — newborns are never weaned).
function WeaningQuestion({ value, onChange }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-amber-800">¿El animal ya fue destetado?</p>
        <p className="text-xs text-amber-700 mt-1">
          Esta información determina si el evento de Destete estará disponible en el
          historial del animal. Si el animal ingresa ya destetado, el evento quedará
          registrado automáticamente.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
            value === true
              ? 'border-[#3FA79F] bg-teal-50 text-teal-800'
              : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          Sí, ya está destetado
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
            value === false
              ? 'border-[#3FA79F] bg-teal-50 text-teal-800'
              : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          No, aún no
        </button>
      </div>
    </div>
  );
}

// ── Inline photo upload field ──────────────────────────────────────────────────
// Handles file selection, local preview, ImgBB upload and passes the final URL up.
// The URL is stored in formData.photoUrl and sent with the animal on submit.
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

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

function PhotoUploadField({ value, onChange, disabled }) {
  const [file, setFile]             = useState(null);
  const [localUrl, setLocalUrl]     = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef(null);

  // Clean up object URL on unmount or when file changes
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  const applyFile = (f) => {
    setError(null);
    if (!f.type.startsWith('image/')) { setError('Solo se permiten imágenes (JPG, PNG, WEBP…).'); return; }
    if (f.size > MAX_PHOTO_BYTES)     { setError('La imagen no puede superar 10 MB.'); return; }
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

  const clearFile = () => {
    if (localUrl) URL.revokeObjectURL(localUrl);
    setFile(null);
    setLocalUrl(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadToImgbb(file);
      onChange(url);   // store URL in formData.photoUrl
      clearFile();     // clear local state — the preview will switch to "uploaded" view
    } catch (err) {
      setError(err.message || 'Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  // ── Uploaded state: show thumbnail + "Quitar" ─────────────────────────────
  if (value && !file) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
        <img
          src={value}
          alt="Foto del animal"
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-200"
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700">Foto cargada en ImgBB</p>
          <p className="text-xs text-gray-400 truncate">{value}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange('')}
          disabled={disabled}
          className="text-xs font-medium text-red-500 hover:text-red-600 flex-shrink-0 disabled:opacity-40 transition-colors"
        >
          Quitar
        </button>
      </div>
    );
  }

  // ── File selected: show preview + upload button ────────────────────────────
  if (file && localUrl) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
          <img src={localUrl} alt="Vista previa" className="w-full h-36 object-contain" />
          {!uploading && (
            <button
              type="button"
              onClick={clearFile}
              className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full shadow-sm flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || disabled}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
          style={{ backgroundColor: '#3FA79F' }}
        >
          {uploading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Subiendo a ImgBB…
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
    );
  }

  // ── Empty state: drag-and-drop zone + camera button ──────────────────────
  return (
    <>
      {showCamera && (
        <CameraOverlay
          onCapture={f => { setShowCamera(false); applyFile(f); }}
          onClose={() => setShowCamera(false)}
        />
      )}
      <div className="space-y-2">
        <div
          onDragOver={e => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-1.5 h-24 rounded-xl border-2 border-dashed transition-colors ${
            disabled
              ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
              : isDragging
                ? 'border-teal-400 bg-teal-50 cursor-copy'
                : 'border-gray-200 bg-gray-50 hover:border-teal-300 hover:bg-teal-50/40 cursor-pointer'
          }`}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-medium text-gray-600">Arrastra una imagen o haz clic</p>
          <p className="text-xs text-gray-400">JPG, PNG, WEBP · máx. 10 MB · opcional</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) applyFile(f); e.target.value = ''; }}
          />
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowCamera(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Tomar foto con cámara
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </>
  );
}

export default function AnimalModal({
  isOpen,
  onClose,
  onAnimalCreated,
  // Optional: pre-fill data passed from Parto workflow in EventModal
  initialData = null,
}) {
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [birthDateDisplay, setBirthDateDisplay] = useState('');
  const datePickerRef = useRef(null);
  // null = question not yet answered; true/false = user's response
  const [isWeaned, setIsWeaned] = useState(null);
  const [formData, setFormData] = useState({
    origin: '', // Parto, Compra, Otros
    tagNumber: '',
    name: '',
    sex: 'Hembra',
    breed: '',
    color: '',
    birthDate: '',
    birthWeight: '',
    farmId: '',
    divisionId: '',
    fatherId: '',
    motherId: '',
    motherRef: '',   // Free-text external mother (when not in system)
    fatherRef: '',   // Free-text external father (when not in system)
    photoUrl: '',    // IMGBB URL for current photo
    // Economy fields for Compra
    transactionAmount: '',
    transactionCategory: 'Ganado',
    transactionDescription: '',
  });

  // Genealogy search state
  const [availableAnimals, setAvailableAnimals] = useState([]);
  const [motherSearch, setMotherSearch] = useState('');
  const [fatherSearch, setFatherSearch] = useState('');
  const [selectedMother, setSelectedMother] = useState(null);
  const [selectedFather, setSelectedFather] = useState(null);
  const [showMotherDropdown, setShowMotherDropdown] = useState(false);
  const [showFatherDropdown, setShowFatherDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFarms();
    }
  }, [isOpen]);

  // Apply initialData (e.g. from Parto workflow) when modal opens
  useEffect(() => {
    if (!isOpen || !initialData) return;
    setFormData(prev => ({
      ...prev,
      ...(initialData.origin     ? { origin:     initialData.origin }     : {}),
      ...(initialData.motherId   ? { motherId:   initialData.motherId }   : {}),
      ...(initialData.farmId     ? { farmId:     initialData.farmId }     : {}),
      ...(initialData.divisionId ? { divisionId: initialData.divisionId } : {}),
    }));
    if (initialData.selectedMother) {
      setSelectedMother(initialData.selectedMother);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (formData.farmId) {
      fetchDivisions(formData.farmId);
    } else {
      setDivisions([]);
      setFormData(prev => ({ ...prev, divisionId: '' }));
    }
  }, [formData.farmId]);

  useEffect(() => {
    if (isOpen && formData.origin === 'Parto') {
      fetchAvailableAnimals();
    }
  }, [isOpen, formData.origin]);

  const fetchFarms = async () => {
    try {
      const producerId = getProducerId();
      const farmsData = await farmsAPI.getAllFarms(producerId);
      setFarms(farmsData);
    } catch (error) {
      console.error('Error fetching farms:', error);
      toast.error('Error al cargar las fincas');
    }
  };

  const fetchDivisions = async (farmId) => {
    try {
      const divisionsData = await divisionsAPI.getDivisionsByFarm(farmId);
      setDivisions(divisionsData);
    } catch (error) {
      console.error('Error fetching divisions:', error);
    }
  };

  const fetchAvailableAnimals = async () => {
    try {
      const producerId = getProducerId();
      const response = await animalsAPI.getAnimals({
        producerId,
        status: 'Activo',
        pageSize: 1000
      });
      setAvailableAnimals(response.items || []);
    } catch (error) {
      console.error('Error fetching animals:', error);
      toast.error('Error al cargar los animales disponibles');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'origin') {
      setIsWeaned(null); // reset weaning answer when origin changes
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Birth date handlers ────────────────────────────────────────────────────
  // Accepts DD/MM/AAAA typed by the user; syncs ISO value into formData.
  const handleBirthDateText = (e) => {
    const raw = e.target.value;
    setBirthDateDisplay(raw);
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      const iso = `${yyyy}-${mm}-${dd}`;
      const d = new Date(iso);
      if (!isNaN(d) && d <= new Date()) {
        setFormData(prev => ({ ...prev, birthDate: iso }));
      }
    } else if (raw === '') {
      setFormData(prev => ({ ...prev, birthDate: '' }));
    }
  };

  // Syncs calendar picker value back to the text display.
  const handleDatePickerChange = (e) => {
    const iso = e.target.value; // YYYY-MM-DD
    setFormData(prev => ({ ...prev, birthDate: iso }));
    if (iso) {
      const [yyyy, mm, dd] = iso.split('-');
      setBirthDateDisplay(`${dd}/${mm}/${yyyy}`);
    }
  };

  const handleMotherSelect = (animal) => {
    setSelectedMother(animal);
    setFormData(prev => ({ ...prev, motherId: animal.id }));
    setMotherSearch('');
    setShowMotherDropdown(false);
  };

  const handleFatherSelect = (animal) => {
    setSelectedFather(animal);
    setFormData(prev => ({ ...prev, fatherId: animal.id }));
    setFatherSearch('');
    setShowFatherDropdown(false);
  };

  const clearMother = () => {
    setSelectedMother(null);
    setFormData(prev => ({ ...prev, motherId: '' }));
    setMotherSearch('');
  };

  const clearFather = () => {
    setSelectedFather(null);
    setFormData(prev => ({ ...prev, fatherId: '' }));
    setFatherSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate origin is selected
      if (!formData.origin) {
        toast.error('Debe seleccionar el origen del animal');
        setLoading(false);
        return;
      }

      // Validate mother ID is provided for Parto
      if (formData.origin === 'Parto' && !formData.motherId) {
        toast.error('La madre es requerida para animales nacidos en la finca');
        setLoading(false);
        return;
      }

      // Validate transaction fields for Compra
      if (formData.origin === 'Compra') {
        if (!formData.transactionAmount || parseFloat(formData.transactionAmount) <= 0) {
          toast.error('El monto de compra es requerido y debe ser mayor a 0');
          setLoading(false);
          return;
        }
        if (!formData.transactionCategory) {
          toast.error('La categoría de la transacción es requerida');
          setLoading(false);
          return;
        }
      }

      let createdAnimal;

      // If origin is Compra, use atomic endpoint
      if (formData.origin === 'Compra') {
        const purchaseData = {
          tagNumber: formData.tagNumber,
          name: formData.name || null,
          sex: formData.sex,
          breed: formData.breed,
          color: formData.color?.trim() || null,
          birthDate: formData.birthDate || null,
          weight: formData.birthWeight ? parseFloat(formData.birthWeight) : null,
          farmId: formData.farmId,
          divisionId: formData.divisionId || null,
          purchasePrice: parseFloat(formData.transactionAmount),
          purchaseDate: new Date().toISOString(),
          categoryName: formData.transactionCategory || null,
        };

        createdAnimal = await animalsAPI.createAnimalWithPurchase(purchaseData);
        toast.success('¡Animal registrado exitosamente! Transacción económica creada.');
      } else {
        // For Parto or Otros, use regular endpoint
        const animalData = {
          tagNumber: formData.tagNumber,
          name: formData.name || null,
          sex: formData.sex,
          breed: formData.breed,
          color: formData.color?.trim() || null,
          birthDate: formData.birthDate || null,
          weight: formData.birthWeight ? parseFloat(formData.birthWeight) : null,
          farmId: formData.farmId,
          divisionId: formData.divisionId || null,
          // Genealogy — mother
          motherId:  formData.motherId  || null,
          motherRef: formData.motherRef?.trim() || null,
          // Genealogy — father (now persisted)
          fatherId:  formData.fatherId  || null,
          fatherRef: formData.fatherRef?.trim() || null,
          // Photo
          photoUrl:  formData.photoUrl?.trim()  || null,
          // Legacy alias for old backend fallback (same value as motherId)
          parentId:  formData.motherId  || null,
        };

        createdAnimal = await animalsAPI.createAnimal(animalData);
        toast.success('¡Animal registrado exitosamente!');
      }

      // If the user confirmed the animal is already weaned (Compra or Otros only),
      // create a Destete event so the option does not reappear in the event modal.
      const needsWeaningEvent = isWeaned === true
        && createdAnimal?.id
        && (formData.origin === 'Compra' || formData.origin === 'Otros');

      if (needsWeaningEvent) {
        await animalEventsAPI.createEvent({
          animalId:    createdAnimal.id,
          eventType:   'Otro',
          recordType:  'event',
          eventDate:   formData.birthDate
            ? new Date(formData.birthDate + 'T12:00:00').toISOString()
            : new Date().toISOString(),
          description: 'Destete | Animal registrado como ya destetado al ingresar al sistema',
        }).catch(err => console.warn('Destete event creation failed (non-fatal):', err));
      }

      onAnimalCreated();
      onClose();

      // Reset form
      setFormData({
        origin: '',
        tagNumber: '',
        name: '',
        sex: 'Hembra',
        breed: '',
        color: '',
        birthDate: '',
        birthWeight: '',
        farmId: '',
        divisionId: '',
        fatherId: '',
        motherId: '',
        motherRef: '',
        fatherRef: '',
        photoUrl: '',
        transactionAmount: '',
        transactionCategory: 'Ganado',
        transactionDescription: '',
      });
      setIsWeaned(null);
      setBirthDateDisplay('');

      // Reset genealogy search state
      setSelectedMother(null);
      setSelectedFather(null);
      setMotherSearch('');
      setFatherSearch('');
      setShowMotherDropdown(false);
      setShowFatherDropdown(false);
    } catch (error) {
      console.error('Create animal error:', error);
      const rawMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.[Object.keys(error.response?.data?.errors || {})[0]]?.[0] ||
        '';
      const isLimitError = rawMessage.toLowerCase().includes('límite de animales') || rawMessage.toLowerCase().includes('limite de animales');
      const errorMessage = isLimitError
        ? 'Has alcanzado el límite de animales activos de tu plan. Marca animales como vendidos o muertos para liberar cupo, o actualiza tu plan.'
        : rawMessage || 'Error al registrar el animal';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Nuevo Animal"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="animal-form"
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#3FA79F' }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#368D86')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3FA79F')}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registrando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar Animal
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="animal-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Origen del Animal */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Origen del Animal *</h3>
            <div className="space-y-4">
              <select
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                style={{ borderColor: '#E2E8F0' }}
                onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              >
                <option value="">Seleccione el origen del animal</option>
                <option value="Parto">Parto - Nacido en la finca</option>
                <option value="Compra">Compra - Adquirido externamente</option>
                <option value="Otros">Otros - Origen no especificado</option>
              </select>

              {/* Warning for Otros */}
              {formData.origin === 'Otros' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Advertencia</p>
                      <p>Al seleccionar "Otros" se reducirá la precisión del manejo genealógico y trazabilidad del animal. Se recomienda especificar si fue por Parto o Compra cuando sea posible.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info for Parto */}
              {formData.origin === 'Parto' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Nacido en la finca - Se requiere información de la madre</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info for Compra */}
              {formData.origin === 'Compra' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-green-800">
                      <p className="font-medium">Compra - Se requiere información de la transacción económica</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Weaning question for Compra and Otros */}
              {(formData.origin === 'Compra' || formData.origin === 'Otros') && (
                <WeaningQuestion value={isWeaned} onChange={setIsWeaned} />
              )}
            </div>
          </div>

          {/* Información Básica */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tag Number */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Número de Arete / Chapeta
                  <span className="ml-1.5 text-xs font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="tagNumber"
                  value={formData.tagNumber}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Ej: A001, BOV-123 — o dejar vacío"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 font-mono"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
                <p className="text-xs text-gray-400">Puedes asignar el arete más adelante desde el perfil del animal.</p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Ej: Bessie, Blacky"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              {/* Sex */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Sexo *
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                >
                  <option value="Hembra">Hembra</option>
                  <option value="Macho">Macho</option>
                </select>
              </div>

              {/* Breed */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Raza *
                </label>
                <BreedCombobox
                  value={formData.breed}
                  onChange={(val) => setFormData(prev => ({ ...prev, breed: val }))}
                  required
                  disabled={loading}
                  inputClass="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-all disabled:opacity-50 pr-8 text-sm"
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Color / Pelaje
                </label>
                <input
                  type="text"
                  placeholder="Ej: Negro, Pinto, Colorado, Blanco..."
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  disabled={loading}
                  maxLength={100}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#3FA79F] transition-all disabled:opacity-50 text-sm"
                />
              </div>

              {/* Birth Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <label className="block text-sm font-medium text-gray-800">
                    Fecha de Nacimiento *
                  </label>
                  {/* Format tooltip */}
                  <div className="relative group">
                    <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                      Escribe en formato DD/MM/AAAA
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                    </div>
                  </div>
                </div>

                <div className="relative flex items-center">
                  {/* Text input */}
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={birthDateDisplay}
                    onChange={handleBirthDateText}
                    required
                    disabled={loading}
                    maxLength={10}
                    className="w-full px-4 py-2.5 pr-10 bg-white border rounded-lg focus:outline-none transition-all disabled:opacity-50 text-sm"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />

                  {/* Calendar icon button */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => datePickerRef.current?.showPicker()}
                    className="absolute right-3 text-gray-400 hover:text-[#3FA79F] transition-colors disabled:opacity-50"
                    tabIndex={-1}
                    aria-label="Abrir calendario"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {/* Hidden date picker */}
                  <input
                    ref={datePickerRef}
                    type="date"
                    value={formData.birthDate}
                    onChange={handleDatePickerChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="absolute inset-0 opacity-0 pointer-events-none w-full"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Birth Weight */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Peso al Nacer (kg) *
                </label>
                <input
                  type="number"
                  name="birthWeight"
                  value={formData.birthWeight}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  min="0"
                  step="0.1"
                  placeholder="Ej: 35.5"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Farm */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  Finca *
                </label>
                <select
                  name="farmId"
                  value={formData.farmId}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                >
                  <option value="">Seleccione una finca</option>
                  {farms.map(farm => (
                    <option key={farm.id} value={farm.id}>{farm.name}</option>
                  ))}
                </select>
              </div>

              {/* Division */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">
                  División (opcional)
                </label>
                <select
                  name="divisionId"
                  value={formData.divisionId}
                  onChange={handleChange}
                  disabled={loading || !formData.farmId || divisions.length === 0}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                >
                  <option value="">Sin división asignada</option>
                  {divisions.map(division => (
                    <option key={division.id} value={division.id}>{division.name}</option>
                  ))}
                </select>
                {formData.farmId && divisions.length === 0 && (
                  <p className="text-xs text-gray-500">Esta finca no tiene divisiones creadas</p>
                )}
              </div>
            </div>
          </div>

          {/* Genealogía - Only for Parto */}
          {formData.origin === 'Parto' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Genealogía</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mother Search - Required for Parto */}
                <div className="space-y-2 relative">
                  <label className="block text-sm font-medium text-gray-800">
                    Buscar Madre *
                  </label>
                  {selectedMother ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-2.5 bg-teal-50 border border-teal-300 rounded-lg">
                        <div className="text-sm font-medium text-teal-900">
                          {selectedMother.tagNumber} - {selectedMother.name || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-teal-700">
                          {farms.find(f => f.id === selectedMother.farmId)?.name || 'Sin finca'}
                          {selectedMother.divisionId && divisions.find(d => d.id === selectedMother.divisionId)
                            ? ` / ${divisions.find(d => d.id === selectedMother.divisionId).name}`
                            : ' / Sin división'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearMother}
                        disabled={loading}
                        className="px-3 py-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={motherSearch}
                        onChange={(e) => {
                          setMotherSearch(e.target.value);
                          setShowMotherDropdown(true);
                        }}
                        disabled={loading}
                        placeholder="Buscar por número o nombre..."
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                        style={{ borderColor: '#E2E8F0' }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3FA79F';
                          setShowMotherDropdown(true);
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#E2E8F0';
                          setTimeout(() => setShowMotherDropdown(false), 200);
                        }}
                      />
                      {showMotherDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {availableAnimals
                            .filter(animal =>
                              animal.sex === 'Hembra' &&
                              (motherSearch === '' ||
                               animal.tagNumber.toLowerCase().includes(motherSearch.toLowerCase()) ||
                               animal.name?.toLowerCase().includes(motherSearch.toLowerCase()))
                            )
                            .map(animal => {
                              const farm = farms.find(f => f.id === animal.farmId);
                              const division = animal.divisionId ? divisions.find(d => d.id === animal.divisionId) : null;
                              return (
                                <button
                                  key={animal.id}
                                  type="button"
                                  onClick={() => handleMotherSelect(animal)}
                                  className="w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900">
                                    {animal.tagNumber} - {animal.name || 'Sin nombre'}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {farm?.name || 'Sin finca'}{division ? ` / ${division.name}` : ' / Sin división'}
                                  </div>
                                </button>
                              );
                            })}
                          {availableAnimals.filter(animal =>
                            animal.sex === 'Hembra' &&
                            (motherSearch === '' ||
                             animal.tagNumber.toLowerCase().includes(motherSearch.toLowerCase()) ||
                             animal.name?.toLowerCase().includes(motherSearch.toLowerCase()))
                          ).length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No se encontraron hembras que coincidan
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Father Search - Optional for Parto */}
                <div className="space-y-2 relative">
                  <label className="block text-sm font-medium text-gray-800">
                    Buscar Padre (opcional)
                  </label>
                  {selectedFather ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-2.5 bg-teal-50 border border-teal-300 rounded-lg">
                        <div className="text-sm font-medium text-teal-900">
                          {selectedFather.tagNumber} - {selectedFather.name || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-teal-700">
                          {farms.find(f => f.id === selectedFather.farmId)?.name || 'Sin finca'}
                          {selectedFather.divisionId && divisions.find(d => d.id === selectedFather.divisionId)
                            ? ` / ${divisions.find(d => d.id === selectedFather.divisionId).name}`
                            : ' / Sin división'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearFather}
                        disabled={loading}
                        className="px-3 py-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={fatherSearch}
                        onChange={(e) => {
                          setFatherSearch(e.target.value);
                          setShowFatherDropdown(true);
                        }}
                        disabled={loading}
                        placeholder="Buscar por número o nombre..."
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                        style={{ borderColor: '#E2E8F0' }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3FA79F';
                          setShowFatherDropdown(true);
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#E2E8F0';
                          setTimeout(() => setShowFatherDropdown(false), 200);
                        }}
                      />
                      {showFatherDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {availableAnimals
                            .filter(animal =>
                              animal.sex === 'Macho' &&
                              (fatherSearch === '' ||
                               animal.tagNumber.toLowerCase().includes(fatherSearch.toLowerCase()) ||
                               animal.name?.toLowerCase().includes(fatherSearch.toLowerCase()))
                            )
                            .map(animal => {
                              const farm = farms.find(f => f.id === animal.farmId);
                              const division = animal.divisionId ? divisions.find(d => d.id === animal.divisionId) : null;
                              return (
                                <button
                                  key={animal.id}
                                  type="button"
                                  onClick={() => handleFatherSelect(animal)}
                                  className="w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900">
                                    {animal.tagNumber} - {animal.name || 'Sin nombre'}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {farm?.name || 'Sin finca'}{division ? ` / ${division.name}` : ' / Sin división'}
                                  </div>
                                </button>
                              );
                            })}
                          {availableAnimals.filter(animal =>
                            animal.sex === 'Macho' &&
                            (fatherSearch === '' ||
                             animal.tagNumber.toLowerCase().includes(fatherSearch.toLowerCase()) ||
                             animal.name?.toLowerCase().includes(fatherSearch.toLowerCase()))
                          ).length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No se encontraron machos que coincidan
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* External parent references — shown when no in-system parent is selected */}
              {formData.origin === 'Parto' && !selectedMother && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-800">
                    Referencia de madre externa (opcional)
                  </label>
                  <input
                    type="text"
                    name="motherRef"
                    value={formData.motherRef}
                    onChange={handleChange}
                    disabled={loading}
                    maxLength={200}
                    placeholder="Ej: BOV-EXT-99, Brahman adquirida externamente"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none transition-all disabled:opacity-50 text-sm"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                  <p className="text-xs text-gray-400">Usa este campo cuando la madre no está registrada en el sistema.</p>
                </div>
              )}
              {formData.origin === 'Parto' && !selectedFather && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-800">
                    Referencia de padre externo (opcional)
                  </label>
                  <input
                    type="text"
                    name="fatherRef"
                    value={formData.fatherRef}
                    onChange={handleChange}
                    disabled={loading}
                    maxLength={200}
                    placeholder="Ej: Toro Brahman arrendado de Finca X"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none transition-all disabled:opacity-50 text-sm"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                  <p className="text-xs text-gray-400">Usa este campo cuando el padre no está registrado en el sistema.</p>
                </div>
              )}
            </div>
          )}

          {/* Photo — optional, shown for all origins */}
          {formData.origin && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Foto del Animal</h3>
              <PhotoUploadField
                value={formData.photoUrl}
                onChange={(url) => setFormData(prev => ({ ...prev, photoUrl: url }))}
                disabled={loading}
              />
            </div>
          )}

          {/* Economy Transaction - Only for Compra */}
          {formData.origin === 'Compra' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transacción Económica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-800">
                    Monto de Compra (Bs) *
                  </label>
                  <input
                    type="number"
                    name="transactionAmount"
                    value={formData.transactionAmount}
                    onChange={handleChange}
                    required={formData.origin === 'Compra'}
                    disabled={loading}
                    min="0"
                    step="0.01"
                    placeholder="Ej: 15000"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-800">
                    Categoría *
                  </label>
                  <select
                    name="transactionCategory"
                    value={formData.transactionCategory}
                    onChange={handleChange}
                    required={formData.origin === 'Compra'}
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  >
                    <option value="Ganado">Ganado</option>
                    <option value="Compra de Animales">Compra de Animales</option>
                    <option value="Inversión">Inversión</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-800">
                    Descripción de la Transacción (opcional)
                  </label>
                  <textarea
                    name="transactionDescription"
                    value={formData.transactionDescription}
                    onChange={handleChange}
                    disabled={loading}
                    rows="3"
                    placeholder="Detalles adicionales sobre la compra..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:opacity-50 resize-none"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3FA79F')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          {formData.origin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Información Importante</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>El número de arete debe ser único para cada animal</li>
                    <li>Asegúrate de seleccionar la finca correcta antes de guardar</li>
                    {formData.origin === 'Parto' && (
                      <li>La madre es requerida para animales nacidos en la finca</li>
                    )}
                    {formData.origin === 'Compra' && (
                      <li>Se creará automáticamente un registro de egreso en economía</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </form>
    </Modal>
  );
}
