import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Plus, 
  Search, 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Briefcase,
  Shield,
  AlertTriangle,
  Edit2,
  Trash2,
  Save,
  X,
  FileText,
  Gavel,
  Clock,
  CheckCircle,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dmvAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Character {
  id: number;
  name: string;
  date_of_birth: string;
  address: string;
  phone_number?: string;
  profession: string;
  gender: 'Male' | 'Female';
  race: string;
  hair_color: string;
  eye_color: string;
  height: string;
  weight: string;
  backstory?: string;
  drivers_license_status: 'Valid' | 'Suspended' | 'Expired';
  firearms_license_status: 'None' | 'Suspended' | 'Open Carry' | 'Concealed';
  created_at: string;
}

interface Vehicle {
  id: number;
  character_id: number;
  make: string;
  model: string;
  color: string;
  plate: string;
  registration_status: 'Valid' | 'Expired' | 'Suspended';
  insurance_status: 'Valid' | 'Expired' | 'None';
  created_at: string;
}

interface Citation {
  id: number;
  violation: string;
  fine_amount: number;
  notes?: string;
  issued_by_name: string;
  created_at: string;
}

interface Arrest {
  id: number;
  charges: string;
  location: string;
  notes?: string;
  arrested_by_name: string;
  created_at: string;
}

interface Warrant {
  id: number;
  charges: string;
  reason: string;
  status: 'Active' | 'Completed';
  issued_by_name: string;
  completed_by_name?: string;
  created_at: string;
  completed_at?: string;
}

interface CharacterDetails {
  character: Character;
  vehicles: Vehicle[];
  citations: Citation[];
  arrests: Arrest[];
  warrants: Warrant[];
  isOwner: boolean;
  hasLEOAccess: boolean;
  hasJudgeAccess: boolean;
}

export const DMVPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'civilian' | 'leo'>('civilian');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [showArrestModal, setShowArrestModal] = useState(false);
  const [showWarrantModal, setShowWarrantModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Character[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [characterForm, setCharacterForm] = useState({
    name: '',
    date_of_birth: '',
    address: '',
    phone_number: '',
    profession: '',
    gender: 'Male' as 'Male' | 'Female',
    race: '',
    hair_color: '',
    eye_color: '',
    height: '',
    weight: '',
    backstory: '',
    drivers_license_status: 'Valid' as 'Valid' | 'Suspended' | 'Expired',
    firearms_license_status: 'None' as 'None' | 'Suspended' | 'Open Carry' | 'Concealed'
  });

  const [vehicleForm, setVehicleForm] = useState({
    make: '',
    model: '',
    color: '',
    plate: '',
    registration_status: 'Valid' as 'Valid' | 'Expired' | 'Suspended',
    insurance_status: 'Valid' as 'Valid' | 'Expired' | 'None'
  });

  const [citationForm, setCitationForm] = useState({
    violation: '',
    fine_amount: '',
    notes: ''
  });

  const [arrestForm, setArrestForm] = useState({
    charges: '',
    location: '',
    notes: ''
  });

  const [warrantForm, setWarrantForm] = useState({
    charges: '',
    reason: ''
  });

  // Check user permissions
  const hasLEOAccess = () => {
    if (!user) return false;
    if (user.is_admin) return true;
    const userRoles = user.roles || [];
    return userRoles.some(role => role.id === import.meta.env.VITE_LEO_ROLE_ID);
  };

  const hasJudgeAccess = () => {
    if (!user) return false;
    if (user.is_admin) return true;
    const userRoles = user.roles || [];
    return userRoles.some(role => role.id === import.meta.env.VITE_JUDGE_ROLE_ID);
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      const data = await dmvAPI.getCharacters();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCharacterDetails = async (id: number) => {
    try {
      setLoading(true);
      const data = await dmvAPI.getCharacter(id.toString());
      setSelectedCharacter(data);
    } catch (error) {
      console.error('Failed to fetch character details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await dmvAPI.searchCharacters(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await dmvAPI.createCharacter(characterForm);
      setShowCreateModal(false);
      resetCharacterForm();
      fetchCharacters();
    } catch (error) {
      console.error('Failed to create character:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharacter) return;

    setSubmitting(true);
    try {
      await dmvAPI.updateCharacter(selectedCharacter.character.id.toString(), characterForm);
      setShowEditModal(false);
      fetchCharacterDetails(selectedCharacter.character.id);
    } catch (error) {
      console.error('Failed to update character:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharacter) return;

    setSubmitting(true);
    try {
      if (editingVehicle) {
        await dmvAPI.updateVehicle(editingVehicle.id.toString(), vehicleForm);
      } else {
        await dmvAPI.addVehicle(selectedCharacter.character.id.toString(), vehicleForm);
      }
      setShowVehicleModal(false);
      setEditingVehicle(null);
      resetVehicleForm();
      fetchCharacterDetails(selectedCharacter.character.id);
    } catch (error) {
      console.error('Failed to save vehicle:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      await dmvAPI.deleteVehicle(vehicleId.toString());
      if (selectedCharacter) {
        fetchCharacterDetails(selectedCharacter.character.id);
      }
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
    }
  };

  const handleIssueCitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharacter) return;

    setSubmitting(true);
    try {
      await dmvAPI.issueCitation(selectedCharacter.character.id.toString(), {
        ...citationForm,
        fine_amount: parseFloat(citationForm.fine_amount)
      });
      setShowCitationModal(false);
      resetCitationForm();
      fetchCharacterDetails(selectedCharacter.character.id);
    } catch (error) {
      console.error('Failed to issue citation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileArrest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharacter) return;

    setSubmitting(true);
    try {
      await dmvAPI.fileArrest(selectedCharacter.character.id.toString(), arrestForm);
      setShowArrestModal(false);
      resetArrestForm();
      fetchCharacterDetails(selectedCharacter.character.id);
    } catch (error) {
      console.error('Failed to file arrest:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueWarrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharacter) return;

    setSubmitting(true);
    try {
      await dmvAPI.issueWarrant(selectedCharacter.character.id.toString(), warrantForm);
      setShowWarrantModal(false);
      resetWarrantForm();
      fetchCharacterDetails(selectedCharacter.character.id);
    } catch (error) {
      console.error('Failed to issue warrant:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteWarrant = async (warrantId: number) => {
    if (!confirm('Mark this warrant as completed?')) return;

    try {
      await dmvAPI.completeWarrant(warrantId.toString());
      if (selectedCharacter) {
        fetchCharacterDetails(selectedCharacter.character.id);
      }
    } catch (error) {
      console.error('Failed to complete warrant:', error);
    }
  };

  const resetCharacterForm = () => {
    setCharacterForm({
      name: '',
      date_of_birth: '',
      address: '',
      phone_number: '',
      profession: '',
      gender: 'Male',
      race: '',
      hair_color: '',
      eye_color: '',
      height: '',
      weight: '',
      backstory: '',
      drivers_license_status: 'Valid',
      firearms_license_status: 'None'
    });
  };

  const resetVehicleForm = () => {
    setVehicleForm({
      make: '',
      model: '',
      color: '',
      plate: '',
      registration_status: 'Valid',
      insurance_status: 'Valid'
    });
  };

  const resetCitationForm = () => {
    setCitationForm({
      violation: '',
      fine_amount: '',
      notes: ''
    });
  };

  const resetArrestForm = () => {
    setArrestForm({
      charges: '',
      location: '',
      notes: ''
    });
  };

  const resetWarrantForm = () => {
    setWarrantForm({
      charges: '',
      reason: ''
    });
  };

  const openEditModal = () => {
    if (selectedCharacter) {
      setCharacterForm({
        name: selectedCharacter.character.name,
        date_of_birth: selectedCharacter.character.date_of_birth,
        address: selectedCharacter.character.address,
        phone_number: selectedCharacter.character.phone_number || '',
        profession: selectedCharacter.character.profession,
        gender: selectedCharacter.character.gender,
        race: selectedCharacter.character.race,
        hair_color: selectedCharacter.character.hair_color,
        eye_color: selectedCharacter.character.eye_color,
        height: selectedCharacter.character.height,
        weight: selectedCharacter.character.weight,
        backstory: selectedCharacter.character.backstory || '',
        drivers_license_status: selectedCharacter.character.drivers_license_status,
        firearms_license_status: selectedCharacter.character.firearms_license_status
      });
      setShowEditModal(true);
    }
  };

  const openVehicleModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehicleForm({
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        plate: vehicle.plate,
        registration_status: vehicle.registration_status,
        insurance_status: vehicle.insurance_status
      });
    } else {
      setEditingVehicle(null);
      resetVehicleForm();
    }
    setShowVehicleModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Valid': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'Expired': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'Suspended': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'Active': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'Completed': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      case 'None': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      default: return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading && !selectedCharacter) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            DMV System
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage civilian characters and law enforcement records
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => {
                setActiveTab('civilian');
                setSelectedCharacter(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'civilian'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Civilian</span>
              </div>
            </button>
            
            {(hasLEOAccess() || hasJudgeAccess()) && (
              <button
                onClick={() => {
                  setActiveTab('leo');
                  setSelectedCharacter(null);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'leo'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>LEO</span>
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'civilian' && (
            <div className="space-y-6">
              {!selectedCharacter ? (
                <>
                  {/* Character List Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      My Characters
                    </h2>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create Character
                    </button>
                  </div>

                  {/* Character Grid */}
                  {characters.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {characters.map((character) => (
                        <div
                          key={character.id}
                          onClick={() => fetchCharacterDetails(character.id)}
                          className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 cursor-pointer hover:shadow-lg"
                        >
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                              <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {character.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {character.profession}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-300">
                                Born {formatDate(character.date_of_birth)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-300 truncate">
                                {character.address}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(character.drivers_license_status)}`}>
                              DL: {character.drivers_license_status}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(character.firearms_license_status)}`}>
                              FL: {character.firearms_license_status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No characters created
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Create your first civilian character to get started
                      </p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Character
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Character Detail View */
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedCharacter(null)}
                      className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                    >
                      <X className="h-5 w-5 mr-2" />
                      Back to Characters
                    </button>
                    
                    {(selectedCharacter.isOwner || selectedCharacter.hasJudgeAccess) && (
                      <button
                        onClick={openEditModal}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Character
                      </button>
                    )}
                  </div>

                  {/* Active Warrant Banner - Only for LEO/Judge */}
                  {(selectedCharacter.hasLEOAccess || selectedCharacter.hasJudgeAccess) && 
                   selectedCharacter.warrants.some(w => w.status === 'Active') && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        <div>
                          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                            ACTIVE WARRANT
                          </h3>
                          <p className="text-red-700 dark:text-red-300">
                            This individual has {selectedCharacter.warrants.filter(w => w.status === 'Active').length} active warrant(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Character Info */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                        <User className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedCharacter.character.name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          {selectedCharacter.character.profession}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Personal Information</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-500 dark:text-gray-400">DOB:</span> {formatDate(selectedCharacter.character.date_of_birth)}</div>
                          <div><span className="text-gray-500 dark:text-gray-400">Gender:</span> {selectedCharacter.character.gender}</div>
                          <div><span className="text-gray-500 dark:text-gray-400">Race:</span> {selectedCharacter.character.race}</div>
                          <div><span className="text-gray-500 dark:text-gray-400">Height:</span> {selectedCharacter.character.height}</div>
                          <div><span className="text-gray-500 dark:text-gray-400">Weight:</span> {selectedCharacter.character.weight}</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-500 dark:text-gray-400">Address:</span> {selectedCharacter.character.address}</div>
                          {selectedCharacter.character.phone_number && (
                            <div><span className="text-gray-500 dark:text-gray-400">Phone:</span> {selectedCharacter.character.phone_number}</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Physical Description</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-500 dark:text-gray-400">Hair:</span> {selectedCharacter.character.hair_color}</div>
                          <div><span className="text-gray-500 dark:text-gray-400">Eyes:</span> {selectedCharacter.character.eye_color}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCharacter.character.drivers_license_status)}`}>
                        Driver's License: {selectedCharacter.character.drivers_license_status}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCharacter.character.firearms_license_status)}`}>
                        Firearms License: {selectedCharacter.character.firearms_license_status}
                      </span>
                    </div>

                    {selectedCharacter.character.backstory && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Backstory</h4>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {selectedCharacter.character.backstory}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Vehicles Section */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Registered Vehicles
                      </h3>
                      {(selectedCharacter.isOwner || selectedCharacter.hasJudgeAccess) && (
                        <button
                          onClick={() => openVehicleModal()}
                          className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Vehicle
                        </button>
                      )}
                    </div>

                    {selectedCharacter.vehicles.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedCharacter.vehicles.map((vehicle) => (
                          <div key={vehicle.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {vehicle.make} {vehicle.model}
                              </h4>
                              {(selectedCharacter.isOwner || selectedCharacter.hasJudgeAccess) && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => openVehicleModal(vehicle)}
                                    className="p-1 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVehicle(vehicle.id)}
                                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-500 dark:text-gray-400">Color:</span> {vehicle.color}</div>
                              <div><span className="text-gray-500 dark:text-gray-400">Plate:</span> {vehicle.plate}</div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(vehicle.registration_status)}`}>
                                  Reg: {vehicle.registration_status}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(vehicle.insurance_status)}`}>
                                  Ins: {vehicle.insurance_status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No vehicles registered
                      </p>
                    )}
                  </div>

                  {/* Citations Section */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Citations
                      </h3>
                      {(selectedCharacter.hasLEOAccess || selectedCharacter.hasJudgeAccess) && (
                        <button
                          onClick={() => setShowCitationModal(true)}
                          className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Issue Citation
                        </button>
                      )}
                    </div>

                    {selectedCharacter.citations.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCharacter.citations.map((citation) => (
                          <div key={citation.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {citation.violation}
                              </h4>
                              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                ${citation.fine_amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div>Issued by: {citation.issued_by_name}</div>
                              <div>Date: {formatDate(citation.created_at)}</div>
                              {citation.notes && <div>Notes: {citation.notes}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No citations on record
                      </p>
                    )}
                  </div>

                  {/* Arrests Section */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Arrest Reports
                      </h3>
                      {(selectedCharacter.hasLEOAccess || selectedCharacter.hasJudgeAccess) && (
                        <button
                          onClick={() => setShowArrestModal(true)}
                          className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          File Arrest
                        </button>
                      )}
                    </div>

                    {selectedCharacter.arrests.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCharacter.arrests.map((arrest) => (
                          <div key={arrest.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                              {arrest.charges}
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div>Location: {arrest.location}</div>
                              <div>Arrested by: {arrest.arrested_by_name}</div>
                              <div>Date: {formatDate(arrest.created_at)}</div>
                              {arrest.notes && <div>Notes: {arrest.notes}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No arrest records
                      </p>
                    )}
                  </div>

                  {/* Warrants Section */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Warrants
                      </h3>
                      {selectedCharacter.hasJudgeAccess && (
                        <button
                          onClick={() => setShowWarrantModal(true)}
                          className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                        >
                          <Gavel className="h-4 w-4 mr-2" />
                          Issue Warrant
                        </button>
                      )}
                    </div>

                    {selectedCharacter.warrants.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCharacter.warrants.map((warrant) => (
                          <div key={warrant.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {warrant.charges}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(warrant.status)}`}>
                                  {warrant.status}
                                </span>
                                {warrant.status === 'Active' && (selectedCharacter.hasLEOAccess || selectedCharacter.hasJudgeAccess) && (
                                  <button
                                    onClick={() => handleCompleteWarrant(warrant.id)}
                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors duration-200"
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div>Reason: {warrant.reason}</div>
                              <div>Issued by: {warrant.issued_by_name}</div>
                              <div>Date: {formatDate(warrant.created_at)}</div>
                              {warrant.status === 'Completed' && warrant.completed_by_name && (
                                <>
                                  <div>Completed by: {warrant.completed_by_name}</div>
                                  {warrant.completed_at && <div>Completed: {formatDate(warrant.completed_at)}</div>}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No warrants on record
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leo' && (
            <div className="space-y-6">
              {!selectedCharacter ? (
                <>
                  {/* Search Interface */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Search Civilians
                    </h2>
                    
                    <div className="flex space-x-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by name or address..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={handleSearch}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                      >
                        Search
                      </button>
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Search Results
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.map((character) => (
                          <div
                            key={character.id}
                            onClick={() => fetchCharacterDetails(character.id)}
                            className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 cursor-pointer hover:shadow-lg"
                          >
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                                <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {character.name}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  DOB: {formatDate(character.date_of_birth)}
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="truncate">{character.address}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No results found
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Try searching with a different name or address
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* LEO Character Detail View - Same as civilian but with LEO actions */
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedCharacter(null)}
                      className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                    >
                      <X className="h-5 w-5 mr-2" />
                      Back to Search
                    </button>
                    
                    {selectedCharacter.hasJudgeAccess && (
                      <button
                        onClick={openEditModal}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Character
                      </button>
                    )}
                  </div>

                  {/* Active Warrant Banner */}
                  {selectedCharacter.warrants.some(w => w.status === 'Active') && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        <div>
                          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                            ACTIVE WARRANT
                          </h3>
                          <p className="text-red-700 dark:text-red-300">
                            This individual has {selectedCharacter.warrants.filter(w => w.status === 'Active').length} active warrant(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rest of character detail view - same as civilian tab */}
                  {/* Character Info */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                        <User className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedCharacter.character.name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          {selectedCharacter.character.profession}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Personal Information</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-500 dark:text-gray-400">DOB:</span> {formatDate(selectedCharacter.character.date_of_birth)}</div>
                          <div><span className="text-gray-500 dark:text-gray-400">Gender:</span> {selectedCharacter.character.gender}</div>
                          <div><span className="text-gray-500 dark:text-gray-400">Race:</span> {selectedCharacter.character.race}</div>
                          <div><span className="text-gray-500 dark:text-gray-400">Height:</span> {selectedCharacter.character.height}</div>
                          <div><span className="text-gray-500 dark:text-gray-400">Weight:</span> {selectedCharacter.character.weight}</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-500 dark:text-gray-400">Address:</span> {selectedCharacter.character.address}</div>
                          {selectedCharacter.character.phone_number && (
                            <div><span className="text-gray-500 dark:text-gray-400">Phone:</span> {selectedCharacter.character.phone_number}</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Physical Description</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-500 dark:text-gray-400">Hair:</span> {selectedCharacter.character.hair_color}</div>
                          <div><span className="text-gray-500 dark:text-gray-400">Eyes:</span> {selectedCharacter.character.eye_color}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCharacter.character.drivers_license_status)}`}>
                        Driver's License: {selectedCharacter.character.drivers_license_status}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCharacter.character.firearms_license_status)}`}>
                        Firearms License: {selectedCharacter.character.firearms_license_status}
                      </span>
                    </div>

                    {selectedCharacter.character.backstory && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Backstory</h4>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {selectedCharacter.character.backstory}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Vehicles Section - LEO can view but not edit */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Registered Vehicles
                    </h3>

                    {selectedCharacter.vehicles.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedCharacter.vehicles.map((vehicle) => (
                          <div key={vehicle.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                              {vehicle.make} {vehicle.model}
                            </h4>
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-500 dark:text-gray-400">Color:</span> {vehicle.color}</div>
                              <div><span className="text-gray-500 dark:text-gray-400">Plate:</span> {vehicle.plate}</div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(vehicle.registration_status)}`}>
                                  Reg: {vehicle.registration_status}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(vehicle.insurance_status)}`}>
                                  Ins: {vehicle.insurance_status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No vehicles registered
                      </p>
                    )}
                  </div>

                  {/* Citations Section - LEO can view and add */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Citations
                      </h3>
                      <button
                        onClick={() => setShowCitationModal(true)}
                        className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Issue Citation
                      </button>
                    </div>

                    {selectedCharacter.citations.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCharacter.citations.map((citation) => (
                          <div key={citation.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {citation.violation}
                              </h4>
                              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                ${citation.fine_amount.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div>Issued by: {citation.issued_by_name}</div>
                              <div>Date: {formatDate(citation.created_at)}</div>
                              {citation.notes && <div>Notes: {citation.notes}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No citations on record
                      </p>
                    )}
                  </div>

                  {/* Arrests Section - LEO can view and add */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Arrest Reports
                      </h3>
                      <button
                        onClick={() => setShowArrestModal(true)}
                        className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        File Arrest
                      </button>
                    </div>

                    {selectedCharacter.arrests.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCharacter.arrests.map((arrest) => (
                          <div key={arrest.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                              {arrest.charges}
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div>Location: {arrest.location}</div>
                              <div>Arrested by: {arrest.arrested_by_name}</div>
                              <div>Date: {formatDate(arrest.created_at)}</div>
                              {arrest.notes && <div>Notes: {arrest.notes}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No arrest records
                      </p>
                    )}
                  </div>

                  {/* Warrants Section - LEO can view and complete, Judge can add */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Warrants
                      </h3>
                      {selectedCharacter.hasJudgeAccess && (
                        <button
                          onClick={() => setShowWarrantModal(true)}
                          className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                        >
                          <Gavel className="h-4 w-4 mr-2" />
                          Issue Warrant
                        </button>
                      )}
                    </div>

                    {selectedCharacter.warrants.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCharacter.warrants.map((warrant) => (
                          <div key={warrant.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {warrant.charges}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(warrant.status)}`}>
                                  {warrant.status}
                                </span>
                                {warrant.status === 'Active' && (
                                  <button
                                    onClick={() => handleCompleteWarrant(warrant.id)}
                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors duration-200"
                                  >
                                    Complete
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div>Reason: {warrant.reason}</div>
                              <div>Issued by: {warrant.issued_by_name}</div>
                              <div>Date: {formatDate(warrant.created_at)}</div>
                              {warrant.status === 'Completed' && warrant.completed_by_name && (
                                <>
                                  <div>Completed by: {warrant.completed_by_name}</div>
                                  {warrant.completed_at && <div>Completed: {formatDate(warrant.completed_at)}</div>}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No warrants on record
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Character Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create New Character
              </h2>
            </div>
            
            <form onSubmit={handleCreateCharacter} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={characterForm.name}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={characterForm.date_of_birth}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={characterForm.address}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, address: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={characterForm.phone_number}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profession *
                  </label>
                  <input
                    type="text"
                    value={characterForm.profession}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, profession: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender *
                  </label>
                  <select
                    value={characterForm.gender}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, gender: e.target.value as 'Male' | 'Female' }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Race *
                  </label>
                  <input
                    type="text"
                    value={characterForm.race}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, race: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hair Color *
                  </label>
                  <input
                    type="text"
                    value={characterForm.hair_color}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, hair_color: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Eye Color *
                  </label>
                  <input
                    type="text"
                    value={characterForm.eye_color}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, eye_color: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Height *
                  </label>
                  <input
                    type="text"
                    value={characterForm.height}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, height: e.target.value }))}
                    placeholder="e.g., 5'10&quot;"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Weight *
                  </label>
                  <input
                    type="text"
                    value={characterForm.weight}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="e.g., 180 lbs"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Driver's License Status
                  </label>
                  <select
                    value={characterForm.drivers_license_status}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, drivers_license_status: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Valid">Valid</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Firearms License Status
                  </label>
                  <select
                    value={characterForm.firearms_license_status}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, firearms_license_status: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="None">None</option>
                    <option value="Open Carry">Open Carry</option>
                    <option value="Concealed">Concealed</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Character Backstory
                  </label>
                  <textarea
                    value={characterForm.backstory}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, backstory: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCharacterForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? <LoadingSpinner /> : 'Create Character'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Character Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Character
              </h2>
            </div>
            
            <form onSubmit={handleUpdateCharacter} className="p-6 space-y-6">
              {/* Same form fields as create modal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={characterForm.name}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={characterForm.date_of_birth}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={characterForm.address}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, address: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={characterForm.phone_number}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profession *
                  </label>
                  <input
                    type="text"
                    value={characterForm.profession}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, profession: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender *
                  </label>
                  <select
                    value={characterForm.gender}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, gender: e.target.value as 'Male' | 'Female' }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Race *
                  </label>
                  <input
                    type="text"
                    value={characterForm.race}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, race: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hair Color *
                  </label>
                  <input
                    type="text"
                    value={characterForm.hair_color}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, hair_color: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Eye Color *
                  </label>
                  <input
                    type="text"
                    value={characterForm.eye_color}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, eye_color: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Height *
                  </label>
                  <input
                    type="text"
                    value={characterForm.height}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, height: e.target.value }))}
                    placeholder="e.g., 5'10&quot;"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Weight *
                  </label>
                  <input
                    type="text"
                    value={characterForm.weight}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="e.g., 180 lbs"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Driver's License Status
                  </label>
                  <select
                    value={characterForm.drivers_license_status}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, drivers_license_status: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Valid">Valid</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Firearms License Status
                  </label>
                  <select
                    value={characterForm.firearms_license_status}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, firearms_license_status: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="None">None</option>
                    <option value="Open Carry">Open Carry</option>
                    <option value="Concealed">Concealed</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Character Backstory
                  </label>
                  <textarea
                    value={characterForm.backstory}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, backstory: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? <LoadingSpinner /> : 'Update Character'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
              </h2>
            </div>
            
            <form onSubmit={handleVehicleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Make *
                  </label>
                  <input
                    type="text"
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, make: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color *
                  </label>
                  <input
                    type="text"
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, color: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    License Plate *
                  </label>
                  <input
                    type="text"
                    value={vehicleForm.plate}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, plate: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Registration Status
                  </label>
                  <select
                    value={vehicleForm.registration_status}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, registration_status: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Valid">Valid</option>
                    <option value="Expired">Expired</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Insurance Status
                  </label>
                  <select
                    value={vehicleForm.insurance_status}
                    onChange={(e) => setVehicleForm(prev => ({ ...prev, insurance_status: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Valid">Valid</option>
                    <option value="Expired">Expired</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowVehicleModal(false);
                    setEditingVehicle(null);
                    resetVehicleForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? <LoadingSpinner /> : (editingVehicle ? 'Update Vehicle' : 'Add Vehicle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Citation Modal */}
      {showCitationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Issue Citation
              </h2>
            </div>
            
            <form onSubmit={handleIssueCitation} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Violation *
                </label>
                <input
                  type="text"
                  value={citationForm.violation}
                  onChange={(e) => setCitationForm(prev => ({ ...prev, violation: e.target.value }))}
                  required
                  placeholder="e.g., Speeding, Running red light"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fine Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={citationForm.fine_amount}
                  onChange={(e) => setCitationForm(prev => ({ ...prev, fine_amount: e.target.value }))}
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={citationForm.notes}
                  onChange={(e) => setCitationForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCitationModal(false);
                    resetCitationForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? <LoadingSpinner /> : 'Issue Citation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Arrest Modal */}
      {showArrestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                File Arrest Report
              </h2>
            </div>
            
            <form onSubmit={handleFileArrest} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Charges *
                </label>
                <input
                  type="text"
                  value={arrestForm.charges}
                  onChange={(e) => setArrestForm(prev => ({ ...prev, charges: e.target.value }))}
                  required
                  placeholder="e.g., Assault, Theft, DUI"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={arrestForm.location}
                  onChange={(e) => setArrestForm(prev => ({ ...prev, location: e.target.value }))}
                  required
                  placeholder="e.g., Main Street, Downtown"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={arrestForm.notes}
                  onChange={(e) => setArrestForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowArrestModal(false);
                    resetArrestForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? <LoadingSpinner /> : 'File Arrest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warrant Modal */}
      {showWarrantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Issue Warrant
              </h2>
            </div>
            
            <form onSubmit={handleIssueWarrant} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Charges *
                </label>
                <input
                  type="text"
                  value={warrantForm.charges}
                  onChange={(e) => setWarrantForm(prev => ({ ...prev, charges: e.target.value }))}
                  required
                  placeholder="e.g., Failure to appear, Assault"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason *
                </label>
                <textarea
                  value={warrantForm.reason}
                  onChange={(e) => setWarrantForm(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Detailed reason for issuing the warrant..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowWarrantModal(false);
                    resetWarrantForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? <LoadingSpinner /> : 'Issue Warrant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};