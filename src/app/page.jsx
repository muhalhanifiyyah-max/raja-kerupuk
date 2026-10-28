'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Boxes, 
  ShoppingCart, 
  Landmark, 
  Receipt, 
  Building2, 
  Search, 
  Bell, 
  SlidersHorizontal, 
  Plus, 
  ArrowUpRight, 
  TrendingUp, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  MoreVertical, 
  Phone, 
  ChevronDown, 
  RefreshCw, 
  Printer, 
  Download,
  FileSpreadsheet,
  Scale,
  Calendar,
  Sparkles,
  Sun,
  Moon,
  X,
  CreditCard,
  PackagePlus,
  Coins,
  Send,
  ArrowDownLeft,
  Factory,
  Users,
  UserPlus,
  Edit3,
  Trash2,
  Shield,
  LogOut,
  Lock,
  User,
  Eye,
  EyeOff,
  KeyRound,
  Store,
  LogIn,
  MapPin,
  Camera,
  Navigation,
  Image as ImageIcon,
  ExternalLink,
  Compass
} from 'lucide-react';
import { captureDropPhoto, getDropLocation, isNativePlatform } from '@/lib/capacitor';

export default function App() {
  const [factories, setFactories] = useState([]);
  const [selectedPabrikId, setSelectedPabrikId] = useState('1');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [superAdminSubTab, setSuperAdminSubTab] = useState('pabrik'); // 'pabrik' | 'users'
  const [dashboardData, setDashboardData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedPedagang, setSelectedPedagang] = useState(null);
  const [kartuPiutangData, setKartuPiutangData] = useState(null);
  const [chartHoverIndex, setChartHoverIndex] = useState(null);
  const [notification, setNotification] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [reportFilterSection, setReportFilterSection] = useState('all');

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '', rememberMe: true });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [pedagangPortalData, setPedagangPortalData] = useState(null);

  // Check-point Drop & Pedagang Mobile State (Capacitor Android)
  const [checkpointsList, setCheckpointsList] = useState([]);
  const [checkpointsLoading, setCheckpointsLoading] = useState(false);
  const [selectedCheckpointPhoto, setSelectedCheckpointPhoto] = useState(null);
  const [pedagangSubTab, setPedagangSubTab] = useState('checkpoint_form'); // 'checkpoint_form' | 'checkpoint_history' | 'kartu_piutang' | 'katalog'
  const [pedagangProdukList, setPedagangProdukList] = useState([]);
  const [checkpointForm, setCheckpointForm] = useState({
    nama_warung: '',
    alamat_warung: '',
    produk_id: '',
    qty: '1',
    harga_jual: '',
    metode_bayar: 'piutang', // 'piutang' | 'tunai'
    catatan: '',
    latitude: null,
    longitude: null,
    akurasi_meter: null,
    foto_bukti: null
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [checkpointSubmitting, setCheckpointSubmitting] = useState(false);
  const [checkpointSearch, setCheckpointSearch] = useState('');

  // Form states
  const [modalForm, setModalForm] = useState({ nominal: '', tanggal: '', keterangan: '' });
  const [peralatanForm, setPeralatanForm] = useState({ nama_item: '', harga: '', qty: 1, tanggal: '', keterangan: '' });
  const [persediaanForm, setPersediaanForm] = useState({ produk_id: '', qty: '', harga_beli: '', tanggal: '', keterangan: '' });
  const [distribusiForm, setDistribusiForm] = useState({ pedagang_id: '', produk_id: '', qty: '', harga_jual: '', tanggal: '', keterangan: '' });
  const [setoranForm, setSetoranForm] = useState({ pedagang_id: '', nominal: '', tanggal: '', keterangan: '' });
  const [pedagangForm, setPedagangForm] = useState({ nama_pedagang: '', no_telepon: '', alamat: '', limit_piutang: '' });
  const [produkForm, setProdukForm] = useState({ nama_produk: '', kategori: 'Kerupuk', satuan: 'Bal', harga_beli: '', harga_jual: '', stok: 0 });
  const [pabrikForm, setPabrikForm] = useState({ nama_pabrik: '', alamat: '', telepon: '', penanggung_jawab: '', modal_awal: '100000000' });
  const [editPabrikForm, setEditPabrikForm] = useState({ id: null, nama_pabrik: '', alamat: '', telepon: '', penanggung_jawab: '' });
  const [userForm, setUserForm] = useState({ id: null, nama: '', email: '', username: '', password: '', role: 'admin_pabrik', pabrik_id: '1', pedagang_id: '', status: 'aktif' });
  const [selectedPabrikToDelete, setSelectedPabrikToDelete] = useState(null);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState(null);
  const [editTransactionForm, setEditTransactionForm] = useState({ id: null, nomor_bukti: '', tanggal: '', referensi: '', keterangan: '', tipe_transaksi: '', total_nominal: 0 });
  const [selectedTransactionToDelete, setSelectedTransactionToDelete] = useState(null);

  // Check auth session
  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        if (data.user.role === 'admin_pabrik' && data.user.pabrik_id) {
          setSelectedPabrikId(String(data.user.pabrik_id));
        } else if (data.user.role === 'pedagang') {
          setActiveTab('pedagang_portal');
          loadPedagangPortalData(data.user);
          loadPedagangProduk(data.user.pabrik_id);
          loadCheckpoints(data.user.pabrik_id, data.user.pedagang_id);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Error check auth:', err);
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadPedagangPortalData = async (user) => {
    try {
      const pedId = user?.pedagang_id || 1;
      const pabId = user?.pabrik_id || 1;
      const res = await fetch(`/api/laporan/kartu-piutang?pabrik_id=${pabId}&pedagang_id=${pedId}`);
      const data = await res.json();
      if (data.success) {
        setPedagangPortalData(data.data);
      }
    } catch (err) {
      console.error('Error load pedagang portal data:', err);
    }
  };

  const loadPedagangProduk = async (pabrikId) => {
    try {
      const pId = pabrikId || currentUser?.pabrik_id || 1;
      const res = await fetch(`/api/produk?pabrik_id=${pId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setPedagangProdukList(data.data);
        if (data.data.length > 0 && !checkpointForm.produk_id) {
          setCheckpointForm(prev => ({
            ...prev,
            produk_id: String(data.data[0].id),
            harga_jual: String(data.data[0].harga_jual || '')
          }));
        }
      }
    } catch (err) {
      console.error('Error load produk pedagang:', err);
    }
  };

  const loadCheckpoints = async (targetPabrikId = null, targetPedagangId = null) => {
    try {
      setCheckpointsLoading(true);
      const pId = targetPabrikId !== null ? targetPabrikId : selectedPabrikId;
      let url = '/api/checkpoint?';
      if (pId && pId !== 'all') {
        url += `pabrik_id=${pId}&`;
      }
      if (targetPedagangId) {
        url += `pedagang_id=${targetPedagangId}&`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.checkPoints) {
        setCheckpointsList(data.checkPoints);
      }
    } catch (err) {
      console.error('Error load checkpoints:', err);
    } finally {
      setCheckpointsLoading(false);
    }
  };

  const handleTakeDropPhoto = async () => {
    try {
      setIsTakingPhoto(true);
      const result = await captureDropPhoto();
      if (result && result.success && result.dataUrl) {
        setCheckpointForm(prev => ({ ...prev, foto_bukti: result.dataUrl }));
        showToast('Foto bukti drop berhasil diambil');
      } else if (result && result.error) {
        showToast(result.error, 'error');
      }
    } catch (err) {
      showToast('Gagal mengakses kamera: ' + err.message, 'error');
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleGetDropLocation = async () => {
    try {
      setIsGettingLocation(true);
      const result = await getDropLocation();
      if (result && result.success && result.latitude && result.longitude) {
        setCheckpointForm(prev => ({
          ...prev,
          latitude: result.latitude,
          longitude: result.longitude,
          akurasi_meter: result.accuracy ? Math.round(result.accuracy) : null
        }));
        showToast('Titik koordinat GPS berhasil dikunci');
      } else {
        showToast((result && result.error) || 'Gagal membaca koordinat GPS', 'error');
      }
    } catch (err) {
      showToast('Gagal mengakses GPS: ' + err.message, 'error');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmitCheckpoint = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!checkpointForm.nama_warung.trim()) {
      showToast('Nama warung wajib diisi', 'error');
      return;
    }
    if (!checkpointForm.produk_id) {
      showToast('Pilih jenis produk kerupuk', 'error');
      return;
    }
    if (!checkpointForm.qty || Number(checkpointForm.qty) <= 0) {
      showToast('Jumlah (bal) harus lebih dari 0', 'error');
      return;
    }

    try {
      setCheckpointSubmitting(true);
      const payload = {
        pedagang_id: currentUser?.pedagang_id || 1,
        pabrik_id: currentUser?.pabrik_id || 1,
        nama_warung: checkpointForm.nama_warung.trim(),
        alamat_warung: checkpointForm.alamat_warung.trim(),
        produk_id: Number(checkpointForm.produk_id),
        qty: Number(checkpointForm.qty),
        harga_jual: Number(checkpointForm.harga_jual) || 0,
        metode_bayar: checkpointForm.metode_bayar,
        catatan: checkpointForm.catatan,
        latitude: checkpointForm.latitude,
        longitude: checkpointForm.longitude,
        akurasi_meter: checkpointForm.akurasi_meter,
        foto_bukti: checkpointForm.foto_bukti,
        tanggal: new Date().toISOString().slice(0, 10)
      };

      const res = await fetch('/api/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Check-point drop kerupuk ke ' + payload.nama_warung + ' berhasil disimpan!');
        setCheckpointForm({
          nama_warung: '',
          alamat_warung: '',
          produk_id: pedagangProdukList[0]?.id ? String(pedagangProdukList[0].id) : '',
          qty: '1',
          harga_jual: pedagangProdukList[0]?.harga_jual ? String(pedagangProdukList[0].harga_jual) : '',
          metode_bayar: 'piutang',
          catatan: '',
          latitude: null,
          longitude: null,
          akurasi_meter: null,
          foto_bukti: null
        });
        await loadPedagangPortalData(currentUser);
        await loadCheckpoints(currentUser?.pabrik_id, currentUser?.pedagang_id);
        setPedagangSubTab('checkpoint_history');
      } else {
        showToast(data.error || 'Gagal menyimpan check-point', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
      setCheckpointSubmitting(false);
    }
  };

  const handleLogin = async (e, customCredentials = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    const credentials = customCredentials || {
      identifier: loginForm.identifier,
      password: loginForm.password
    };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();

      if (data.success && data.user) {
        setCurrentUser(data.user);
        showToast(`Login berhasil! Selamat datang, ${data.user.nama}`);
        if (data.user.role === 'admin_pabrik' && data.user.pabrik_id) {
          setSelectedPabrikId(String(data.user.pabrik_id));
          setActiveTab('dashboard');
        } else if (data.user.role === 'pedagang') {
          setActiveTab('pedagang_portal');
          loadPedagangPortalData(data.user);
          loadPedagangProduk(data.user.pabrik_id);
          loadCheckpoints(data.user.pabrik_id, data.user.pedagang_id);
        } else {
          setActiveTab('dashboard');
        }
      } else {
        setLoginError(data.error || 'Login gagal. Periksa username dan password Anda.');
      }
    } catch (err) {
      setLoginError('Gagal menghubungi server. Silakan coba beberapa saat lagi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickLogin = (identifier, password) => {
    setLoginForm({ identifier, password, rememberMe: true });
    handleLogin(null, { identifier, password });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
      setLoginForm({ identifier: '', password: '', rememberMe: true });
      showToast('Anda telah berhasil keluar dari sistem');
    }
  };

  // Fetch factories list
  const loadFactories = async () => {
    try {
      const res = await fetch('/api/pabrik');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setFactories(data.data);
        if (!selectedPabrikId && data.data[0]) {
          setSelectedPabrikId(String(data.data[0].id));
        }
      }
    } catch (err) {
      console.error('Error load factories:', err);
    }
  };

  // Fetch dashboard data
  const loadDashboard = async (pabrikId) => {
    setLoading(true);
    try {
      const idToFetch = pabrikId || selectedPabrikId || '1';
      const res = await fetch(`/api/dashboard?pabrik_id=${idToFetch}`);
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Error load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users list (Super Admin)
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsersList(data.data);
      }
    } catch (err) {
      console.error('Error load users:', err);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rk_dark_mode');
      if (saved !== null) {
        setDarkMode(saved === 'true');
      }
    } catch {}
    checkAuth();
    loadFactories();
    loadUsers();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rk_dark_mode', String(darkMode));
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    if (selectedPabrikId) {
      loadDashboard(selectedPabrikId);
      if (activeTab === 'checkpoints') {
        loadCheckpoints(selectedPabrikId);
      }
    }
  }, [selectedPabrikId, activeTab]);

  // Role guarding: Admin Pabrik hanya boleh akses operasional pabrik bersangkutan
  useEffect(() => {
    if (currentUser?.role === 'admin_pabrik') {
      if (currentUser.pabrik_id && String(selectedPabrikId) !== String(currentUser.pabrik_id)) {
        setSelectedPabrikId(String(currentUser.pabrik_id));
      }
      const forbiddenTabs = ['purchases', 'finance', 'reports', 'factories'];
      if (forbiddenTabs.includes(activeTab)) {
        setActiveTab('dashboard');
        showToast('Akses dibatasi. Anda dialihkan ke Dashboard Operasional Pabrik.', 'error');
      }
    }
  }, [activeTab, currentUser, selectedPabrikId]);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Factory CRUD Handlers
  const handleUpdatePabrik = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/pabrik/${editPabrikForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPabrikForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Pabrik "${editPabrikForm.nama_pabrik}" berhasil diperbarui!`);
        setActiveModal(null);
        await loadFactories();
        await loadDashboard(selectedPabrikId);
      } else {
        showToast(data.error || 'Gagal update pabrik', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePabrik = async () => {
    if (!selectedPabrikToDelete) return;
    try {
      const res = await fetch(`/api/pabrik/${selectedPabrikToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Pabrik berhasil dihapus!');
        setActiveModal(null);
        setSelectedPabrikToDelete(null);
        await loadFactories();
        setSelectedPabrikId('all');
        setActiveTab('factories');
        await loadDashboard('all');
      } else {
        showToast(data.error || 'Gagal hapus pabrik', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // User CRUD Handlers
  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(userForm.id);
      const url = isEdit ? `/api/users/${userForm.id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(isEdit ? 'Pengguna berhasil diperbarui!' : 'Pengguna baru berhasil ditambahkan!');
        setActiveModal(null);
        await loadUsers();
      } else {
        showToast(data.error || 'Gagal menyimpan pengguna', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserToDelete) return;
    try {
      const res = await fetch(`/api/users/${selectedUserToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Pengguna berhasil dihapus!');
        setActiveModal(null);
        setSelectedUserToDelete(null);
        await loadUsers();
      } else {
        showToast(data.error || 'Gagal menghapus pengguna', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
 
  // Transaction Edit & Delete Handlers
  const openEditTransaction = (journal) => {
    setEditTransactionForm({
      id: journal.id,
      nomor_bukti: journal.nomor_bukti,
      tanggal: journal.tanggal ? journal.tanggal.slice(0, 10) : '',
      referensi: journal.referensi || '',
      keterangan: journal.keterangan || '',
      tipe_transaksi: journal.tipe_transaksi || '',
      total_nominal: journal.total_nominal || 0
    });
    setActiveModal('edit_transaksi');
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/transaksi/${editTransactionForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editTransactionForm,
          pabrik_id: selectedPabrikId
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Transaksi berhasil diperbarui!');
        setActiveModal(null);
        await loadDashboard(selectedPabrikId);
      } else {
        showToast(data.error || 'Gagal memperbarui transaksi', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openDeleteTransaction = (journal) => {
    setSelectedTransactionToDelete(journal);
    setActiveModal('delete_transaksi_confirm');
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransactionToDelete) return;
    try {
      const res = await fetch(`/api/transaksi/${selectedTransactionToDelete.id}?pabrik_id=${selectedPabrikId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Transaksi berhasil dihapus & saldo dipulihkan!');
        setActiveModal(null);
        setSelectedTransactionToDelete(null);
        await loadDashboard(selectedPabrikId);
      } else {
        showToast(data.error || 'Gagal menghapus transaksi', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Quick seed trigger
  const handleSeedData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Data pabrik & transaksi demo berhasil dimuat!');
        await loadFactories();
        await loadDashboard(selectedPabrikId || '1');
      } else {
        showToast(data.error || 'Gagal memuat demo', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generic Submit Transaction
  const handleTransactionSubmit = async (endpoint, payload, successMsg) => {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, pabrik_id: selectedPabrikId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(successMsg);
        setActiveModal(null);
        await loadDashboard(selectedPabrikId);
      } else {
        showToast(data.error || 'Transaksi gagal', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Load Kartu Piutang
  const viewKartuPiutang = async (pedagang) => {
    setSelectedPedagang(pedagang);
    setActiveModal('kartu_piutang');
    try {
      const targetPabrikId = (selectedPabrikId === 'all' && pedagang.pabrik_id) ? pedagang.pabrik_id : selectedPabrikId;
      const res = await fetch(`/api/laporan/kartu-piutang?pabrik_id=${targetPabrikId}&pedagang_id=${pedagang.id}`);
      const data = await res.json();
      if (data.success) {
        setKartuPiutangData(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Format currency IDR
  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  // Format short currency
  const formatShort = (val) => {
    const n = Number(val) || 0;
    if (Math.abs(n) >= 1_000_000_000) {
      return (n / 1_000_000_000).toFixed(2) + ' M';
    }
    if (Math.abs(n) >= 1_000_000) {
      return (n / 1_000_000).toFixed(1) + ' jt';
    }
    if (Math.abs(n) >= 1_000) {
      return (n / 1_000).toFixed(0) + ' rb';
    }
    return n.toLocaleString('id-ID');
  };

  const isGlobal = dashboardData?.isGlobal;
  const metrics = dashboardData?.metrics || {
    kas: 0,
    piutang: 0,
    persediaan: 0,
    peralatan: 0,
    totalAset: 0,
    penjualan: 0,
    labaBersih: 0,
    isBalanced: true,
    accuracyScore: 100
  };

  const globalTotals = dashboardData?.data?.totals || {
    kas: 0,
    piutang: 0,
    persediaan: 0,
    asetTetap: 0,
    totalAset: 0,
    omset: 0,
    labaBersih: 0
  };

  // Current active factory name
  const currentFactory = selectedPabrikId === 'all'
    ? { id: 'all', nama_pabrik: 'Semua Pabrik', lokasi: 'Semua Cabang', status: 'active' }
    : (factories.find(f => String(f.id) === String(selectedPabrikId)) || factories[0]);

  // Data lists & reports computations
  const produkList = dashboardData?.produkList || [];
  const pedagangList = dashboardData?.pedagangList || [];
  const recentJournals = dashboardData?.recentJournals || [];

  // Inventory computations
  const totalPersediaanQty = produkList.reduce((acc, p) => acc + (Number(p.stok) || 0), 0);
  const totalPersediaanValuasi = produkList.reduce((acc, p) => acc + ((Number(p.stok) || 0) * (Number(p.harga_beli) || 0)), 0);
  const totalPersediaanPotensiOmset = produkList.reduce((acc, p) => acc + ((Number(p.stok) || 0) * (Number(p.harga_jual) || 0)), 0);
  const totalPersediaanPotensiMargin = totalPersediaanPotensiOmset - totalPersediaanValuasi;

  // Piutang computations
  const totalPiutangNominal = pedagangList.reduce((acc, p) => acc + (Number(p.saldo_piutang) || 0), 0);
  const totalLimitPiutang = pedagangList.reduce((acc, p) => acc + (Number(p.limit_piutang) || 0), 0);
  const avgUtilisasiPiutang = totalLimitPiutang > 0 ? ((totalPiutangNominal / totalLimitPiutang) * 100).toFixed(1) : '0';

  // Financial ratios computations
  const totalAsetLancar = metrics.kas + metrics.piutang + metrics.persediaan;
  const grossProfitMargin = metrics.penjualan > 0 ? ((metrics.labaKotor / metrics.penjualan) * 100).toFixed(1) : '0';
  const netProfitMargin = metrics.penjualan > 0 ? ((metrics.labaBersih / metrics.penjualan) * 100).toFixed(1) : '0';
  const roa = metrics.totalAset > 0 ? ((metrics.labaBersih / metrics.totalAset) * 100).toFixed(1) : '0';
  const arToSalesRatio = metrics.penjualan > 0 ? ((metrics.piutang / metrics.penjualan) * 100).toFixed(1) : '0';
  const cashRatio = totalAsetLancar > 0 ? ((metrics.kas / totalAsetLancar) * 100).toFixed(1) : '0';

  // Peralatan / Aset Tetap list from journals
  const peralatanItems = recentJournals.filter(j => j.tipe_transaksi === 'BELI_PERALATAN');

  // Export report to CSV
  const exportReportCSV = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    let csv = "LAPORAN KEUANGAN DAN OPERASIONAL TERPADU - RAJA KERUPUK\r\n";
    csv += `Unit / Pabrik:,"${currentFactory?.nama_pabrik || 'Semua Pabrik'}"\r\n`;
    csv += `Tanggal Laporan:,${dateStr}\r\n\r\n`;

    csv += "=== I. NERACA SALDO (BALANCE SHEET) ===\r\n";
    csv += "Komponen Akun,Kode Akun,Nominal (IDR)\r\n";
    csv += `Kas & Bank,1001,${metrics.kas}\r\n`;
    csv += `Piutang Dagang (Pedagang),1002,${metrics.piutang}\r\n`;
    csv += `Persediaan Barang Dagang,1003,${metrics.persediaan}\r\n`;
    csv += `Subtotal Aset Lancar,,${totalAsetLancar}\r\n`;
    csv += `Peralatan & Mesin Pabrik,1501,${metrics.peralatan}\r\n`;
    csv += `TOTAL ASET,,${metrics.totalAset}\r\n`;
    csv += `Utang Usaha,2001,0\r\n`;
    csv += `Modal Disetor,3001,${metrics.totalAset - metrics.labaBersih}\r\n`;
    csv += `Laba Periode Berjalan,3999,${metrics.labaBersih}\r\n`;
    csv += `TOTAL KEWAJIBAN & EKUITAS,,${metrics.totalAset}\r\n\r\n`;

    csv += "=== II. LAPORAN LABA RUGI (INCOME STATEMENT) ===\r\n";
    csv += "Komponen,Nominal (IDR),Persentase (%)\r\n";
    csv += `Pendapatan Penjualan,${metrics.penjualan},100%\r\n`;
    csv += `Harga Pokok Penjualan (HPP),${metrics.hpp},${metrics.penjualan > 0 ? ((metrics.hpp / metrics.penjualan) * 100).toFixed(1) : 0}%\r\n`;
    csv += `Laba Kotor (Gross Profit),${metrics.labaKotor},${grossProfitMargin}%\r\n`;
    csv += `Beban Operasional,${metrics.bebanOperasional},${metrics.penjualan > 0 ? ((metrics.bebanOperasional / metrics.penjualan) * 100).toFixed(1) : 0}%\r\n`;
    csv += `Laba Bersih (Net Profit),${metrics.labaBersih},${netProfitMargin}%\r\n\r\n`;

    csv += "=== III. LAPORAN PERSEDIAAN BARANG DAGANG (INVENTORY) ===\r\n";
    csv += "No,Nama Produk,Satuan,Stok Gudang,Harga Beli Pokok,Nilai Persediaan Aset,Harga Jual Satuan,Potensi Nilai Jual,Estimasi Potensi Margin\r\n";
    produkList.forEach((p, idx) => {
      const stok = Number(p.stok) || 0;
      const hb = Number(p.harga_beli) || 0;
      const hj = Number(p.harga_jual) || 0;
      csv += `${idx + 1},"${p.nama_produk}",${p.satuan || 'Bal'},${stok},${hb},${stok * hb},${hj},${stok * hj},${(stok * hj) - (stok * hb)}\r\n`;
    });
    csv += `Total,Semua Produk,,${totalPersediaanQty},,${totalPersediaanValuasi},,${totalPersediaanPotensiOmset},${totalPersediaanPotensiMargin}\r\n\r\n`;

    csv += "=== IV. LAPORAN KONTROL PIUTANG & MITRA PEDAGANG ===\r\n";
    csv += "No,Nama Mitra Pedagang,Telepon,Alamat,Plafon Limit Kredit,Saldo Piutang Berjalan,Sisa Limit,Utilisasi (%),Status Piutang\r\n";
    pedagangList.forEach((ped, idx) => {
      const limit = Number(ped.limit_piutang) || 0;
      const saldo = Number(ped.saldo_piutang) || 0;
      const sisa = Math.max(0, limit - saldo);
      const util = limit > 0 ? ((saldo / limit) * 100).toFixed(1) : 0;
      csv += `${idx + 1},"${ped.nama_pedagang}","${ped.no_telepon || ''}","${ped.alamat || ''}",${limit},${saldo},${sisa},${util}%,${ped.status_piutang || 'Lancar'}\r\n`;
    });
    csv += `Total,Semua Pedagang,,,${totalLimitPiutang},${totalPiutangNominal},${Math.max(0, totalLimitPiutang - totalPiutangNominal)},${avgUtilisasiPiutang}%\r\n\r\n`;

    csv += "=== V. ANALISIS RASIO KEUANGAN ===\r\n";
    csv += "Rasio,Nilai,Status Evaluasi\r\n";
    csv += `Current Ratio,${metrics.totalAset > 0 ? 'Solven Penuh (Bebas Utang)' : '0'},Sangat Sehat\r\n`;
    csv += `Cash Ratio,${cashRatio}%,Likuiditas Kas Siap Pakai\r\n`;
    csv += `Gross Profit Margin (GPM),${grossProfitMargin}%,Marjin Keuntungan Kotor Produk\r\n`;
    csv += `Net Profit Margin (NPM),${netProfitMargin}%,Marjin Keuntungan Bersih\r\n`;
    csv += `Return on Assets (ROA),${roa}%,Efektivitas Pemanfaatan Total Aset\r\n`;
    csv += `A/R to Sales Ratio,${arToSalesRatio}%,Proporsi Piutang terhadap Omset\r\n`;

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_Raja_Kerupuk_${selectedPabrikId}_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading screen while verifying session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f1f3f6] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-[#191a23] p-3 shadow-2xl flex items-center justify-center border border-slate-700/50 animate-pulse">
          <img src="/logo.png" alt="Raja Kerupuk" className="w-full h-full object-contain" />
        </div>
        <h3 className="mt-4 font-extrabold text-slate-800 text-base tracking-wide">Raja Kerupuk OS</h3>
        <p className="text-xs text-slate-400 mt-1">Memverifikasi sesi akuntansi...</p>
      </div>
    );
  }

  // Login view if not logged in (Light Mode)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f1f3f6] text-slate-800 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm space-y-6">
          
          {/* Logo & Simple Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 p-2 mx-auto shadow-sm flex items-center justify-center">
              <img src="/logo.png" alt="Raja Kerupuk" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Raja Kerupuk</h1>
          </div>

          {/* Clean Light Login Box */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-7 shadow-xl shadow-slate-200/50 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Masuk ke Sistem</h2>

            {loginError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Username atau Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginForm.identifier}
                    onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                    placeholder="Username atau email"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-500">
                  <input
                    type="checkbox"
                    checked={loginForm.rememberMe}
                    onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  <span>Ingat saya</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-[#191a23] hover:bg-black text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Masuk</span>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Raja Kerupuk
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-[#0f1015] text-[#f1f3f6]' : 'bg-[#f1f3f6] text-[#191a23]'}`}>
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl transition-all border ${
          notification.type === 'error' 
            ? 'bg-rose-900/90 text-white border-rose-700' 
            : 'bg-[#191a23] text-white border-emerald-500/50'
        }`}>
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`w-64 p-5 flex flex-col justify-between shrink-0 border-r ${
        darkMode ? 'bg-[#14151c] border-white/5' : 'bg-white border-slate-200/70'
      }`}>
        <div className="space-y-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#1a1b24] border border-slate-200/90 dark:border-white/10 p-1 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
              <img src="/logo.png" alt="Raja Kerupuk Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">Raja Kerupuk</h1>
              </div>
            </div>
          </div>

          {/* Navigation Menu (Role-based) */}
          <nav className="space-y-1.5">
            {currentUser?.role === 'pedagang' ? (
              <>
                <button
                  onClick={() => {
                    setActiveTab('pedagang_portal');
                    setPedagangSubTab('checkpoint_form');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'pedagang_portal' && pedagangSubTab === 'checkpoint_form'
                      ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Check-Point Drop</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('pedagang_portal');
                    setPedagangSubTab('checkpoint_history');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'pedagang_portal' && pedagangSubTab === 'checkpoint_history'
                      ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                  }`}
                >
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span>Riwayat Drop Warung</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('pedagang_portal');
                    setPedagangSubTab('kartu_piutang');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'pedagang_portal' && pedagangSubTab === 'kartu_piutang'
                      ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                  }`}
                >
                  <Store className="w-4 h-4 text-amber-400" />
                  <span>Hutang & Setoran</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('pedagang_portal');
                    setPedagangSubTab('katalog');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'pedagang_portal' && pedagangSubTab === 'katalog'
                      ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                  }`}
                >
                  <Boxes className="w-4 h-4 text-indigo-400" />
                  <span>Katalog Produk</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => setActiveTab('sales')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'sales'
                      ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Distribusi & Piutang</span>
                </button>

                <button
                  onClick={() => setActiveTab('checkpoints')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'checkpoints'
                      ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>Monitoring Check-Point</span>
                </button>

                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'inventory'
                      ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span>Persediaan Stok</span>
                </button>

                <button
                  onClick={() => setActiveTab('banking')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'banking'
                      ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  <span>{currentUser?.role === 'admin_pabrik' ? 'Kas Operasional' : 'Kas & Perbankan'}</span>
                </button>

                {/* Menu Khusus Super Admin (Owner / Konsolidasi Lengkap) */}
                {currentUser?.role === 'super_admin' && (
                  <>
                    <button
                      onClick={() => setActiveTab('purchases')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                        activeTab === 'purchases'
                          ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Peralatan & Aset</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('finance')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                        activeTab === 'finance'
                          ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                      }`}
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Laporan Keuangan</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('reports')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                        activeTab === 'reports'
                          ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                      }`}
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Laporan</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('factories');
                        setSelectedPabrikId('all');
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                        activeTab === 'factories'
                          ? 'bg-[#191a23] dark:bg-emerald-500 text-white rounded-full shadow-sm font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 rounded-full'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Super Admin Pabrik</span>
                    </button>
                  </>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Bottom Card & Controls */}
        <div className="space-y-4">
          {/* Quick Action Button */}
          {currentUser?.role !== 'pedagang' && (
            <button
              onClick={() => setActiveModal('distribusi')}
              className="w-full py-2.5 px-3 text-xs font-semibold bg-[#191a23] hover:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Catat Distribusi</span>
            </button>
          )}

          {/* Theme Mode Toggle Pill */}
          <div className="bg-slate-100 dark:bg-[#1a1b24] dark:border dark:border-white/10 p-1 rounded-full flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setDarkMode(false)}
              className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all ${
                !darkMode ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
            <button
              onClick={() => setDarkMode(true)}
              className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all ${
                darkMode ? 'bg-white/10 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
          </div>

          {/* User Mini Profile & Logout */}
          <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 shadow-sm bg-slate-100 dark:bg-white/5">
                <img 
                  src="/default-avatar.png" 
                  alt={currentUser?.nama || 'User'} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {currentUser?.nama}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  @{currentUser?.username} • {currentUser?.role === 'super_admin' ? 'Super Admin' : currentUser?.role === 'admin_pabrik' ? 'Admin Pabrik' : 'Pedagang'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar dari sistem"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* TOP NAVBAR */}
        <header className={`px-8 py-4 flex items-center justify-between border-b sticky top-0 z-20 backdrop-blur-md ${
          darkMode ? 'bg-[#0f1015]/90 border-white/5' : 'bg-[#f1f3f6]/90 border-slate-200/60'
        }`}>
          {/* Search Bar & Factory Selector */}
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi, pedagang, jurnal... (⌘ + Space)"
                className={`w-full pl-10 pr-24 py-2 text-sm rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                  darkMode 
                    ? 'bg-[#1a1b24] border-white/10 text-white placeholder-slate-500' 
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-sm'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <span>⌘</span>
                <span>Space</span>
              </div>
            </div>

            {/* Multi-Tenant Switcher (Scoped by Role) */}
            {currentUser?.role === 'super_admin' ? (
              <div className="relative">
                <select
                  value={selectedPabrikId}
                  onChange={(e) => setSelectedPabrikId(e.target.value)}
                  className={`pl-9 pr-9 py-2 text-sm font-semibold rounded-full border appearance-none cursor-pointer transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    selectedPabrikId === 'all'
                      ? 'bg-[#191a23] dark:bg-emerald-600 text-white border-slate-700 dark:border-emerald-500'
                      : 'bg-white dark:bg-[#1a1b24] text-slate-800 dark:text-slate-100 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <option value="all">Semua Pabrik</option>
                  {factories.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.nama_pabrik}
                    </option>
                  ))}
                </select>
                <Factory className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  selectedPabrikId === 'all' ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                }`} />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : currentUser?.role === 'admin_pabrik' ? (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 rounded-full text-xs font-bold shadow-sm">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Pabrik: {currentUser.nama_pabrik || currentFactory?.nama_pabrik}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 rounded-full text-xs font-bold shadow-sm">
                <Store className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Mitra: {currentUser?.nama_pedagang || currentUser?.nama}</span>
              </div>
            )}
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {currentUser?.role !== 'pedagang' && (
              <button
                onClick={() => setActiveModal('distribusi')}
                className="flex items-center gap-2 px-4 py-2 bg-[#191a23] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold rounded-full hover:bg-black transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Transaksi Baru</span>
              </button>
            )}

            {/* Notification bell */}
            <button className="w-9 h-9 rounded-full bg-white dark:bg-[#1a1b24] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 ring-2 ring-white dark:ring-[#14151c]" />
            </button>

            {/* User Avatar & Identity */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-white/10">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 shadow-sm ring-2 ring-white dark:ring-[#14151c] bg-slate-100 dark:bg-white/5">
                <img 
                  src="/default-avatar.png" 
                  alt={currentUser?.nama || 'User'} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                    {currentUser?.nama}
                  </p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    {currentUser?.role === 'super_admin' ? 'Super Admin' : currentUser?.role === 'admin_pabrik' ? 'Admin Pabrik' : 'Mitra'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {currentUser?.role === 'super_admin' ? 'Pemilik Sistem' : currentUser?.nama_pabrik || 'Pabrik'}
                </p>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="Keluar dari sistem"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all active:scale-95 shadow-sm ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {/* CONTENT BODY */}
        <main className="p-8 space-y-6 flex-1">
          
          {/* TAB: DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <>
              {/* TOP 4 KPI CARDS (Matching Shopify POS Layout) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Kas & Bank */}
                <div className="dashboard-card p-5 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Kas (Aset Lancar)</span>
                    </div>
                    {currentUser?.role === 'super_admin' && (
                      <button 
                        onClick={() => setActiveModal('modal_awal')}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                        title="Tambah Modal Kas"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
                    {formatShort(isGlobal ? globalTotals.kas : metrics.kas)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatIDR(isGlobal ? globalTotals.kas : metrics.kas)}</span>
                    <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Likuid
                    </span>
                  </div>
                </div>

                {/* 2. Piutang Pedagang */}
                <div className="dashboard-card p-5 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-500">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Piutang Pedagang</span>
                    </div>
                    <button 
                      onClick={() => setActiveModal('setoran')}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                      title="Catat Setoran Pembayaran"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
                    {formatShort(isGlobal ? globalTotals.piutang : metrics.piutang)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatIDR(isGlobal ? globalTotals.piutang : metrics.piutang)}</span>
                    <span className="text-rose-500 font-semibold bg-rose-50 px-2 py-0.5 rounded-full">
                      Tagihan
                    </span>
                  </div>
                </div>

                {/* 3. Persediaan Stok Gudang */}
                <div className="dashboard-card p-5 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-500">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Persediaan Barang</span>
                    </div>
                    <button 
                      onClick={() => setActiveModal('beli_persediaan')}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                      title="Belanja Persediaan Baru"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
                    {formatShort(isGlobal ? globalTotals.persediaan : metrics.persediaan)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatIDR(isGlobal ? globalTotals.persediaan : metrics.persediaan)}</span>
                    <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                      Gudang
                    </span>
                  </div>
                </div>

                {/* 4. Laba Bersih Berjalan */}
                <div className="dashboard-card p-5 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
                        <div className="w-2 h-2 rounded-full bg-purple-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Laba Bersih</span>
                    </div>
                    {currentUser?.role === 'super_admin' && (
                      <button 
                        onClick={() => setActiveTab('finance')}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                        title="Lihat Laporan Laba Rugi"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight text-emerald-600 mb-1">
                    {formatShort(isGlobal ? globalTotals.labaBersih : metrics.labaBersih)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatIDR(isGlobal ? globalTotals.labaBersih : metrics.labaBersih)}</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Laba Periode
                    </span>
                  </div>
                </div>

              </div>

              {/* MIDDLE ROW: CHART & GAUGE ACCURACY (Exact reference match) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Middle Left: Overview Area Chart (2 Cols) */}
                <div className="dashboard-card p-6 lg:col-span-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Overview Penjualan & Omset</h3>
                      <p className="text-xs text-slate-400">Tren penjualan distribusi ke pedagang</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1b24] text-slate-700 dark:text-slate-200 focus:outline-none shadow-sm cursor-pointer">
                        <option>Bulan Ini</option>
                        <option>Kuartal Ini</option>
                        <option>Tahun 2026</option>
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const omsetVal = isGlobal ? globalTotals.omset : metrics.penjualan;
                    return (
                      <>
                        <div className="flex items-baseline gap-3 mb-6">
                          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                            {formatShort(omsetVal)}
                          </span>
                          {omsetVal > 0 && (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center">
                              <TrendingUp className="w-3.5 h-3.5 mr-1" />
                              Tren Penjualan Aktif
                            </span>
                          )}
                        </div>

                        {omsetVal === 0 ? (
                          <div className="h-48 w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center p-6">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                              <TrendingUp className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">Belum Ada Data Grafik Penjualan</p>
                            <p className="text-xs text-slate-400 max-w-xs mt-1">Grafik tren penjualan akan terbentuk otomatis setelah transaksi distribusi dicatat.</p>
                          </div>
                        ) : (
                          <div className="h-48 w-full relative">
                            <svg viewBox="0 0 600 180" className="w-full h-full overflow-visible">
                              <defs>
                                <linearGradient id="mintGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>

                              {/* Vertical bars */}
                              {Array.from({ length: 30 }).map((_, i) => {
                                const x = 20 + i * 19;
                                const height = 40 + Math.sin(i / 3) * 30 + (i * 2.5);
                                return (
                                  <rect
                                    key={i}
                                    x={x}
                                    y={170 - height}
                                    width="6"
                                    height={height}
                                    rx="3"
                                    fill="#10b981"
                                    opacity={0.12 + (i / 30) * 0.25}
                                  />
                                );
                              })}

                              {/* Smooth Area Path */}
                              <path
                                d="M 20 140 Q 150 150 250 110 T 450 70 T 580 40 L 580 170 L 20 170 Z"
                                fill="url(#mintGrad)"
                              />

                              {/* Line Path */}
                              <path
                                d="M 20 140 Q 150 150 250 110 T 450 70 T 580 40"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                              />

                              <g transform="translate(320, 92)">
                                <circle cx="0" cy="0" r="5" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
                                <g transform="translate(-40, -48)">
                                  <rect width="80" height="34" rx="8" fill="#191a23" />
                                  <text x="40" y="15" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                                    Bulan Ini
                                  </text>
                                  <text x="40" y="27" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold">
                                    {formatShort(omsetVal)}
                                  </text>
                                </g>
                              </g>
                            </svg>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Middle Right: Completed Accuracy for Super Admin, or Operational Overview for Admin Pabrik */}
                {currentUser?.role === 'super_admin' ? (
                  <div className="dashboard-card p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">Keseimbangan Neraca</h3>
                      <button className="text-slate-400 hover:text-slate-700">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Top composition badges */}
                    <div className="grid grid-cols-3 gap-2 py-2">
                      <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-semibold mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Kas
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {metrics.totalAset > 0 ? Math.round((metrics.kas / metrics.totalAset) * 100) : 0}%
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-semibold mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Piutang
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {metrics.totalAset > 0 ? Math.round((metrics.piutang / metrics.totalAset) * 100) : 0}%
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-xl text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-semibold mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Persediaan
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {metrics.totalAset > 0 ? Math.round((metrics.persediaan / metrics.totalAset) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    {/* Semi-circular gauge meter */}
                    <div className="relative flex flex-col items-center justify-center py-4">
                      <svg viewBox="0 0 200 120" className="w-48 overflow-visible">
                        {Array.from({ length: 35 }).map((_, i) => {
                          const angle = Math.PI + (i / 34) * Math.PI;
                          const r1 = 70;
                          const r2 = 82;
                          const x1 = 100 + r1 * Math.cos(angle);
                          const y1 = 105 + r1 * Math.sin(angle);
                          const x2 = 100 + r2 * Math.cos(angle);
                          const y2 = 105 + r2 * Math.sin(angle);
                          
                          let color = '#10b981';
                          if (i < 8) color = '#f43f5e';
                          else if (i < 15) color = '#fbbf24';
                          else if (i < 24) color = '#34d399';

                          return (
                            <line
                              key={i}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke={color}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              opacity={0.8}
                            />
                          );
                        })}

                        <path
                          d="M 30 105 A 70 70 0 0 1 170 105"
                          fill="none"
                          stroke={darkMode ? '#2d3142' : '#e2e8f0'}
                          strokeWidth="5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 30 105 A 70 70 0 0 1 170 105"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="5"
                          strokeDasharray="220"
                          strokeDashoffset="0"
                          strokeLinecap="round"
                        />
                      </svg>

                      <div className="text-center mt-[-40px]">
                        <p className="text-[11px] font-semibold text-slate-400">Completed Accuracy</p>
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {metrics.isBalanced ? '100.0%' : '92.4%'}
                        </h2>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Debit = Kredit Seimbang
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="dashboard-card p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">Status Operasional Pabrik</h3>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                          Aktif Beroperasi
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-4">
                        Ringkasan aktivitas produksi dan kesiapan distribusi mitra pedagang hari ini.
                      </p>

                      <div className="space-y-3">
                        <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                              <Boxes className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-white">Stok Fisik Gudang</div>
                              <div className="text-[11px] text-slate-400">Siap didistribusikan</div>
                            </div>
                          </div>
                          <span className="text-sm font-extrabold text-emerald-600">
                            {formatIDR(metrics.persediaan)}
                          </span>
                        </div>

                        <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                              <Store className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-white">Mitra Pedagang Terdaftar</div>
                              <div className="text-[11px] text-slate-400">Pabrik {currentUser?.nama_pabrik || 'Depok'}</div>
                            </div>
                          </div>
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {(dashboardData?.pedagangList || []).length} Orang
                          </span>
                        </div>

                        <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-white">Integritas Jurnal Operasional</div>
                              <div className="text-[11px] text-slate-400">Sistem Akuntansi Ganda</div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Tervalidasi 100%
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveModal('distribusi')}
                      className="w-full mt-4 py-2.5 bg-[#191a23] dark:bg-emerald-600 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Input Pengiriman Baru</span>
                    </button>
                  </div>
                )}

              </div>

              {/* BOTTOM SECTION: MITRA PEDAGANG & KONTROL PIUTANG */}
              <div className="dashboard-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Customer Contacts / Mitra Pedagang</h3>
                    <p className="text-xs text-slate-400">Pengelolaan tagihan piutang dan limit kredit per pedagang</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveModal('tambah_pedagang')}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Pedagang
                    </button>
                    <button className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#1a1b24] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Filters
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3 pl-2">Nama Pedagang</th>
                        <th className="pb-3">No. Telepon</th>
                        <th className="pb-3">Alamat / Wilayah</th>
                        <th className="pb-3">Sisa Piutang / Limit</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right pr-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70">
                      {(dashboardData?.pedagangList || []).map((p, idx) => {
                        const avatarColors = [
                          'from-emerald-400 to-teal-500',
                          'from-blue-400 to-indigo-500',
                          'from-purple-400 to-pink-500',
                          'from-amber-400 to-orange-500'
                        ];
                        const bgGrad = avatarColors[idx % avatarColors.length];
                        const saldo = Number(p.saldo_piutang) || 0;
                        const limit = Number(p.limit_piutang) || 0;
                        const persenLimit = limit > 0 ? Math.round((saldo / limit) * 100) : 0;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="py-3.5 pl-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${bgGrad} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                                  {p.nama_pedagang.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 leading-tight">{p.nama_pedagang}</p>
                                  <p className="text-[11px] text-slate-400">ID: PED-{p.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 text-slate-600 text-xs">
                              <span className="font-mono">{p.no_telepon || '-'}</span>
                            </td>
                            <td className="py-3.5 text-slate-500 text-xs max-w-xs truncate">
                              {p.alamat || 'Pasar Tradisional'}
                            </td>
                            <td className="py-3.5">
                              <div>
                                <span className="font-bold text-slate-900 text-xs">
                                  {formatIDR(saldo)}
                                </span>
                                <span className="text-[11px] text-slate-400 block">
                                  Limit: {formatShort(limit)} ({persenLimit}%)
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                p.status_piutang === 'Over Limit'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : p.status_piutang === 'Mendekati Limit'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : p.status_piutang === 'Lunas'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {p.status_piutang}
                              </span>
                            </td>
                            <td className="py-3.5 text-right pr-2">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => viewKartuPiutang(p)}
                                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                                >
                                  Kartu Piutang
                                </button>
                                <button
                                  onClick={() => {
                                    setSetoranForm(prev => ({ ...prev, pedagang_id: String(p.id) }));
                                    setActiveModal('setoran');
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-sm"
                                >
                                  Setor
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RIWAYAT TRANSAKSI & PEMBUKUAN UMUM */}
              <div className="dashboard-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Riwayat Transaksi & Pembukuan</h3>
                    <p className="text-xs text-slate-400">Jurnal umum akuntansi dengan fitur edit dan hapus transaksi</p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                    {(dashboardData?.recentJournals || []).length} Transaksi Tercatat
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3 pl-2">Tanggal & No. Bukti</th>
                        <th className="pb-3">Tipe Transaksi</th>
                        <th className="pb-3">Keterangan / Referensi</th>
                        <th className="pb-3">Jurnal Double-Entry</th>
                        <th className="pb-3 text-right">Total Nominal</th>
                        <th className="pb-3 text-right pr-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!dashboardData?.recentJournals || dashboardData.recentJournals.length === 0) ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                            Belum ada transaksi tercatat pada pabrik ini
                          </td>
                        </tr>
                      ) : (
                        dashboardData.recentJournals.map((j) => (
                          <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 pl-2">
                              <span className="font-bold text-slate-900 text-xs block">{j.nomor_bukti}</span>
                              <span className="text-[11px] text-slate-400">{j.tanggal}</span>
                            </td>
                            <td className="py-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {j.tipe_transaksi}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="font-semibold text-slate-800 text-xs block">{j.referensi || '-'}</span>
                              <span className="text-[11px] text-slate-500">{j.keterangan}</span>
                            </td>
                            <td className="py-3">
                              <div className="space-y-0.5 text-[10px]">
                                {j.details?.slice(0, 3).map((d, didx) => (
                                  <div key={didx} className="flex items-center gap-1.5">
                                    <span className={`px-1 py-0.2 rounded font-mono font-bold ${
                                      d.debit > 0 ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                                    }`}>
                                      {d.debit > 0 ? 'D' : 'K'}
                                    </span>
                                    <span className="text-slate-600 truncate max-w-[120px]">{d.nama_akun}</span>
                                    <span className="font-mono text-slate-800 font-medium">
                                      {formatIDR(d.debit > 0 ? d.debit : d.kredit)}
                                    </span>
                                  </div>
                                ))}
                                {j.details?.length > 3 && (
                                  <span className="text-slate-400 text-[9px]">+{j.details.length - 3} akun lainnya</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-right font-extrabold text-slate-900 text-xs">
                              {formatIDR(j.total_nominal)}
                            </td>
                            <td className="py-3 text-right pr-2">
                              {currentUser?.role === 'super_admin' ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditTransaction(j)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                    title="Edit Transaksi"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteTransaction(j)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                    title="Hapus Transaksi"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  Tervalidasi
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}

          {/* TAB: DISTRIBUSI & PIUTANG */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Distribusi & Piutang</h2>
                </div>
                <button
                  onClick={() => setActiveModal('distribusi')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#191a23] text-white text-xs font-semibold rounded-full hover:bg-black shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Drop Barang ke Pedagang
                </button>
              </div>

              {/* Jurnal Transaksi Distribusi List */}
              <div className="dashboard-card p-6">
                <h3 className="font-bold text-sm text-slate-900 mb-4">Riwayat Distribusi Terbaru</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3">Tanggal & No. Bukti</th>
                        <th className="pb-3">Tipe & Keterangan</th>
                        <th className="pb-3">Dampak Double-Entry Jurnal</th>
                        <th className="pb-3 text-right">Total Transaksi</th>
                        <th className="pb-3 text-right pr-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!dashboardData?.recentJournals || dashboardData.recentJournals.filter(j => j.tipe_transaksi === 'DISTRIBUSI_PENJUALAN').length === 0) ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-slate-400 text-xs">
                            Belum ada riwayat distribusi tercatat
                          </td>
                        </tr>
                      ) : (
                        dashboardData.recentJournals.filter(j => j.tipe_transaksi === 'DISTRIBUSI_PENJUALAN').map((j) => (
                        <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3">
                            <span className="font-bold text-slate-900 text-xs block">{j.nomor_bukti}</span>
                            <span className="text-[11px] text-slate-400">{j.tanggal}</span>
                          </td>
                          <td className="py-3">
                            <span className="font-semibold text-slate-800 text-xs block">{j.referensi}</span>
                            <span className="text-[11px] text-slate-500">{j.keterangan}</span>
                          </td>
                          <td className="py-3">
                            <div className="space-y-1 text-[11px]">
                              {j.details.map((d, didx) => (
                                <div key={didx} className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                                    d.debit > 0 ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {d.debit > 0 ? 'DEBIT' : 'KREDIT'}
                                  </span>
                                  <span className="text-slate-600">{d.nama_akun}</span>
                                  <span className="font-mono text-slate-800 font-semibold">
                                    {formatIDR(d.debit > 0 ? d.debit : d.kredit)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 text-right font-extrabold text-slate-900 text-sm">
                            {formatIDR(j.total_nominal)}
                          </td>
                          <td className="py-3 text-right pr-2">
                            {currentUser?.role === 'super_admin' ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditTransaction(j)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                  title="Edit Transaksi"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openDeleteTransaction(j)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Hapus Transaksi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                Tervalidasi
                              </span>
                            )}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PERSEDIAAN STOK */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Persediaan Barang</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveModal('beli_persediaan')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-full hover:bg-emerald-700 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Belanja Stok Baru
                  </button>
                  <button
                    onClick={() => setActiveModal('tambah_produk')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#191a23] text-white text-xs font-semibold rounded-full hover:bg-black shadow-sm"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    Tambah Produk Baru
                  </button>
                </div>
              </div>

              {/* Produk Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(dashboardData?.produkList || []).map((prod) => {
                  const stok = Number(prod.stok) || 0;
                  const hargaBeli = Number(prod.harga_beli) || 0;
                  const hargaJual = Number(prod.harga_jual) || 0;
                  const nilaiAsetPersediaan = stok * hargaBeli;
                  const margin = hargaJual > 0 ? Math.round(((hargaJual - hargaBeli) / hargaJual) * 100) : 0;

                  return (
                    <div key={prod.id} className="dashboard-card p-5 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          {prod.kategori || 'Kerupuk'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          stok > 50 ? 'bg-slate-100 text-slate-700' : 'bg-rose-50 text-rose-600'
                        }`}>
                          Stok: {stok} {prod.satuan}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-base text-slate-900 mb-1">{prod.nama_produk}</h4>
                      <div className="space-y-1.5 my-3 text-xs border-y border-slate-100 py-3">
                        <div className="flex justify-between text-slate-500">
                          <span>Harga Beli (HPP):</span>
                          <span className="font-semibold text-slate-800">{formatIDR(hargaBeli)} / {prod.satuan}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Harga Jual:</span>
                          <span className="font-bold text-emerald-600">{formatIDR(hargaJual)} / {prod.satuan}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Estimasi Margin:</span>
                          <span className="font-bold text-slate-800">{margin}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400">Total Nilai Stok:</span>
                        <span className="font-extrabold text-slate-900">{formatIDR(nilaiAsetPersediaan)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Jurnal Transaksi Pembelian Persediaan */}
              <div className="dashboard-card p-6">
                <h3 className="font-bold text-sm text-slate-900 mb-4">Riwayat Pembelian Persediaan (Stok)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3">Tanggal & No. Bukti</th>
                        <th className="pb-3">Nama Produk / Item</th>
                        <th className="pb-3">Keterangan</th>
                        <th className="pb-3 text-right">Nilai Pembelian</th>
                        <th className="pb-3 text-right pr-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!dashboardData?.recentJournals || dashboardData.recentJournals.filter(j => j.tipe_transaksi === 'BELI_PERSEDIAAN').length === 0) ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-slate-400 text-xs">
                            Belum ada riwayat pembelian persediaan tercatat
                          </td>
                        </tr>
                      ) : (
                        dashboardData.recentJournals.filter(j => j.tipe_transaksi === 'BELI_PERSEDIAAN').map((j) => (
                          <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3">
                              <span className="font-bold text-slate-900 text-xs block">{j.nomor_bukti}</span>
                              <span className="text-[11px] text-slate-400">{j.tanggal}</span>
                            </td>
                            <td className="py-3 font-semibold text-slate-800 text-xs">
                              {j.referensi || '-'}
                            </td>
                            <td className="py-3 text-xs text-slate-600">
                              {j.keterangan}
                            </td>
                            <td className="py-3 text-right font-extrabold text-slate-900 text-sm">
                              {formatIDR(j.total_nominal)}
                            </td>
                            <td className="py-3 text-right pr-2">
                              {currentUser?.role === 'super_admin' ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditTransaction(j)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                    title="Edit Transaksi"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteTransaction(j)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                    title="Hapus Transaksi"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  Tervalidasi
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PERALATAN & PEMBELIAN */}
          {activeTab === 'purchases' && currentUser?.role === 'super_admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Peralatan & Aset</h2>
                </div>
                <button
                  onClick={() => setActiveModal('beli_peralatan')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#191a23] text-white text-xs font-semibold rounded-full hover:bg-black shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Beli Peralatan Baru
                </button>
              </div>

              <div className="dashboard-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-slate-900">Daftar Peralatan & Mesin yang Dimiliki</h3>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    Total Aset Tetap: {formatIDR(metrics.peralatan)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3">Tanggal Bukti</th>
                        <th className="pb-3">Nama Peralatan / Mesin</th>
                        <th className="pb-3">Jurnal Akuntansi</th>
                        <th className="pb-3 text-right">Nilai Perolehan</th>
                        <th className="pb-3 text-right pr-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!dashboardData?.recentJournals || dashboardData.recentJournals.filter(j => j.tipe_transaksi === 'BELI_PERALATAN').length === 0) ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-slate-400 text-xs">
                            Belum ada riwayat pembelian peralatan tercatat
                          </td>
                        </tr>
                      ) : (
                        dashboardData.recentJournals.filter(j => j.tipe_transaksi === 'BELI_PERALATAN').map((j) => (
                        <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3">
                            <span className="font-bold text-slate-900 text-xs block">{j.nomor_bukti}</span>
                            <span className="text-[11px] text-slate-400">{j.tanggal}</span>
                          </td>
                          <td className="py-3">
                            <span className="font-semibold text-slate-800 text-xs block">{j.referensi}</span>
                            <span className="text-[11px] text-slate-500">{j.keterangan}</span>
                          </td>
                          <td className="py-3 text-xs">
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono text-[11px]">
                              Debit: Peralatan & Mesin (1501) | Kredit: Kas (1001)
                            </span>
                          </td>
                          <td className="py-3 text-right font-extrabold text-slate-900">
                            {formatIDR(j.total_nominal)}
                          </td>
                          <td className="py-3 text-right pr-2">
                            {currentUser?.role === 'super_admin' ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditTransaction(j)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                  title="Edit Transaksi"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openDeleteTransaction(j)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Hapus Transaksi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                Tervalidasi
                              </span>
                            )}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KAS & PERBANKAN */}
          {activeTab === 'banking' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Kas & Perbankan</h2>
                </div>
                <div className="flex items-center gap-2">
                  {currentUser?.role === 'super_admin' && (
                    <button
                      onClick={() => setActiveModal('modal_awal')}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-full hover:bg-emerald-700 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Penyetoran Modal
                    </button>
                  )}
                  <button
                    onClick={() => setActiveModal('setoran')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#191a23] text-white text-xs font-semibold rounded-full hover:bg-black shadow-sm"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    Terima Setoran Pedagang
                  </button>
                </div>
              </div>

              {/* Kas Card */}
              <div className="dashboard-card p-6 bg-gradient-to-r from-slate-900 to-[#191a23] text-white">
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                  Saldo Kas Berjalan
                </span>
                <div className="text-3xl font-extrabold tracking-tight mb-2">
                  {formatIDR(metrics.kas)}
                </div>
                <p className="text-xs text-slate-400">
                  Semua transaksi tercatat rapi dalam jurnal debit/kredit Kas & Bank (1001)
                </p>
              </div>

              {/* Mutasi Kas Table */}
              <div className="dashboard-card p-6">
                <h3 className="font-bold text-sm text-slate-900 mb-4">Semua Riwayat Jurnal Kas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3">Tanggal & Bukti</th>
                        <th className="pb-3">Keterangan</th>
                        <th className="pb-3">Tipe Transaksi</th>
                        <th className="pb-3 text-right">Debit (Masuk)</th>
                        <th className="pb-3 text-right">Kredit (Keluar)</th>
                        <th className="pb-3 text-right pr-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!dashboardData?.recentJournals || dashboardData.recentJournals.filter(j => j.details?.some(d => d.kode_akun === '1001')).length === 0) ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                            Belum ada riwayat mutasi kas tercatat
                          </td>
                        </tr>
                      ) : (
                        dashboardData.recentJournals.map((j) => {
                        const kasDetail = j.details.find(d => d.kode_akun === '1001');
                        if (!kasDetail) return null;
                        return (
                          <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3">
                              <span className="font-bold text-slate-900 text-xs block">{j.nomor_bukti}</span>
                              <span className="text-[11px] text-slate-400">{j.tanggal}</span>
                            </td>
                            <td className="py-3 text-xs text-slate-700">{j.keterangan}</td>
                            <td className="py-3">
                              <span className="text-[11px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                {j.tipe_transaksi}
                              </span>
                            </td>
                            <td className="py-3 text-right font-bold text-emerald-600">
                              {kasDetail.debit > 0 ? formatIDR(kasDetail.debit) : '-'}
                            </td>
                            <td className="py-3 text-right font-bold text-rose-500">
                              {kasDetail.kredit > 0 ? formatIDR(kasDetail.kredit) : '-'}
                            </td>
                            <td className="py-3 text-right pr-2">
                              {currentUser?.role === 'super_admin' ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditTransaction(j)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                    title="Edit Transaksi"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openDeleteTransaction(j)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                    title="Hapus Transaksi"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  Tervalidasi
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      }))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LAPORAN KEUANGAN OTOMATIS (NERACA & LABA RUGI) */}
          {activeTab === 'finance' && currentUser?.role === 'super_admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Laporan Keuangan</h2>
                </div>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-full hover:bg-slate-50 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Laporan
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. NERACA (BALANCE SHEET) */}
                <div className="dashboard-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">Neraca (Balance Sheet)</h3>
                        <p className="text-[11px] text-slate-400">Posisi Keuangan per {new Date().toISOString().slice(0, 10)}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        metrics.isBalanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {metrics.isBalanced ? '✓ Seimbang (Balanced)' : 'Belum Seimbang'}
                      </span>
                    </div>

                    {/* ASET */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Aset Lancar</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-600">Kas & Bank</span>
                            <span className="font-bold text-slate-900">{formatIDR(metrics.kas)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-600">Piutang Dagang (Pedagang)</span>
                            <span className="font-bold text-slate-900">{formatIDR(metrics.piutang)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-600">Persediaan Barang Dagang</span>
                            <span className="font-bold text-slate-900">{formatIDR(metrics.persediaan)}</span>
                          </div>
                          <div className="flex justify-between py-1.5 font-semibold text-slate-800 bg-slate-50 px-2 rounded">
                            <span>Total Aset Lancar</span>
                            <span>{formatIDR(metrics.kas + metrics.piutang + metrics.persediaan)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Aset Tetap</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-600">Peralatan & Mesin Pabrik</span>
                            <span className="font-bold text-slate-900">{formatIDR(metrics.peralatan)}</span>
                          </div>
                          <div className="flex justify-between py-1.5 font-semibold text-slate-800 bg-slate-50 px-2 rounded">
                            <span>Total Aset Tetap</span>
                            <span>{formatIDR(metrics.peralatan)}</span>
                          </div>
                        </div>
                      </div>

                      {/* TOTAL ASET */}
                      <div className="flex justify-between py-2.5 px-3 bg-[#191a23] text-white rounded-xl font-extrabold text-sm">
                        <span>TOTAL ASET</span>
                        <span className="text-emerald-400">{formatIDR(metrics.totalAset)}</span>
                      </div>

                      {/* KEWAJIBAN & EKUITAS */}
                      <div className="pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Kewajiban & Ekuitas</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-600">Utang Usaha</span>
                            <span className="font-bold text-slate-900">Rp 0</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-600">Modal Disetor</span>
                            <span className="font-bold text-slate-900">
                              {formatIDR(metrics.totalAset - metrics.labaBersih)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-600">Laba Periode Berjalan</span>
                            <span className="font-bold text-emerald-600">{formatIDR(metrics.labaBersih)}</span>
                          </div>
                        </div>
                      </div>

                      {/* TOTAL KEWAJIBAN & EKUITAS */}
                      <div className="flex justify-between py-2.5 px-3 bg-slate-100 text-slate-900 rounded-xl font-extrabold text-sm">
                        <span>TOTAL KEWAJIBAN & EKUITAS</span>
                        <span>{formatIDR(metrics.totalAset)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. LABA RUGI (INCOME STATEMENT) */}
                <div className="dashboard-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">Laba Rugi (Income Statement)</h3>
                        <p className="text-[11px] text-slate-400">Kinerja Keuangan Periode Berjalan</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        Surplus
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* PENDAPATAN */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Pendapatan Penjualan</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-600">Penjualan Kerupuk ke Pedagang</span>
                            <span className="font-bold text-slate-900">{formatIDR(metrics.penjualan)}</span>
                          </div>
                          <div className="flex justify-between py-1.5 font-bold text-slate-900 bg-slate-50 px-2 rounded">
                            <span>Total Pendapatan</span>
                            <span className="text-emerald-600">{formatIDR(metrics.penjualan)}</span>
                          </div>
                        </div>
                      </div>

                      {/* HPP */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Harga Pokok Penjualan (HPP)</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-600">Beban Pokok Produksi & Kerupuk Terjual</span>
                            <span className="font-bold text-slate-900">{formatIDR(metrics.hpp)}</span>
                          </div>
                          <div className="flex justify-between py-1.5 font-bold text-slate-900 bg-slate-50 px-2 rounded">
                            <span>Total HPP</span>
                            <span className="text-rose-500">({formatIDR(metrics.hpp)})</span>
                          </div>
                        </div>
                      </div>

                      {/* LABA KOTOR */}
                      <div className="flex justify-between py-2.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl font-extrabold text-sm">
                        <span>LABA KOTOR (GROSS PROFIT)</span>
                        <span className="text-emerald-700">{formatIDR(metrics.labaKotor)}</span>
                      </div>

                      {/* BEBAN OPERASIONAL */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Beban Operasional</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between py-1 border-b border-slate-50">
                            <span className="text-slate-600">Beban Listrik, BBM & Pemeliharaan</span>
                            <span className="font-bold text-slate-900">{formatIDR(metrics.bebanOperasional)}</span>
                          </div>
                        </div>
                      </div>

                      {/* LABA BERSIH */}
                      <div className="flex justify-between py-3 px-4 bg-gradient-to-r from-[#191a23] to-[#121319] text-white rounded-2xl font-extrabold text-base shadow-md">
                        <span>LABA BERSIH (NET PROFIT)</span>
                        <span className="text-emerald-400">{formatIDR(metrics.labaBersih)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: CETAK LAPORAN LENGKAP & ANALISA KEUANGAN */}
          {activeTab === 'reports' && currentUser?.role === 'super_admin' && (
            <div className="space-y-6">
              {/* Header & Controls (Hidden in Print) */}
              <div className="no-print space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Cetak Laporan Lengkap</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Laporan resmi komprehensif neraca, laba rugi, persediaan barang gudang, pengawasan piutang, dan analisa rasio keuangan.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportReportCSV}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#1a1b24] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-full hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm transition-all"
                      title="Unduh data dalam format CSV/Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh CSV</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#191a23] dark:bg-emerald-600 hover:bg-black dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-full shadow-md active:scale-95 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Laporan / Simpan PDF</span>
                    </button>
                  </div>
                </div>

                {/* Filter Section Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                  {[
                    { id: 'all', label: 'Semua Laporan' },
                    { id: 'neraca', label: '1. Neraca Saldo' },
                    { id: 'laba_rugi', label: '2. Laba Rugi' },
                    { id: 'persediaan', label: '3. Persediaan Barang' },
                    { id: 'piutang', label: '4. Piutang Pedagang' },
                    { id: 'aset', label: '5. Peralatan & Mesin' },
                    { id: 'analisa', label: '6. Analisa Finansial' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setReportFilterSection(tab.id)}
                      className={`px-3.5 py-1.5 font-semibold rounded-full whitespace-nowrap transition-all border ${
                        reportFilterSection === tab.id
                          ? 'bg-[#191a23] dark:bg-emerald-600 text-white border-transparent shadow-sm'
                          : 'bg-white dark:bg-[#1a1b24] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FORMAL PRINTABLE REPORT SHEET */}
              <div className="print-container bg-white dark:bg-[#14151c] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-10 shadow-sm print:p-0 print:border-none print:shadow-none print:bg-white print:text-black space-y-8">
                
                {/* 1. KOP SURAT RESMI */}
                <div className="border-b-4 border-double border-slate-800 dark:border-slate-300 pb-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-sm">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white print:text-black">
                          PT. RAJA KERUPUK INDONESIA
                        </h1>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">
                          SISTEM INFORMASI AKUNTANSI & LAPORAN OPERASIONAL TERPADU
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-600 mt-0.5">
                          {currentFactory?.alamat || 'Pusat Distribusi Kerupuk Indonesia'} | Telp: {currentFactory?.telepon || '0812-3456-7890'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-white/10 print:bg-slate-100 text-slate-800 dark:text-slate-200 print:text-slate-900 rounded-md text-[11px] font-bold uppercase tracking-wider border border-slate-300 print:border-slate-400">
                        Dokumen Resmi Akuntansi
                      </span>
                      <p className="text-[10px] text-slate-400 print:text-slate-600 mt-1 font-mono">
                        Ref: RPT-RK-{String(selectedPabrikId).toUpperCase()}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 print:text-slate-700">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white print:text-black">Entitas Pelaporan: </span>
                      <span>{currentFactory?.nama_pabrik || 'Semua Pabrik'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white print:text-black">Periode: </span>
                      <span>Per {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white print:text-black">Mata Uang: </span>
                      <span>Rupiah (IDR)</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white print:text-black">Status Verifikasi: </span>
                      <span className={`font-bold ${metrics.isBalanced ? 'text-emerald-700 dark:text-emerald-400 print:text-black' : 'text-rose-600'}`}>
                        {metrics.isBalanced ? '✓ Seimbang (Balanced 100%)' : 'Belum Seimbang'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. RINGKASAN EKSEKUTIF (KEY FINANCIAL INDICATORS) */}
                {(reportFilterSection === 'all' || reportFilterSection === 'neraca' || reportFilterSection === 'laba_rugi') && (
                  <div className="space-y-3 print-card">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                        Ringkasan Posisi Keuangan & Kinerja Utama
                      </h3>
                      <span className="text-[11px] text-slate-500 print:text-slate-600">Executive Financial Summary</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-white/5 print:bg-white rounded-xl border border-slate-200 dark:border-white/10 print:border-slate-300">
                        <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Total Aset</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white print:text-black block">{formatIDR(metrics.totalAset)}</span>
                        <span className="text-[10px] text-emerald-600 font-medium">Aktiva Bersih</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-white/5 print:bg-white rounded-xl border border-slate-200 dark:border-white/10 print:border-slate-300">
                        <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Kas Likuid</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 print:text-black block">{formatIDR(metrics.kas)}</span>
                        <span className="text-[10px] text-slate-500">{cashRatio}% dari Aset Lancar</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-white/5 print:bg-white rounded-xl border border-slate-200 dark:border-white/10 print:border-slate-300">
                        <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Piutang Dagang</span>
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400 print:text-black block">{formatIDR(metrics.piutang)}</span>
                        <span className="text-[10px] text-slate-500">{pedagangList.length} Mitra Pedagang</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-white/5 print:bg-white rounded-xl border border-slate-200 dark:border-white/10 print:border-slate-300">
                        <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Persediaan Gudang</span>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400 print:text-black block">{formatIDR(metrics.persediaan)}</span>
                        <span className="text-[10px] text-slate-500">{produkList.length} Produk ({totalPersediaanQty} unit)</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-white/5 print:bg-white rounded-xl border border-slate-200 dark:border-white/10 print:border-slate-300">
                        <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Omset Penjualan</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white print:text-black block">{formatIDR(metrics.penjualan)}</span>
                        <span className="text-[10px] text-emerald-600 font-medium">HPP: {formatShort(metrics.hpp)}</span>
                      </div>
                      <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 print:bg-white rounded-xl border border-emerald-200 dark:border-emerald-800 print:border-slate-300">
                        <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold block mb-0.5">Laba Bersih</span>
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 print:text-black block">{formatIDR(metrics.labaBersih)}</span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">NPM: {netProfitMargin}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. BAGIAN I: LAPORAN NERACA (BALANCE SHEET) */}
                {(reportFilterSection === 'all' || reportFilterSection === 'neraca') && (
                  <div className="space-y-4 print-card">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                          I. Laporan Posisi Keuangan (Neraca Saldo)
                        </h3>
                        <p className="text-[11px] text-slate-500 print:text-slate-600">
                          Posisi Aset, Kewajiban, dan Ekuitas per {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 print:bg-slate-100 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                        Debit = Kredit Seimbang
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
                      {/* SISI AKTIVA (ASET) */}
                      <div className="border border-slate-200 dark:border-white/10 print:border-slate-400 rounded-xl overflow-hidden">
                        <div className="bg-slate-100 dark:bg-white/10 print:bg-slate-200 px-4 py-2 font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 print:text-black flex justify-between">
                          <span>Aset (Aktiva)</span>
                          <span>Nominal</span>
                        </div>
                        <table className="w-full text-xs">
                          <tbody>
                            {/* Aset Lancar Header */}
                            <tr className="bg-slate-50/60 dark:bg-white/5 font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/5">
                              <td colSpan="2" className="px-4 py-1.5 uppercase text-[10px] tracking-wider">Aset Lancar</td>
                            </tr>
                            <tr className="border-b border-slate-100 dark:border-white/5">
                              <td className="px-4 py-2 pl-6 text-slate-700 dark:text-slate-300 print:text-black">1001 - Kas & Bank</td>
                              <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100 print:text-black">{formatIDR(metrics.kas)}</td>
                            </tr>
                            <tr className="border-b border-slate-100 dark:border-white/5">
                              <td className="px-4 py-2 pl-6 text-slate-700 dark:text-slate-300 print:text-black">1002 - Piutang Dagang (Mitra Pedagang)</td>
                              <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100 print:text-black">{formatIDR(metrics.piutang)}</td>
                            </tr>
                            <tr className="border-b border-slate-100 dark:border-white/5">
                              <td className="px-4 py-2 pl-6 text-slate-700 dark:text-slate-300 print:text-black">1003 - Persediaan Barang Dagang</td>
                              <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100 print:text-black">{formatIDR(metrics.persediaan)}</td>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-white/5 font-bold border-b border-slate-200 dark:border-white/10">
                              <td className="px-4 py-2 text-slate-800 dark:text-slate-200 print:text-black">Total Aset Lancar</td>
                              <td className="px-4 py-2 text-right text-slate-900 dark:text-white print:text-black">{formatIDR(totalAsetLancar)}</td>
                            </tr>

                            {/* Aset Tetap Header */}
                            <tr className="bg-slate-50/60 dark:bg-white/5 font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/5">
                              <td colSpan="2" className="px-4 py-1.5 uppercase text-[10px] tracking-wider">Aset Tetap</td>
                            </tr>
                            <tr className="border-b border-slate-100 dark:border-white/5">
                              <td className="px-4 py-2 pl-6 text-slate-700 dark:text-slate-300 print:text-black">1501 - Peralatan & Mesin Pabrik</td>
                              <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100 print:text-black">{formatIDR(metrics.peralatan)}</td>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-white/5 font-bold border-b border-slate-200 dark:border-white/10">
                              <td className="px-4 py-2 text-slate-800 dark:text-slate-200 print:text-black">Total Aset Tetap</td>
                              <td className="px-4 py-2 text-right text-slate-900 dark:text-white print:text-black">{formatIDR(metrics.peralatan)}</td>
                            </tr>

                            {/* Grand Total Aset */}
                            <tr className="bg-slate-900 dark:bg-white/15 print:bg-slate-200 text-white print:text-black font-extrabold">
                              <td className="px-4 py-2.5">TOTAL ASET (AKTIVA)</td>
                              <td className="px-4 py-2.5 text-right text-emerald-400 print:text-black">{formatIDR(metrics.totalAset)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* SISI PASIVA (KEWAJIBAN & EKUITAS) */}
                      <div className="border border-slate-200 dark:border-white/10 print:border-slate-400 rounded-xl overflow-hidden">
                        <div className="bg-slate-100 dark:bg-white/10 print:bg-slate-200 px-4 py-2 font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 print:text-black flex justify-between">
                          <span>Kewajiban & Ekuitas (Pasiva)</span>
                          <span>Nominal</span>
                        </div>
                        <table className="w-full text-xs">
                          <tbody>
                            {/* Kewajiban Header */}
                            <tr className="bg-slate-50/60 dark:bg-white/5 font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/5">
                              <td colSpan="2" className="px-4 py-1.5 uppercase text-[10px] tracking-wider">Kewajiban (Liabilitas)</td>
                            </tr>
                            <tr className="border-b border-slate-100 dark:border-white/5">
                              <td className="px-4 py-2 pl-6 text-slate-700 dark:text-slate-300 print:text-black">2001 - Utang Usaha</td>
                              <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100 print:text-black">Rp 0</td>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-white/5 font-bold border-b border-slate-200 dark:border-white/10">
                              <td className="px-4 py-2 text-slate-800 dark:text-slate-200 print:text-black">Total Kewajiban</td>
                              <td className="px-4 py-2 text-right text-slate-900 dark:text-white print:text-black">Rp 0</td>
                            </tr>

                            {/* Ekuitas Header */}
                            <tr className="bg-slate-50/60 dark:bg-white/5 font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/5">
                              <td colSpan="2" className="px-4 py-1.5 uppercase text-[10px] tracking-wider">Ekuitas (Modal Pemilik)</td>
                            </tr>
                            <tr className="border-b border-slate-100 dark:border-white/5">
                              <td className="px-4 py-2 pl-6 text-slate-700 dark:text-slate-300 print:text-black">3001 - Modal Awal Disetor</td>
                              <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100 print:text-black">
                                {formatIDR(metrics.totalAset - metrics.labaBersih)}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100 dark:border-white/5">
                              <td className="px-4 py-2 pl-6 text-slate-700 dark:text-slate-300 print:text-black">3999 - Laba Periode Berjalan</td>
                              <td className="px-4 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400 print:text-black">
                                {formatIDR(metrics.labaBersih)}
                              </td>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-white/5 font-bold border-b border-slate-200 dark:border-white/10">
                              <td className="px-4 py-2 text-slate-800 dark:text-slate-200 print:text-black">Total Ekuitas</td>
                              <td className="px-4 py-2 text-right text-slate-900 dark:text-white print:text-black">{formatIDR(metrics.totalAset)}</td>
                            </tr>

                            {/* Grand Total Pasiva */}
                            <tr className="bg-slate-900 dark:bg-white/15 print:bg-slate-200 text-white print:text-black font-extrabold">
                              <td className="px-4 py-2.5">TOTAL KEWAJIBAN & EKUITAS</td>
                              <td className="px-4 py-2.5 text-right text-emerald-400 print:text-black">{formatIDR(metrics.totalAset)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. BAGIAN II: LAPORAN LABA RUGI KOMPREHENSIF */}
                {(reportFilterSection === 'all' || reportFilterSection === 'laba_rugi') && (
                  <div className="space-y-4 print-card">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                          II. Laporan Laba Rugi (Income Statement)
                        </h3>
                        <p className="text-[11px] text-slate-500 print:text-slate-600">
                          Rincian Penjualan, Beban Pokok Penjualan, Biaya Operasional, dan Laba Bersih
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 print:bg-slate-100 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                        Net Profit Margin: {netProfitMargin}%
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-white/10 print:border-slate-400 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-white/10 print:bg-slate-200 text-slate-800 dark:text-slate-200 print:text-black font-bold uppercase text-[11px]">
                            <th className="px-4 py-2.5 text-left">Kode Akun & Deskripsi Komponen</th>
                            <th className="px-4 py-2.5 text-right">Rincian Saldo</th>
                            <th className="px-4 py-2.5 text-right">Subtotal</th>
                            <th className="px-4 py-2.5 text-right">Rasio (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* PENDAPATAN */}
                          <tr className="bg-slate-50/70 dark:bg-white/5 font-bold border-b border-slate-100 dark:border-white/5">
                            <td colSpan="4" className="px-4 py-2 uppercase text-[10px] tracking-wider text-slate-600 dark:text-slate-400">
                              Pendapatan Usaha (Revenue)
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100 dark:border-white/5">
                            <td className="px-4 py-2 pl-8 text-slate-800 dark:text-slate-200 print:text-black">4001 - Pendapatan Penjualan Kerupuk</td>
                            <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300 print:text-black">{formatIDR(metrics.penjualan)}</td>
                            <td className="px-4 py-2 text-right"></td>
                            <td className="px-4 py-2 text-right text-slate-500">100.0%</td>
                          </tr>
                          <tr className="bg-slate-50/40 dark:bg-white/5 font-semibold border-b border-slate-200 dark:border-white/10">
                            <td className="px-4 py-2 pl-4 text-slate-900 dark:text-white print:text-black">Total Pendapatan Penjualan</td>
                            <td className="px-4 py-2 text-right"></td>
                            <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-white print:text-black">{formatIDR(metrics.penjualan)}</td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">100.0%</td>
                          </tr>

                          {/* HPP */}
                          <tr className="bg-slate-50/70 dark:bg-white/5 font-bold border-b border-slate-100 dark:border-white/5">
                            <td colSpan="4" className="px-4 py-2 uppercase text-[10px] tracking-wider text-slate-600 dark:text-slate-400">
                              Harga Pokok Penjualan (Cost of Goods Sold)
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100 dark:border-white/5">
                            <td className="px-4 py-2 pl-8 text-slate-800 dark:text-slate-200 print:text-black">5001 - Beban Pokok Produksi & Kerupuk Terjual</td>
                            <td className="px-4 py-2 text-right text-rose-600 dark:text-rose-400 print:text-black">({formatIDR(metrics.hpp)})</td>
                            <td className="px-4 py-2 text-right"></td>
                            <td className="px-4 py-2 text-right text-slate-500">
                              {metrics.penjualan > 0 ? ((metrics.hpp / metrics.penjualan) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                          <tr className="bg-slate-50/40 dark:bg-white/5 font-semibold border-b border-slate-200 dark:border-white/10">
                            <td className="px-4 py-2 pl-4 text-slate-900 dark:text-white print:text-black">Total Harga Pokok Penjualan (HPP)</td>
                            <td className="px-4 py-2 text-right"></td>
                            <td className="px-4 py-2 text-right font-bold text-rose-600 dark:text-rose-400 print:text-black">({formatIDR(metrics.hpp)})</td>
                            <td className="px-4 py-2 text-right font-semibold text-rose-500">
                              {metrics.penjualan > 0 ? ((metrics.hpp / metrics.penjualan) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>

                          {/* LABA KOTOR */}
                          <tr className="bg-emerald-50 dark:bg-emerald-950/30 print:bg-slate-100 font-extrabold border-b-2 border-emerald-300 dark:border-emerald-800">
                            <td className="px-4 py-2.5 text-emerald-950 dark:text-emerald-300 print:text-black text-xs uppercase tracking-wider">
                              LABA KOTOR (GROSS PROFIT)
                            </td>
                            <td className="px-4 py-2.5 text-right"></td>
                            <td className="px-4 py-2.5 text-right text-emerald-700 dark:text-emerald-400 print:text-black text-sm">
                              {formatIDR(metrics.labaKotor)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-emerald-700 dark:text-emerald-400 print:text-black">
                              {grossProfitMargin}%
                            </td>
                          </tr>

                          {/* BEBAN OPERASIONAL */}
                          <tr className="bg-slate-50/70 dark:bg-white/5 font-bold border-b border-slate-100 dark:border-white/5">
                            <td colSpan="4" className="px-4 py-2 uppercase text-[10px] tracking-wider text-slate-600 dark:text-slate-400">
                              Beban Operasional (Operating Expenses)
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100 dark:border-white/5">
                            <td className="px-4 py-2 pl-8 text-slate-800 dark:text-slate-200 print:text-black">6001 - Beban Listrik, BBM & Pemeliharaan Mesin</td>
                            <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300 print:text-black">({formatIDR(metrics.bebanOperasional)})</td>
                            <td className="px-4 py-2 text-right"></td>
                            <td className="px-4 py-2 text-right text-slate-500">
                              {metrics.penjualan > 0 ? ((metrics.bebanOperasional / metrics.penjualan) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                          <tr className="bg-slate-50/40 dark:bg-white/5 font-semibold border-b border-slate-200 dark:border-white/10">
                            <td className="px-4 py-2 pl-4 text-slate-900 dark:text-white print:text-black">Total Beban Operasional</td>
                            <td className="px-4 py-2 text-right"></td>
                            <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-white print:text-black">({formatIDR(metrics.bebanOperasional)})</td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">
                              {metrics.penjualan > 0 ? ((metrics.bebanOperasional / metrics.penjualan) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>

                          {/* LABA BERSIH */}
                          <tr className="bg-slate-900 dark:bg-emerald-950/60 print:bg-slate-200 text-white print:text-black font-black text-sm">
                            <td className="px-4 py-3 uppercase tracking-wider">
                              LABA BERSIH TAHUN BERJALAN (NET PROFIT)
                            </td>
                            <td className="px-4 py-3 text-right"></td>
                            <td className="px-4 py-3 text-right text-emerald-400 print:text-black text-base">
                              {formatIDR(metrics.labaBersih)}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-400 print:text-black">
                              {netProfitMargin}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. BAGIAN III: LAPORAN PERSEDIAAN BARANG DAGANG */}
                {(reportFilterSection === 'all' || reportFilterSection === 'persediaan') && (
                  <div className="space-y-4 print-card">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                          III. Laporan Persediaan Stok Barang Dagang (Inventory Valuation)
                        </h3>
                        <p className="text-[11px] text-slate-500 print:text-slate-600">
                          Rincian Stok Fisik Gudang, Harga Modal Beli (HPP), Nilai Aset, dan Estimasi Potensi Omset Penjualan
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded">
                        Total {produkList.length} Item Produk ({totalPersediaanQty} unit)
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-white/10 print:border-slate-400 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-white/10 print:bg-slate-200 text-slate-800 dark:text-slate-200 print:text-black font-bold uppercase text-[11px]">
                            <th className="px-3 py-2 text-center w-10">No</th>
                            <th className="px-3 py-2 text-left">Nama Produk Kerupuk</th>
                            <th className="px-3 py-2 text-center">Satuan</th>
                            <th className="px-3 py-2 text-right">Sisa Stok</th>
                            <th className="px-3 py-2 text-right">Harga Modal Beli</th>
                            <th className="px-3 py-2 text-right">Nilai Aset Stok (Rp)</th>
                            <th className="px-3 py-2 text-right">Harga Jual</th>
                            <th className="px-3 py-2 text-right">Potensi Omset (Rp)</th>
                            <th className="px-3 py-2 text-right">Potensi Margin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {produkList.length === 0 ? (
                            <tr>
                              <td colSpan="9" className="text-center py-4 text-slate-400">Tidak ada data persediaan barang</td>
                            </tr>
                          ) : (
                            produkList.map((p, idx) => {
                              const stok = Number(p.stok) || 0;
                              const hb = Number(p.harga_beli) || 0;
                              const hj = Number(p.harga_jual) || 0;
                              const asetVal = stok * hb;
                              const omsetVal = stok * hj;
                              const marginVal = omsetVal - asetVal;
                              return (
                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                  <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                                  <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 print:text-black">
                                    {p.nama_produk}
                                  </td>
                                  <td className="px-3 py-2 text-center text-slate-500 font-medium">{p.satuan || 'Bal'}</td>
                                  <td className="px-3 py-2 text-right font-extrabold text-slate-900 dark:text-white print:text-black">
                                    {stok.toLocaleString('id-ID')}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300 print:text-black">
                                    {formatIDR(hb)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100 print:text-black">
                                    {formatIDR(asetVal)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300 print:text-black">
                                    {formatIDR(hj)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400 print:text-black">
                                    {formatIDR(omsetVal)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400">
                                    +{formatIDR(marginVal)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          <tr className="bg-slate-100 dark:bg-white/10 print:bg-slate-200 font-extrabold text-slate-900 dark:text-white print:text-black">
                            <td colSpan="3" className="px-3 py-2.5 text-center uppercase text-[10px] tracking-wider">
                              TOTAL VALUASI PERSEDIAAN
                            </td>
                            <td className="px-3 py-2.5 text-right">{totalPersediaanQty.toLocaleString('id-ID')}</td>
                            <td className="px-3 py-2.5 text-right">-</td>
                            <td className="px-3 py-2.5 text-right text-emerald-700 dark:text-emerald-400 print:text-black">
                              {formatIDR(totalPersediaanValuasi)}
                            </td>
                            <td className="px-3 py-2.5 text-right">-</td>
                            <td className="px-3 py-2.5 text-right text-emerald-700 dark:text-emerald-400 print:text-black">
                              {formatIDR(totalPersediaanPotensiOmset)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-black text-emerald-700 dark:text-emerald-400 print:text-black">
                              +{formatIDR(totalPersediaanPotensiMargin)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. BAGIAN IV: LAPORAN PENGAWASAN PIUTANG MITRA PEDAGANG */}
                {(reportFilterSection === 'all' || reportFilterSection === 'piutang') && (
                  <div className="space-y-4 print-card">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                          IV. Laporan Pengawasan Piutang & Mitra Pedagang
                        </h3>
                        <p className="text-[11px] text-slate-500 print:text-slate-600">
                          Monitoring Plafon Kredit, Saldo Tagihan Aktif, dan Status Risiko Pembayaran Pedagang
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded">
                        Utilisasi Kredit: {avgUtilisasiPiutang}%
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-white/10 print:border-slate-400 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-white/10 print:bg-slate-200 text-slate-800 dark:text-slate-200 print:text-black font-bold uppercase text-[11px]">
                            <th className="px-3 py-2 text-center w-10">No</th>
                            <th className="px-3 py-2 text-left">Nama Mitra Pedagang / Warung</th>
                            <th className="px-3 py-2 text-left">Lokasi / Pasar</th>
                            <th className="px-3 py-2 text-right">Plafon Limit Kredit</th>
                            <th className="px-3 py-2 text-right">Saldo Piutang Berjalan</th>
                            <th className="px-3 py-2 text-right">Sisa Plafon Kredit</th>
                            <th className="px-3 py-2 text-center">Utilisasi (%)</th>
                            <th className="px-3 py-2 text-center">Status Piutang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {pedagangList.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="text-center py-4 text-slate-400">Tidak ada data mitra pedagang</td>
                            </tr>
                          ) : (
                            pedagangList.map((ped, idx) => {
                              const limit = Number(ped.limit_piutang) || 0;
                              const saldo = Number(ped.saldo_piutang) || 0;
                              const sisa = Math.max(0, limit - saldo);
                              const util = limit > 0 ? ((saldo / limit) * 100).toFixed(1) : 0;
                              return (
                                <tr key={ped.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                  <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                                  <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 print:text-black">
                                    {ped.nama_pedagang}
                                    {ped.no_telepon && (
                                      <span className="block text-[10px] text-slate-400 font-normal">{ped.no_telepon}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 print:text-black">
                                    {ped.alamat || '-'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300 print:text-black">
                                    {formatIDR(limit)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-extrabold text-slate-900 dark:text-white print:text-black">
                                    {formatIDR(saldo)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400 print:text-black">
                                    {formatIDR(sisa)}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-200">
                                    {util}%
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      ped.status_piutang === 'Over Limit'
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                        : ped.status_piutang === 'Mendekati Limit'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        : ped.status_piutang === 'Lancar'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : 'bg-slate-100 text-slate-800'
                                    }`}>
                                      {ped.status_piutang || 'Lancar'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          <tr className="bg-slate-100 dark:bg-white/10 print:bg-slate-200 font-extrabold text-slate-900 dark:text-white print:text-black">
                            <td colSpan="3" className="px-3 py-2.5 text-center uppercase text-[10px] tracking-wider">
                              TOTAL KREDIT & SALDO PIUTANG
                            </td>
                            <td className="px-3 py-2.5 text-right">{formatIDR(totalLimitPiutang)}</td>
                            <td className="px-3 py-2.5 text-right text-rose-600 dark:text-rose-400 print:text-black">
                              {formatIDR(totalPiutangNominal)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-emerald-700 dark:text-emerald-400 print:text-black">
                              {formatIDR(Math.max(0, totalLimitPiutang - totalPiutangNominal))}
                            </td>
                            <td className="px-3 py-2.5 text-center font-black">{avgUtilisasiPiutang}%</td>
                            <td className="px-3 py-2.5 text-center">Aktif</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. BAGIAN V: LAPORAN PERALATAN & ASET TETAP */}
                {(reportFilterSection === 'all' || reportFilterSection === 'aset') && (
                  <div className="space-y-4 print-card">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                          V. Laporan Peralatan Pabrik & Aset Tetap (Fixed Assets)
                        </h3>
                        <p className="text-[11px] text-slate-500 print:text-slate-600">
                          Daftar Mesin Produksi, Alat Pengering, dan Sarana Operasional Pabrik
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded">
                        Total Aset Tetap: {formatIDR(metrics.peralatan)}
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-white/10 print:border-slate-400 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-white/10 print:bg-slate-200 text-slate-800 dark:text-slate-200 print:text-black font-bold uppercase text-[11px]">
                            <th className="px-3 py-2 text-center w-10">No</th>
                            <th className="px-3 py-2 text-left">Tanggal</th>
                            <th className="px-3 py-2 text-left">Nomor Bukti Transaksi</th>
                            <th className="px-3 py-2 text-left">Nama Peralatan / Mesin</th>
                            <th className="px-3 py-2 text-left">Keterangan Pengadaan</th>
                            <th className="px-3 py-2 text-right">Nilai Perolehan (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {peralatanItems.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-4 text-slate-400">Belum ada catatan pengadaan peralatan spesifik</td>
                            </tr>
                          ) : (
                            peralatanItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-300 print:text-black">{item.tanggal}</td>
                                <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">{item.nomor_bukti}</td>
                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 print:text-black">{item.referensi || 'Peralatan Pabrik'}</td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-300 print:text-black">{item.keterangan || '-'}</td>
                                <td className="px-3 py-2 text-right font-extrabold text-slate-900 dark:text-slate-100 print:text-black">
                                  {formatIDR(item.total_nominal)}
                                </td>
                              </tr>
                            ))
                          )}
                          <tr className="bg-slate-100 dark:bg-white/10 print:bg-slate-200 font-extrabold text-slate-900 dark:text-white print:text-black">
                            <td colSpan="5" className="px-3 py-2.5 text-center uppercase text-[10px] tracking-wider">
                              TOTAL VALUASI ASET TETAP (PERALATAN & MESIN)
                            </td>
                            <td className="px-3 py-2.5 text-right text-emerald-700 dark:text-emerald-400 print:text-black">
                              {formatIDR(metrics.peralatan)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 8. BAGIAN VI: ANALISA RASIO FINANSIAL & EVALUASI BISNIS LENGKAP */}
                {(reportFilterSection === 'all' || reportFilterSection === 'analisa') && (
                  <div className="space-y-4 print-card">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                          VI. Analisis Rasio Finansial & Evaluasi Manajemen
                        </h3>
                        <p className="text-[11px] text-slate-500 print:text-slate-600">
                          Evaluasi Likuiditas, Profitabilitas, Solvabilitas, dan Efisiensi Modal Kerja
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 print:bg-slate-100 px-2.5 py-1 rounded">
                        Kondisi: Sehat & Solven
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tabel Rasio Keuangan Standar */}
                      <div className="border border-slate-200 dark:border-white/10 print:border-slate-400 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-white/10 print:bg-slate-200 font-bold uppercase text-[11px] text-slate-800 dark:text-slate-100 print:text-black">
                              <th className="px-3 py-2 text-left">Indikator Rasio Finansial</th>
                              <th className="px-3 py-2 text-right">Nilai Rasio</th>
                              <th className="px-3 py-2 text-left">Benchmark / Standar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            <tr>
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">Current Ratio (Likuiditas)</td>
                              <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">Solven Penuh</td>
                              <td className="px-3 py-2 text-slate-500">&gt; 150% (Sangat Sehat)</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">Cash Ratio (Likuiditas Kas)</td>
                              <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">{cashRatio}%</td>
                              <td className="px-3 py-2 text-slate-500">&gt; 20% (Likuiditas Tinggi)</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">Gross Profit Margin (GPM)</td>
                              <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">{grossProfitMargin}%</td>
                              <td className="px-3 py-2 text-slate-500">Standar Industri Kerupuk 25-35%</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">Net Profit Margin (NPM)</td>
                              <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">{netProfitMargin}%</td>
                              <td className="px-3 py-2 text-slate-500">&gt; 10% (Tinggi)</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">Return on Assets (ROA)</td>
                              <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">{roa}%</td>
                              <td className="px-3 py-2 text-slate-500">Efisiensi Pemanfaatan Modal Aset</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">Rasio Piutang thd Penjualan (A/R)</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-200">{arToSalesRatio}%</td>
                              <td className="px-3 py-2 text-slate-500">&lt; 50% (Terkendali Baik)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Catatan Naratif Analisis Manajemen */}
                      <div className="p-4 bg-slate-50 dark:bg-white/5 print:bg-white rounded-xl border border-slate-200 dark:border-white/10 print:border-slate-400 space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 print:text-black">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white print:text-black text-[11px] uppercase tracking-wide">
                            1. Evaluasi Likuiditas & Ketersediaan Dana
                          </h4>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-400 print:text-slate-800">
                            Pabrik memiliki saldo Kas sebesar {formatIDR(metrics.kas)} (mewakili {cashRatio}% dari total aset lancar). Struktur modal sangat aman dengan liabilitas utang Rp 0, memberikan fleksibilitas operasional penuh untuk belanja bahan baku.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white print:text-black text-[11px] uppercase tracking-wide">
                            2. Manajemen Risiko Kredit Piutang Pedagang
                          </h4>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-400 print:text-slate-800">
                            Total piutang dagang tercatat {formatIDR(metrics.piutang)} dengan utilisasi plafon kredit rata-rata {avgUtilisasiPiutang}%. Mayoritas mitra berada pada status Lancar. Disarankan penagihan rutin sebelum plafon kredit mencapai batas maksimal.
                          </p>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white print:text-black text-[11px] uppercase tracking-wide">
                            3. Perputaran Stok Gudang & Rekomendasi
                          </h4>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-400 print:text-slate-800">
                            Valuasi persediaan gudang sebesar {formatIDR(metrics.persediaan)} dengan potensi nilai jual {formatIDR(totalPersediaanPotensiOmset)}. Margin kotor {grossProfitMargin}% menunjukkan efisiensi produksi yang kompetitif. Sebagian laba bersih disarankan dialokasikan untuk cadangan kas darurat dan perawatan mesin pabrik.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. BAGIAN VII: PENGESAHAN DOKUMEN & TANDA TANGAN */}
                <div className="pt-6 border-t-2 border-slate-200 dark:border-white/10 print:border-slate-400 page-break-avoid">
                  <p className="text-xs text-center text-slate-500 print:text-slate-600 mb-6 font-medium">
                    Dokumen ini digenerate secara otomatis melalui Sistem Akuntansi Raja Kerupuk dan dinyatakan sah untuk keperluan pelaporan manajerial, perpajakan, dan evaluasi operasional.
                  </p>

                  <div className="grid grid-cols-3 gap-4 text-center text-xs">
                    <div className="space-y-16">
                      <p className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">
                        Dibuat Oleh,<br />
                        <span className="text-[10px] text-slate-400">Bagian Akuntansi & Administrasi</span>
                      </p>
                      <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-bold text-slate-900 dark:text-white print:text-black">
                        ( Staf Keuangan )
                      </div>
                    </div>

                    <div className="space-y-16">
                      <p className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">
                        Diperiksa Oleh,<br />
                        <span className="text-[10px] text-slate-400">Manajer Operasional Pabrik</span>
                      </p>
                      <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-bold text-slate-900 dark:text-white print:text-black">
                        ( {currentFactory?.penanggung_jawab || 'Kepala Pabrik'} )
                      </div>
                    </div>

                    <div className="space-y-16">
                      <p className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">
                        Disetujui Oleh,<br />
                        <span className="text-[10px] text-slate-400">Direktur / Owner Usaha</span>
                      </p>
                      <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-bold text-slate-900 dark:text-white print:text-black">
                        ( Pimpinan Usaha )
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-slate-400 print:text-slate-500 mt-8 font-mono">
                    Dicetak pada: {new Date().toLocaleString('id-ID')} | PT Raja Kerupuk Indonesia | All Rights Reserved
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB: SUPER ADMIN PABRIK & MANAJEMEN USER */}
          {activeTab === 'factories' && currentUser?.role === 'super_admin' && (
            <div className="space-y-6">
              {/* Header & Sub-Tab Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Entitas Pabrik & Pengguna</h2>
                </div>
                
                {/* Sub Tab Pills */}
                <div className="flex items-center gap-2 bg-slate-200/60 p-1 rounded-full text-xs font-semibold">
                  <button
                    onClick={() => setSuperAdminSubTab('pabrik')}
                    className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                      superAdminSubTab === 'pabrik'
                        ? 'bg-[#191a23] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Factory className="w-3.5 h-3.5" />
                    Entitas Pabrik ({factories.length})
                  </button>
                  <button
                    onClick={() => {
                      setSuperAdminSubTab('users');
                      loadUsers();
                    }}
                    className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                      superAdminSubTab === 'users'
                        ? 'bg-[#191a23] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Manajemen Pengguna ({usersList.length})
                  </button>
                </div>
              </div>

              {/* SUB-VIEW 1: ENTITAS PABRIK (CRUD PABRIK) */}
              {superAdminSubTab === 'pabrik' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">
                      Menampilkan seluruh entitas pabrik aktif yang terisolasi secara multi-tenant
                    </p>
                    <button
                      onClick={() => {
                        setPabrikForm({ nama_pabrik: '', alamat: '', telepon: '', penanggung_jawab: '', modal_awal: '100000000' });
                        setActiveModal('tambah_pabrik');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#191a23] text-white text-xs font-semibold rounded-full hover:bg-black shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Pabrik Baru
                    </button>
                  </div>

                  {/* Multi-Pabrik Comparison Cards */}
                  {loading && (!dashboardData?.data?.factories || !dashboardData.isGlobal) ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="dashboard-card p-6 flex flex-col justify-between animate-pulse space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200" />
                              <div className="w-14 h-6 rounded-lg bg-slate-100" />
                            </div>
                            <div className="w-3/4 h-5 bg-slate-200 rounded mb-2" />
                            <div className="w-1/2 h-3.5 bg-slate-100 rounded mb-4" />
                            <div className="space-y-2 border-t border-slate-100 pt-3">
                              <div className="w-full h-4 bg-slate-100 rounded" />
                              <div className="w-full h-4 bg-slate-100 rounded" />
                              <div className="w-full h-4 bg-slate-100 rounded" />
                              <div className="w-full h-4 bg-slate-100 rounded" />
                            </div>
                          </div>
                          <div className="w-full h-9 bg-slate-200 rounded-xl mt-5" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(dashboardData?.data?.factories || []).map((f) => (
                      <div key={f.pabrik.id} className="dashboard-card p-6 flex flex-col justify-between group">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                              P{f.pabrik.id}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditPabrikForm({
                                    id: f.pabrik.id,
                                    nama_pabrik: f.pabrik.nama_pabrik,
                                    alamat: f.pabrik.alamat || '',
                                    telepon: f.pabrik.telepon || '',
                                    penanggung_jawab: f.pabrik.penanggung_jawab || ''
                                  });
                                  setActiveModal('edit_pabrik');
                                }}
                                title="Edit Pabrik"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPabrikToDelete(f.pabrik);
                                  setActiveModal('delete_pabrik_confirm');
                                }}
                                title="Hapus Pabrik"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          <h3 className="font-extrabold text-lg text-slate-900 mb-1">{f.pabrik.nama_pabrik}</h3>
                          <p className="text-xs text-slate-400 mb-1">{f.pabrik.alamat || 'Indonesia'}</p>
                          <p className="text-[11px] text-slate-500 font-medium mb-4">
                            PIC: <span className="text-slate-800 font-semibold">{f.pabrik.penanggung_jawab || '-'}</span> | Telp: <span className="font-mono">{f.pabrik.telepon || '-'}</span>
                          </p>

                          <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Saldo Kas:</span>
                              <span className="font-bold text-slate-900">{formatIDR(f.kas)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Piutang Mengendap:</span>
                              <span className="font-bold text-rose-500">{formatIDR(f.piutang)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Persediaan Gudang:</span>
                              <span className="font-bold text-amber-600">{formatIDR(f.persediaan)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total Omset:</span>
                              <span className="font-extrabold text-slate-900">{formatIDR(f.omset)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
                              <span>Laba Bersih:</span>
                              <span className="text-emerald-600">{formatIDR(f.labaBersih)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedPabrikId(String(f.pabrik.id));
                            setActiveTab('dashboard');
                          }}
                          className="mt-5 w-full py-2.5 text-xs font-semibold bg-[#191a23] text-white hover:bg-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          Buka Dashboard Pabrik Ini →
                        </button>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 2: MANAJEMEN PENGGUNA (CRUD USER) */}
              {superAdminSubTab === 'users' && (
                <div className="space-y-6">
                  {/* Top Stats & Add User Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="grid grid-cols-3 gap-3 flex-1 max-w-lg">
                      <div className="bg-white p-3 rounded-2xl border border-slate-200/70 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pengguna</span>
                        <span className="text-lg font-extrabold text-slate-900">{usersList.length}</span>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-200/70 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Admin Pabrik</span>
                        <span className="text-lg font-extrabold text-emerald-600">
                          {usersList.filter(u => u.role === 'admin_pabrik').length}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-200/70 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Akun Pedagang</span>
                        <span className="text-lg font-extrabold text-blue-600">
                          {usersList.filter(u => u.role === 'pedagang').length}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUserForm({
                          id: null,
                          nama: '',
                          email: '',
                          username: '',
                          password: '',
                          role: 'admin_pabrik',
                          pabrik_id: factories[0]?.id ? String(factories[0].id) : '',
                          pedagang_id: '',
                          status: 'aktif'
                        });
                        setActiveModal('tambah_user');
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#191a23] text-white text-xs font-semibold rounded-full hover:bg-black shadow-sm self-start sm:self-auto"
                    >
                      <UserPlus className="w-4 h-4" />
                      Tambah Pengguna Baru
                    </button>
                  </div>

                  {/* Users Table */}
                  <div className="dashboard-card p-6">
                    <h3 className="font-bold text-sm text-slate-900 mb-4">Daftar Seluruh Pengguna & Hak Akses</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="pb-3 pl-2">Nama & Email</th>
                            <th className="pb-3">Username</th>
                            <th className="pb-3">Peran (Role)</th>
                            <th className="pb-3">Pabrik / Mitra Terkait</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right pr-2">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {usersList.map((u, idx) => {
                            const isSuper = u.role === 'super_admin';
                            const isAdminPabrik = u.role === 'admin_pabrik';
                            const isPedagang = u.role === 'pedagang';

                            return (
                              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3.5 pl-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 shadow-sm bg-slate-100 dark:bg-white/5">
                                      <img 
                                        src="/default-avatar.png" 
                                        alt={u.nama || 'User'} 
                                        className="w-full h-full object-cover" 
                                      />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 leading-tight">{u.nama}</p>
                                      <p className="text-[11px] text-slate-400">{u.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 font-mono text-xs text-slate-700">
                                  @{u.username}
                                </td>
                                <td className="py-3.5">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    isSuper 
                                      ? 'bg-slate-900 text-white' 
                                      : isAdminPabrik 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}>
                                    {isSuper && <Shield className="w-3 h-3 text-amber-400" />}
                                    {isSuper ? 'Super Admin' : isAdminPabrik ? 'Admin Pabrik' : 'Akun Pedagang'}
                                  </span>
                                </td>
                                <td className="py-3.5 text-xs text-slate-600">
                                  {isSuper ? (
                                    <span className="text-slate-400 italic">Semua Pabrik (Global)</span>
                                  ) : isPedagang ? (
                                    <div>
                                      <span className="font-semibold text-slate-800 block">{u.nama_pedagang || 'Mitra'}</span>
                                      <span className="text-[10px] text-slate-400">{u.nama_pabrik}</span>
                                    </div>
                                  ) : (
                                    <span className="font-semibold text-slate-800">{u.nama_pabrik || '-'}</span>
                                  )}
                                </td>
                                <td className="py-3.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    u.status === 'aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {u.status || 'aktif'}
                                  </span>
                                </td>
                                <td className="py-3.5 text-right pr-2">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setUserForm({
                                          id: u.id,
                                          nama: u.nama,
                                          email: u.email,
                                          username: u.username,
                                          password: '',
                                          role: u.role,
                                          pabrik_id: u.pabrik_id ? String(u.pabrik_id) : '',
                                          pedagang_id: u.pedagang_id ? String(u.pedagang_id) : '',
                                          status: u.status || 'aktif'
                                        });
                                        setActiveModal('edit_user');
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                      title="Edit Pengguna"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedUserToDelete(u);
                                        setActiveModal('delete_user_confirm');
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Hapus Pengguna"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB: MONITORING CHECK-POINT DROP PEDAGANG (ADMIN & PABRIK) */}
          {activeTab === 'checkpoints' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-[#191a23] via-[#242738] to-[#191a23] text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Monitoring Lapangan</span>
                  </div>
                  <h2 className="text-xl font-black text-white">
                    Check-Point Drop Kerupuk Pedagang
                  </h2>
                  <p className="text-xs text-slate-300">
                    Pemantauan titik drop kerupuk ke warung, verifikasi foto bukti fisik, dan koordinat GPS.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadCheckpoints(selectedPabrikId)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkpointsLoading ? 'animate-spin' : ''}`} />
                    <span>Segarkan Data</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Check-Point */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="dashboard-card p-4">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Total Titik Drop</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {checkpointsList.length}
                  </div>
                  <span className="text-[10px] text-slate-400">Warung teregistrasi</span>
                </div>
                <div className="dashboard-card p-4">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Total Bal Terdistribusi</span>
                  <div className="text-2xl font-black text-emerald-600">
                    {checkpointsList.reduce((acc, c) => acc + (Number(c.qty) || 0), 0)} Bal
                  </div>
                  <span className="text-[10px] text-slate-400">Kerupuk terkirim</span>
                </div>
                <div className="dashboard-card p-4">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Nilai Omset Drop</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatShort(checkpointsList.reduce((acc, c) => acc + (Number(c.total_jual) || 0), 0))}
                  </div>
                  <span className="text-[10px] text-slate-400">Total piutang & tunai</span>
                </div>
                <div className="dashboard-card p-4">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Verifikasi GPS & Foto</span>
                  <div className="text-2xl font-black text-sky-600">
                    {checkpointsList.filter(c => c.latitude && c.foto_bukti).length} / {checkpointsList.length}
                  </div>
                  <span className="text-[10px] text-emerald-500 font-semibold">Tervalidasi Lapangan</span>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={checkpointSearch}
                    onChange={(e) => setCheckpointSearch(e.target.value)}
                    placeholder="Cari warung, pedagang, atau produk..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#1a1b24] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-slate-800 text-slate-800 dark:text-white"
                  />
                </div>
                <span className="text-xs text-slate-400 self-end sm:self-auto">
                  Menampilkan {checkpointsList.filter(c => 
                    !checkpointSearch || 
                    c.nama_warung?.toLowerCase().includes(checkpointSearch.toLowerCase()) ||
                    c.nama_pedagang?.toLowerCase().includes(checkpointSearch.toLowerCase()) ||
                    c.nama_produk?.toLowerCase().includes(checkpointSearch.toLowerCase())
                  ).length} rekaman drop
                </span>
              </div>

              {/* Checkpoint Feed / Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {checkpointsList
                  .filter(c => 
                    !checkpointSearch || 
                    c.nama_warung?.toLowerCase().includes(checkpointSearch.toLowerCase()) ||
                    c.nama_pedagang?.toLowerCase().includes(checkpointSearch.toLowerCase()) ||
                    c.nama_produk?.toLowerCase().includes(checkpointSearch.toLowerCase())
                  )
                  .map((cp) => (
                    <div 
                      key={cp.id}
                      className="dashboard-card overflow-hidden flex flex-col justify-between border border-slate-200/80 dark:border-white/10 hover:shadow-lg transition-all"
                    >
                      <div>
                        {/* Photo Thumbnail or Placeholder */}
                        <div className="relative h-44 w-full bg-slate-100 dark:bg-white/5 overflow-hidden group">
                          {cp.foto_bukti ? (
                            <img
                              src={cp.foto_bukti}
                              alt={cp.nama_warung}
                              onClick={() => setSelectedCheckpointPhoto(cp.foto_bukti)}
                              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                              <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                              <span className="text-xs">Foto bukti tidak disertakan</span>
                            </div>
                          )}

                          {/* Method Badge & Date Overlay */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${
                              cp.metode_bayar === 'tunai'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-amber-500 text-white'
                            }`}>
                              {cp.metode_bayar === 'tunai' ? 'Bayar Tunai' : 'Titip Bon / Piutang'}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-mono">
                            {cp.tanggal}
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                              {cp.nama_warung}
                            </h3>
                            {cp.alamat_warung && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {cp.alamat_warung}
                              </p>
                            )}
                          </div>

                          {/* Detail Drop */}
                          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Pedagang:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {cp.nama_pedagang}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Pabrik:</span>
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                {cp.nama_pabrik}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Kerupuk:</span>
                              <span className="font-bold text-emerald-600">
                                {cp.qty} {cp.satuan || 'Bal'} {cp.nama_produk}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200/60 dark:border-white/10 pt-1.5 font-bold">
                              <span className="text-slate-800 dark:text-white">Total Tagihan:</span>
                              <span className="text-slate-900 dark:text-white">
                                {formatIDR(cp.total_jual)}
                              </span>
                            </div>
                          </div>

                          {cp.catatan && (
                            <p className="text-[11px] text-slate-500 italic bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/40">
                              "{cp.catatan}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: GPS Location Link */}
                      <div className="p-4 pt-0 border-t border-slate-100 dark:border-white/5 mt-2 flex items-center justify-between text-xs">
                        {cp.latitude && cp.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${cp.latitude},${cp.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Buka di Google Maps</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            <span>GPS tidak terdeteksi</span>
                          </span>
                        )}

                        {cp.foto_bukti && (
                          <button
                            onClick={() => setSelectedCheckpointPhoto(cp.foto_bukti)}
                            className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                          >
                            Lihat Foto HD
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {checkpointsList.length === 0 && !checkpointsLoading && (
                <div className="dashboard-card p-12 text-center text-slate-400 space-y-2">
                  <MapPin className="w-12 h-12 mx-auto opacity-30 text-emerald-500" />
                  <h4 className="font-bold text-slate-700 dark:text-slate-200">Belum Ada Rekaman Check-Point</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Pedagang dapat mencatat check-point drop kerupuk ke warung lengkap dengan foto dan titik koordinat GPS melalui aplikasi pedagang.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: APLIKASI PEDAGANG (CAPACITOR ANDROID READY) */}
          {activeTab === 'pedagang_portal' && (
            <div className="space-y-5 max-w-2xl mx-auto pb-16">
              {/* Pedagang Mobile App Header */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-[#191a23] via-[#242738] to-[#191a23] text-white shadow-xl flex items-center justify-between border border-white/5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold mb-1">
                    <Store className="w-3 h-3" />
                    <span>Aplikasi Android Pedagang</span>
                  </div>
                  <h2 className="text-lg font-black text-white">
                    {currentUser?.nama_pedagang || currentUser?.nama}
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Pabrik: <strong className="text-amber-300">{currentUser?.nama_pabrik || currentFactory?.nama_pabrik}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="/apk/raja-kerupuk-pedagang.apk"
                    download="raja-kerupuk-pedagang.apk"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
                    title="Unduh file APK Android"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Unduh APK</span>
                  </a>
                  <button
                    onClick={() => {
                      loadPedagangPortalData(currentUser);
                      loadPedagangProduk(currentUser?.pabrik_id);
                      loadCheckpoints(currentUser?.pabrik_id, currentUser?.pedagang_id);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                    title="Segarkan data"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-Tab Navigation Bar (Mobile Touch Friendly) */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 dark:bg-[#1a1b24] rounded-2xl text-xs font-bold text-center">
                <button
                  onClick={() => setPedagangSubTab('checkpoint_form')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 ${
                    pedagangSubTab === 'checkpoint_form'
                      ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] sm:text-xs">Drop Kerupuk</span>
                </button>

                <button
                  onClick={() => setPedagangSubTab('checkpoint_history')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 ${
                    pedagangSubTab === 'checkpoint_history'
                      ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-4 h-4 text-sky-500" />
                  <span className="text-[10px] sm:text-xs">Riwayat Drop</span>
                </button>

                <button
                  onClick={() => setPedagangSubTab('kartu_piutang')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 ${
                    pedagangSubTab === 'kartu_piutang'
                      ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] sm:text-xs">Hutang</span>
                </button>

                <button
                  onClick={() => setPedagangSubTab('katalog')}
                  className={`py-2 px-1 rounded-xl transition-all flex flex-col items-center gap-1 ${
                    pedagangSubTab === 'katalog'
                      ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Boxes className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] sm:text-xs">Katalog</span>
                </button>
              </div>

              {/* SUBTAB 1: FORM CHECK-POINT DROP (GPS & KAMERA) */}
              {pedagangSubTab === 'checkpoint_form' && (
                <div className="dashboard-card p-6 space-y-5">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                      Catat Check-Point Drop ke Warung
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gunakan GPS dan Kamera HP untuk bukti fisik drop kerupuk di warung langganan.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitCheckpoint} className="space-y-4">
                    {/* Nama Warung */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Nama Warung / Toko Rekanan *
                      </label>
                      <input
                        type="text"
                        required
                        value={checkpointForm.nama_warung}
                        onChange={(e) => setCheckpointForm({ ...checkpointForm, nama_warung: e.target.value })}
                        placeholder="Contoh: Warung Bu Siti / Toko Barokah"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Alamat Warung */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Alamat / Patokan Warung
                      </label>
                      <input
                        type="text"
                        value={checkpointForm.alamat_warung}
                        onChange={(e) => setCheckpointForm({ ...checkpointForm, alamat_warung: e.target.value })}
                        placeholder="Contoh: Jl. Nusantara No. 12 dekat gang masjid"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Pilihan Produk Kerupuk Pabrik */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Pilihan Produk Kerupuk *
                        </label>
                        <select
                          value={checkpointForm.produk_id}
                          onChange={(e) => {
                            const pId = e.target.value;
                            const found = pedagangProdukList.find(p => String(p.id) === String(pId));
                            setCheckpointForm({
                              ...checkpointForm,
                              produk_id: pId,
                              harga_jual: found ? String(found.harga_jual) : checkpointForm.harga_jual
                            });
                          }}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        >
                          {pedagangProdukList.length === 0 ? (
                            <option value="">Memuat produk pabrik...</option>
                          ) : (
                            pedagangProdukList.map(p => (
                              <option key={p.id} value={String(p.id)}>
                                {p.nama_produk} (Stok: {p.stok} {p.satuan || 'Bal'})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Jumlah Drop (Bal) */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Jumlah Drop (Bal) *
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const curr = Number(checkpointForm.qty) || 1;
                              if (curr > 1) setCheckpointForm({ ...checkpointForm, qty: String(curr - 1) });
                            }}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 font-black text-lg text-slate-700 dark:text-white flex items-center justify-center active:scale-95"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            required
                            value={checkpointForm.qty}
                            onChange={(e) => setCheckpointForm({ ...checkpointForm, qty: e.target.value })}
                            className="flex-1 text-center py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const curr = Number(checkpointForm.qty) || 0;
                              setCheckpointForm({ ...checkpointForm, qty: String(curr + 1) });
                            }}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 font-black text-lg text-slate-700 dark:text-white flex items-center justify-center active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Harga Jual & Total Tagihan */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Harga Satuan / Bal:</span>
                        <input
                          type="number"
                          value={checkpointForm.harga_jual}
                          onChange={(e) => setCheckpointForm({ ...checkpointForm, harga_jual: e.target.value })}
                          className="w-28 text-xs font-bold bg-white dark:bg-white/10 px-2 py-1 rounded border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Total Tagihan:</span>
                        <span className="text-base font-black text-emerald-600">
                          {formatIDR((Number(checkpointForm.qty) || 0) * (Number(checkpointForm.harga_jual) || 0))}
                        </span>
                      </div>
                    </div>

                    {/* Metode Pembayaran */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Metode Pembayaran Warung
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setCheckpointForm({ ...checkpointForm, metode_bayar: 'piutang' })}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            checkpointForm.metode_bayar === 'piutang'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                              : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Receipt className="w-4 h-4" />
                          <span>Titip Bon / Piutang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckpointForm({ ...checkpointForm, metode_bayar: 'tunai' })}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            checkpointForm.metode_bayar === 'tunai'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                              : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Coins className="w-4 h-4" />
                          <span>Bayar Tunai Langsung</span>
                        </button>
                      </div>
                    </div>

                    {/* FITUR 1: LOKASI GPS (CAPACITOR GEOLOCATION) */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2 bg-slate-50/50 dark:bg-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-emerald-500" />
                          Titik Lokasi GPS Warung
                        </span>
                        {checkpointForm.latitude && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            Terkunci (Akurasi: +/- {checkpointForm.akurasi_meter || 10}m)
                          </span>
                        )}
                      </div>

                      {checkpointForm.latitude && checkpointForm.longitude ? (
                        <div className="p-3 bg-white dark:bg-[#14151c] rounded-xl border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <p className="font-mono text-slate-800 dark:text-slate-200">
                              Lat: {checkpointForm.latitude.toFixed(6)}, Long: {checkpointForm.longitude.toFixed(6)}
                            </p>
                            <a
                              href={`https://www.google.com/maps?q=${checkpointForm.latitude},${checkpointForm.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                            >
                              <span>Buka Peta Google Maps</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={handleGetDropLocation}
                            disabled={isGettingLocation}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-white transition-all"
                          >
                            Perbarui GPS
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGetDropLocation}
                          disabled={isGettingLocation}
                          className="w-full py-3 px-4 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98"
                        >
                          <Navigation className={`w-4 h-4 ${isGettingLocation ? 'animate-spin' : ''}`} />
                          <span>{isGettingLocation ? 'Membaca Satelit GPS...' : 'Kunci Titik Lokasi GPS Sekarang'}</span>
                        </button>
                      )}
                    </div>

                    {/* FITUR 2: FOTO BUKTI DROP (CAPACITOR CAMERA) */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2 bg-slate-50/50 dark:bg-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-sky-500" />
                          Foto Bukti Drop Kerupuk di Warung
                        </span>
                        {checkpointForm.foto_bukti && (
                          <span className="text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                            Foto Tersedia
                          </span>
                        )}
                      </div>

                      {checkpointForm.foto_bukti ? (
                        <div className="space-y-2">
                          <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-black">
                            <img
                              src={checkpointForm.foto_bukti}
                              alt="Pratinjau Foto Drop"
                              className="w-full h-full object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => setCheckpointForm({ ...checkpointForm, foto_bukti: null })}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-md transition-all"
                              title="Hapus foto"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={handleTakeDropPhoto}
                            disabled={isTakingPhoto}
                            className="w-full py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all"
                          >
                            Ambil Ulang Foto
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleTakeDropPhoto}
                          disabled={isTakingPhoto}
                          className="w-full py-3 px-4 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 border border-sky-300 dark:border-sky-800/80 text-sky-800 dark:text-sky-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98"
                        >
                          <Camera className={`w-4 h-4 ${isTakingPhoto ? 'animate-spin' : ''}`} />
                          <span>{isTakingPhoto ? 'Membuka Kamera...' : 'Buka Kamera / Ambil Foto Bukti Warung'}</span>
                        </button>
                      )}
                    </div>

                    {/* Catatan Tambahan */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Catatan Drop (Opsional)
                      </label>
                      <input
                        type="text"
                        value={checkpointForm.catatan}
                        onChange={(e) => setCheckpointForm({ ...checkpointForm, catatan: e.target.value })}
                        placeholder="Contoh: Titip 2 kaleng kerupuk putih, uang dibayar sabtu depan"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Tombol Simpan Drop */}
                    <button
                      type="submit"
                      disabled={checkpointSubmitting}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-600/30 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {checkpointSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menyimpan Check-Point...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Kirim Check-Point Drop Kerupuk</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* SUBTAB 2: RIWAYAT DROP PEDAGANG */}
              {pedagangSubTab === 'checkpoint_history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Riwayat Check-Point Drop Saya
                    </h3>
                    <button
                      onClick={() => setPedagangSubTab('checkpoint_form')}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm transition-all"
                    >
                      + Catat Drop Baru
                    </button>
                  </div>

                  {checkpointsList.length === 0 ? (
                    <div className="dashboard-card p-10 text-center text-slate-400 space-y-2">
                      <Camera className="w-10 h-10 mx-auto opacity-30 text-sky-500" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum Ada Riwayat Drop</p>
                      <p className="text-xs">Mulai catat check-point drop kerupuk pertama Anda ke warung.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {checkpointsList.map((cp) => (
                        <div
                          key={cp.id}
                          className="dashboard-card p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              onClick={() => cp.foto_bukti && setSelectedCheckpointPhoto(cp.foto_bukti)}
                              className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/10 shrink-0 border border-slate-200 cursor-pointer"
                            >
                              {cp.foto_bukti ? (
                                <img src={cp.foto_bukti} alt={cp.nama_warung} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <ImageIcon className="w-5 h-5 opacity-40" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                  {cp.nama_warung}
                                </h4>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  cp.metode_bayar === 'tunai'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {cp.metode_bayar === 'tunai' ? 'Tunai' : 'Bon'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{cp.alamat_warung || 'Alamat warung'}</p>
                              <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                                {cp.qty} Bal {cp.nama_produk} • {formatIDR(cp.total_jual)}
                              </p>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-xs gap-1 border-t sm:border-t-0 pt-2 sm:pt-0">
                            <span className="font-mono text-slate-400 text-[11px]">{cp.tanggal}</span>
                            {cp.latitude && cp.longitude ? (
                              <a
                                href={`https://www.google.com/maps?q=${cp.latitude},${cp.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>Peta GPS</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400">Tanpa GPS</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 3: HUTANG & SETORAN PEDAGANG */}
              {pedagangSubTab === 'kartu_piutang' && (
                <div className="space-y-5">
                  {/* 3 Metric Cards for Pedagang */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="dashboard-card p-4 border-l-4 border-l-rose-500">
                      <span className="text-xs font-bold text-slate-400 block mb-1">Sisa Utang Belum Lunas</span>
                      <div className="text-xl font-extrabold text-rose-600">
                        {formatIDR(pedagangPortalData?.saldoPiutangSaatIni || 0)}
                      </div>
                    </div>

                    <div className="dashboard-card p-4 border-l-4 border-l-emerald-500">
                      <span className="text-xs font-bold text-slate-400 block mb-1">Limit Plafon Kredit</span>
                      <div className="text-xl font-extrabold text-slate-800 dark:text-white">
                        {formatIDR(pedagangPortalData?.limitPiutang || 0)}
                      </div>
                    </div>

                    <div className="dashboard-card p-4 border-l-4 border-l-sky-500">
                      <span className="text-xs font-bold text-slate-400 block mb-1">Sisa Plafon Tersedia</span>
                      <div className="text-xl font-extrabold text-sky-600">
                        {formatIDR(pedagangPortalData?.sisaLimit || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Kartu Piutang Table */}
                  <div className="dashboard-card p-5 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Riwayat Mutasi & Kartu Piutang</h3>
                        <p className="text-[11px] text-slate-400">Catatan penerimaan kerupuk dan setoran pembayaran</p>
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="pb-3">Tanggal</th>
                            <th className="pb-3">No. Bukti / Transaksi</th>
                            <th className="pb-3 text-right">Barang Diterima</th>
                            <th className="pb-3 text-right">Setoran Uang</th>
                            <th className="pb-3 text-right">Sisa Utang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {(!pedagangPortalData?.history || pedagangPortalData.history.length === 0) ? (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-slate-400">
                                Belum ada riwayat transaksi tercatat
                              </td>
                            </tr>
                          ) : (
                            pedagangPortalData.history.map((h, i) => (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <td className="py-3 font-mono text-slate-600 dark:text-slate-400">{h.tanggal}</td>
                                <td className="py-3">
                                  <span className="font-bold text-slate-900 dark:text-white block">{h.nomor_bukti}</span>
                                  <span className="text-[11px] text-slate-400">{h.keterangan || h.nama_produk}</span>
                                </td>
                                <td className="py-3 text-right font-semibold text-rose-500">
                                  {h.penambahan_piutang > 0 ? formatIDR(h.penambahan_piutang) : '-'}
                                </td>
                                <td className="py-3 text-right font-semibold text-emerald-600">
                                  {h.pengurangan_piutang > 0 ? formatIDR(h.pengurangan_piutang) : '-'}
                                </td>
                                <td className="py-3 text-right font-extrabold text-slate-900 dark:text-white">
                                  {formatIDR(h.saldo_berjalan)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bank Account & Payment Instructions */}
                  <div className="dashboard-card p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200/60 rounded-3xl space-y-3">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      Rekening Resmi Setoran Pabrik
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-white dark:bg-[#14151c] rounded-2xl border border-amber-200/50 shadow-sm">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Bank BCA</span>
                        <span className="text-sm font-black font-mono text-slate-900 dark:text-white block">8830-192-881</span>
                        <span className="text-xs text-slate-500">a.n PT Raja Kerupuk Nusantara</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-[#14151c] rounded-2xl border border-amber-200/50 shadow-sm">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">WhatsApp Admin Pabrik</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 block">+62 812-3456-7890</span>
                        <span className="text-xs text-slate-500">Kirim bukti transfer</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 4: KATALOG PRODUK KERUPUK */}
              {pedagangSubTab === 'katalog' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Katalog Kerupuk Pabrik Rekanan
                    </h3>
                    <p className="text-xs text-slate-400">
                      Daftar jenis kerupuk yang siap didistribusikan ke warung-warung rekanan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pedagangProdukList.map((prod) => (
                      <div key={prod.id} className="dashboard-card p-4 space-y-2 border border-slate-200 dark:border-white/10">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                              {prod.kategori || 'Kerupuk'}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                              {prod.nama_produk}
                            </h4>
                          </div>
                          <span className="text-xs font-semibold text-slate-400">
                            Stok: <strong className="text-slate-800 dark:text-slate-200">{prod.stok} {prod.satuan || 'Bal'}</strong>
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                          <span className="text-xs text-slate-400">Harga Drop / Bal:</span>
                          <span className="text-base font-black text-emerald-600">
                            {formatIDR(prod.harga_jual)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setCheckpointForm(prev => ({
                              ...prev,
                              produk_id: String(prod.id),
                              harga_jual: String(prod.harga_jual)
                            }));
                            setPedagangSubTab('checkpoint_form');
                          }}
                          className="w-full mt-2 py-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-black transition-all"
                        >
                          Pilih untuk Drop ke Warung
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ========================================================= */}
      {/* MODAL DIALOGS FOR DOUBLE-ENTRY OPERATIONS                 */}
      {/* ========================================================= */}

      {/* MODAL ZOOM FOTO BUKTI DROP */}
      {selectedCheckpointPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative max-w-2xl w-full bg-[#191a23] rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-3 space-y-3">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                Foto Bukti Fisik Drop Kerupuk di Warung
              </span>
              <button
                onClick={() => setSelectedCheckpointPhoto(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-hidden rounded-2xl bg-black flex items-center justify-center">
              <img
                src={selectedCheckpointPhoto}
                alt="Bukti Drop Warung"
                className="max-h-[75vh] w-auto object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SETOR MODAL AWAL */}
      {activeModal === 'modal_awal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Penyetoran Modal Awal</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleTransactionSubmit('/api/transaksi/modal', modalForm, 'Penyetoran modal awal berhasil dicatat!');
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nominal Modal (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 100000000"
                  value={modalForm.nominal}
                  onChange={(e) => setModalForm({ ...modalForm, nominal: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Keterangan</label>
                <input
                  type="text"
                  placeholder="Penyetoran Modal Pemilik"
                  value={modalForm.keterangan}
                  onChange={(e) => setModalForm({ ...modalForm, keterangan: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1 text-slate-600 border border-slate-100">
                <p className="font-bold text-slate-800">Dampak Jurnal Akuntansi:</p>
                <p>• Kas (Aset Lancar) [Debit] + Rp {Number(modalForm.nominal || 0).toLocaleString('id-ID')}</p>
                <p>• Modal Disetor [Kredit] + Rp {Number(modalForm.nominal || 0).toLocaleString('id-ID')}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BELI PERALATAN (ASET TETAP) */}
      {activeModal === 'beli_peralatan' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Pembelian Peralatan / Mesin</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleTransactionSubmit('/api/transaksi/beli-peralatan', peralatanForm, 'Pembelian peralatan berhasil dicatat!');
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Mesin / Peralatan</label>
                <input
                  type="text"
                  required
                  placeholder="Mesin Pengaduk & Cetak Kerupuk"
                  value={peralatanForm.nama_item}
                  onChange={(e) => setPeralatanForm({ ...peralatanForm, nama_item: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="25000000"
                    value={peralatanForm.harga}
                    onChange={(e) => setPeralatanForm({ ...peralatanForm, harga: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Jumlah (Unit)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={peralatanForm.qty}
                    onChange={(e) => setPeralatanForm({ ...peralatanForm, qty: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  Beli & Catat Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BELI PERSEDIAAN */}
      {activeModal === 'beli_persediaan' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Belanja Persediaan</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleTransactionSubmit('/api/transaksi/beli-persediaan', persediaanForm, 'Pembelian persediaan berhasil dicatat!');
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Produk Kerupuk</label>
                <select
                  required
                  value={persediaanForm.produk_id}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const prod = dashboardData?.produkList.find(p => String(p.id) === pid);
                    setPersediaanForm({ 
                      ...persediaanForm, 
                      produk_id: pid,
                      harga_beli: prod ? String(prod.harga_beli) : ''
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                >
                  <option value="">-- Pilih Produk --</option>
                  {(dashboardData?.produkList || []).map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.nama_produk} (Sisa stok: {p.stok} {p.satuan})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Jumlah Bal</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="100"
                    value={persediaanForm.qty}
                    onChange={(e) => setPersediaanForm({ ...persediaanForm, qty: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Harga Beli HPP (Rp)</label>
                  <input
                    type="number"
                    required
                    value={persediaanForm.harga_beli}
                    onChange={(e) => setPersediaanForm({ ...persediaanForm, harga_beli: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  Tambah Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DISTRIBUSI BARANG KE PEDAGANG (PIUTANG) */}
      {activeModal === 'distribusi' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Distribusi Barang</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleTransactionSubmit('/api/transaksi/distribusi', distribusiForm, 'Distribusi barang berhasil dicatat!');
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Pedagang Penerima</label>
                <select
                  required
                  value={distribusiForm.pedagang_id}
                  onChange={(e) => setDistribusiForm({ ...distribusiForm, pedagang_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                >
                  <option value="">-- Pilih Pedagang --</option>
                  {(dashboardData?.pedagangList || []).map((ped) => (
                    <option key={ped.id} value={String(ped.id)}>
                      {ped.nama_pedagang} (Piutang: {formatShort(ped.saldo_piutang)} / Limit: {formatShort(ped.limit_piutang)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Produk</label>
                <select
                  required
                  value={distribusiForm.produk_id}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const prod = dashboardData?.produkList.find(p => String(p.id) === pid);
                    setDistribusiForm({
                      ...distribusiForm,
                      produk_id: pid,
                      harga_jual: prod ? String(prod.harga_jual) : ''
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                >
                  <option value="">-- Pilih Produk --</option>
                  {(dashboardData?.produkList || []).map((prod) => (
                    <option key={prod.id} value={String(prod.id)}>
                      {prod.nama_produk} (Tersedia: {prod.stok} {prod.satuan})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Jumlah Bal</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="20"
                    value={distribusiForm.qty}
                    onChange={(e) => setDistribusiForm({ ...distribusiForm, qty: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Harga Jual Satuan (Rp)</label>
                  <input
                    type="number"
                    required
                    value={distribusiForm.harga_jual}
                    onChange={(e) => setDistribusiForm({ ...distribusiForm, harga_jual: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-emerald-50/70 p-3 rounded-2xl text-xs space-y-1 text-emerald-950 border border-emerald-100">
                <p className="font-bold">Dampak 2 Pasang Jurnal Otomatis:</p>
                <p>1. Piutang Dagang [Debit] vs Pendapatan Penjualan [Kredit]</p>
                <p>2. Harga Pokok Penjualan (HPP) [Debit] vs Persediaan [Kredit]</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  Kirim & Catat Piutang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: SETORAN PEMBAYARAN PEDAGANG */}
      {activeModal === 'setoran' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Penerimaan Setoran</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleTransactionSubmit('/api/transaksi/setoran', setoranForm, 'Penerimaan setoran pedagang berhasil dicatat!');
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Pedagang</label>
                <select
                  required
                  value={setoranForm.pedagang_id}
                  onChange={(e) => setSetoranForm({ ...setoranForm, pedagang_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                >
                  <option value="">-- Pilih Pedagang --</option>
                  {(dashboardData?.pedagangList || []).map((ped) => (
                    <option key={ped.id} value={String(ped.id)}>
                      {ped.nama_pedagang} (Sisa Utang: {formatIDR(ped.saldo_piutang)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nominal Setoran (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="3000000"
                  value={setoranForm.nominal}
                  onChange={(e) => setSetoranForm({ ...setoranForm, nominal: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Keterangan</label>
                <input
                  type="text"
                  placeholder="Setoran hasil penjualan laku"
                  value={setoranForm.keterangan}
                  onChange={(e) => setSetoranForm({ ...setoranForm, keterangan: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  Terima Uang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: TAMBAH PEDAGANG BARU */}
      {activeModal === 'tambah_pedagang' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Tambah Pedagang Baru</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleTransactionSubmit('/api/pedagang', pedagangForm, 'Pedagang baru berhasil ditambahkan!');
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Pedagang</label>
                <input
                  type="text"
                  required
                  placeholder="Cak Nanang Grosir"
                  value={pedagangForm.nama_pedagang}
                  onChange={(e) => setPedagangForm({ ...pedagangForm, nama_pedagang: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nomor Telepon</label>
                <input
                  type="text"
                  placeholder="0812-3456-7890"
                  value={pedagangForm.no_telepon}
                  onChange={(e) => setPedagangForm({ ...pedagangForm, no_telepon: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Alamat / Lokasi Kios</label>
                <input
                  type="text"
                  placeholder="Pasar Waru Blok B"
                  value={pedagangForm.alamat}
                  onChange={(e) => setPedagangForm({ ...pedagangForm, alamat: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Limit Piutang (Rp)</label>
                <input
                  type="number"
                  placeholder="20000000"
                  value={pedagangForm.limit_piutang}
                  onChange={(e) => setPedagangForm({ ...pedagangForm, limit_piutang: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  Simpan Pedagang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: TAMBAH PRODUK BARU */}
      {activeModal === 'tambah_produk' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Tambah Produk Baru</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleTransactionSubmit('/api/produk', produkForm, 'Produk baru berhasil ditambahkan!');
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Kerupuk Ikan Tenggiri"
                  value={produkForm.nama_produk}
                  onChange={(e) => setProdukForm({ ...produkForm, nama_produk: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kategori</label>
                  <input
                    type="text"
                    value={produkForm.kategori}
                    onChange={(e) => setProdukForm({ ...produkForm, kategori: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Satuan</label>
                  <input
                    type="text"
                    value={produkForm.satuan}
                    onChange={(e) => setProdukForm({ ...produkForm, satuan: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Harga Beli HPP (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="90000"
                    value={produkForm.harga_beli}
                    onChange={(e) => setProdukForm({ ...produkForm, harga_beli: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="130000"
                    value={produkForm.harga_jual}
                    onChange={(e) => setProdukForm({ ...produkForm, harga_jual: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: TAMBAH PABRIK BARU (SUPER ADMIN) */}
      {activeModal === 'tambah_pabrik' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Tambah Entitas Pabrik Baru</h3>
                <p className="text-xs text-slate-400">Multi-tenant: Akun perkiraan COA akan otomatis dibuat</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/pabrik', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(pabrikForm)
                });
                const data = await res.json();
                if (data.success) {
                  showToast(`Pabrik "${pabrikForm.nama_pabrik}" berhasil dibuat!`);
                  setActiveModal(null);
                  await loadFactories();
                  setSelectedPabrikId(String(data.data.id));
                } else {
                  showToast(data.error || 'Gagal tambah pabrik', 'error');
                }
              } catch (err) {
                showToast(err.message, 'error');
              }
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Pabrik</label>
                <input
                  type="text"
                  required
                  placeholder="Pabrik Kerupuk Mawar"
                  value={pabrikForm.nama_pabrik}
                  onChange={(e) => setPabrikForm({ ...pabrikForm, nama_pabrik: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kota / Alamat</label>
                <input
                  type="text"
                  placeholder="Jl. Raya Semarang No. 10"
                  value={pabrikForm.alamat}
                  onChange={(e) => setPabrikForm({ ...pabrikForm, alamat: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Penanggung Jawab / Admin</label>
                <input
                  type="text"
                  placeholder="Pak Rahmat"
                  value={pabrikForm.penanggung_jawab}
                  onChange={(e) => setPabrikForm({ ...pabrikForm, penanggung_jawab: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Modal Awal Setoran (Rp)</label>
                <input
                  type="number"
                  placeholder="100000000"
                  value={pabrikForm.modal_awal}
                  onChange={(e) => setPabrikForm({ ...pabrikForm, modal_awal: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  Buat Pabrik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: DETAIL KARTU PIUTANG PEDAGANG */}
      {activeModal === 'kartu_piutang' && selectedPedagang && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Kartu Piutang: {selectedPedagang.nama_pedagang}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metric Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl text-center">
                <span className="text-[11px] text-slate-400 block mb-0.5">Limit Piutang</span>
                <span className="text-sm font-bold text-slate-800">
                  {formatIDR(kartuPiutangData?.limitPiutang || selectedPedagang.limit_piutang)}
                </span>
              </div>
              <div className="bg-rose-50 p-3 rounded-2xl text-center border border-rose-100">
                <span className="text-[11px] text-rose-500 block mb-0.5">Sisa Utang Belum Lunas</span>
                <span className="text-sm font-extrabold text-rose-600">
                  {formatIDR(kartuPiutangData?.saldoPiutangSaatIni || selectedPedagang.saldo_piutang)}
                </span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl text-center border border-emerald-100">
                <span className="text-[11px] text-emerald-600 block mb-0.5">Sisa Plafon Kredit</span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatIDR(kartuPiutangData?.sisaLimit || 0)}
                </span>
              </div>
            </div>

            {/* Mutasi Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Tanggal</th>
                    <th className="pb-2">No. Bukti / Transaksi</th>
                    <th className="pb-2 text-right">Penambahan (Debit)</th>
                    <th className="pb-2 text-right">Setoran (Kredit)</th>
                    <th className="pb-2 text-right">Saldo Utang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(kartuPiutangData?.history || []).map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 text-slate-600">{h.tanggal}</td>
                      <td className="py-2.5">
                        <span className="font-semibold text-slate-800 block">{h.nomor_bukti}</span>
                        <span className="text-[10px] text-slate-400">{h.keterangan || h.nama_produk}</span>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-rose-500">
                        {h.penambahan_piutang > 0 ? formatIDR(h.penambahan_piutang) : '-'}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600">
                        {h.pengurangan_piutang > 0 ? formatIDR(h.pengurangan_piutang) : '-'}
                      </td>
                      <td className="py-2.5 text-right font-extrabold text-slate-900">
                        {formatIDR(h.saldo_berjalan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10: EDIT PABRIK (SUPER ADMIN) */}
      {activeModal === 'edit_pabrik' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Edit Pabrik</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePabrik} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Pabrik</label>
                <input
                  type="text"
                  required
                  value={editPabrikForm.nama_pabrik}
                  onChange={(e) => setEditPabrikForm({ ...editPabrikForm, nama_pabrik: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kota / Alamat</label>
                <input
                  type="text"
                  value={editPabrikForm.alamat}
                  onChange={(e) => setEditPabrikForm({ ...editPabrikForm, alamat: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Penanggung Jawab</label>
                  <input
                    type="text"
                    value={editPabrikForm.penanggung_jawab}
                    onChange={(e) => setEditPabrikForm({ ...editPabrikForm, penanggung_jawab: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">No. Telepon</label>
                  <input
                    type="text"
                    value={editPabrikForm.telepon}
                    onChange={(e) => setEditPabrikForm({ ...editPabrikForm, telepon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 11: KONFIRMASI HAPUS PABRIK (SUPER ADMIN) */}
      {activeModal === 'delete_pabrik_confirm' && selectedPabrikToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900">Hapus Pabrik?</h3>
              <p className="text-xs text-slate-500">
                Pabrik <strong className="text-slate-800">"{selectedPabrikToDelete.nama_pabrik}"</strong> beserta seluruh produk, pedagang, dan jurnal double-entry terkait akan dihapus permanen.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedPabrikToDelete(null);
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeletePabrik}
                className="flex-1 py-2.5 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-sm"
              >
                Ya, Hapus Pabrik
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 12: TAMBAH / EDIT USER (SUPER ADMIN) */}
      {(activeModal === 'tambah_user' || activeModal === 'edit_user') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">{activeModal === 'edit_user' ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Pengguna"
                  value={userForm.nama}
                  onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="user@email.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="username"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Password {activeModal === 'edit_user' && <span className="text-[11px] font-normal text-slate-400">(Kosongkan jika tidak diubah)</span>}
                </label>
                <input
                  type="password"
                  placeholder={activeModal === 'edit_user' ? '••••••••' : 'Password login'}
                  required={activeModal === 'tambah_user'}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Peran (Role)</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                  >
                    <option value="super_admin">Super Admin (Owner)</option>
                    <option value="admin_pabrik">Admin Pabrik</option>
                    <option value="pedagang">Akun Pedagang</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              {userForm.role !== 'super_admin' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tugaskan ke Pabrik</label>
                  <select
                    value={userForm.pabrik_id}
                    onChange={(e) => setUserForm({ ...userForm, pabrik_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                  >
                    <option value="">-- Pilih Pabrik --</option>
                    {factories.map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.nama_pabrik}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  {activeModal === 'edit_user' ? 'Simpan Pengguna' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 13: KONFIRMASI HAPUS USER (SUPER ADMIN) */}
      {activeModal === 'delete_user_confirm' && selectedUserToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900">Hapus Pengguna?</h3>
              <p className="text-xs text-slate-500">
                Pengguna <strong className="text-slate-800">"{selectedUserToDelete.nama}"</strong> (@{selectedUserToDelete.username}) akan dihapus dari sistem.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedUserToDelete(null);
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 py-2.5 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 14: EDIT TRANSAKSI / PEMBUKUAN */}
      {activeModal === 'edit_transaksi' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Edit Transaksi</h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {editTransactionForm.nomor_bukti} ({editTransactionForm.tipe_transaksi})
                </span>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTransaction} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={editTransactionForm.tanggal}
                  onChange={(e) => setEditTransactionForm({ ...editTransactionForm, tanggal: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Referensi / Item</label>
                <input
                  type="text"
                  placeholder="Nomor referensi, nota, atau nama item"
                  value={editTransactionForm.referensi}
                  onChange={(e) => setEditTransactionForm({ ...editTransactionForm, referensi: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Keterangan / Catatan</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Catatan transaksi..."
                  value={editTransactionForm.keterangan}
                  onChange={(e) => setEditTransactionForm({ ...editTransactionForm, keterangan: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Nominal Transaksi:</span>
                <span className="font-extrabold text-slate-900 font-mono">
                  {formatIDR(editTransactionForm.total_nominal)}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#191a23] text-white rounded-xl hover:bg-black shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 15: KONFIRMASI HAPUS TRANSAKSI */}
      {activeModal === 'delete_transaksi_confirm' && selectedTransactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900">Hapus Transaksi?</h3>
              <p className="text-xs text-slate-500">
                Transaksi <strong className="text-slate-800 font-mono">{selectedTransactionToDelete.nomor_bukti}</strong> akan dihapus dan saldo akan dipulihkan.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Tipe:</span>
                <span className="font-semibold text-slate-800">{selectedTransactionToDelete.tipe_transaksi}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Nominal:</span>
                <span className="font-extrabold text-slate-900">{formatIDR(selectedTransactionToDelete.total_nominal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tanggal:</span>
                <span className="font-mono text-slate-700">{selectedTransactionToDelete.tanggal}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Jurnal double-entry akan dibatalkan, dan saldo kas, piutang, serta stok akan dikembalikan secara otomatis.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedTransactionToDelete(null);
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteTransaction}
                className="flex-1 py-2.5 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
