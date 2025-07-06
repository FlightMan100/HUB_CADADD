import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Users, 
  Search, 
  Plus,
  User,
  Calendar,
  MapPin,
  Phone,
  Briefcase,
  Eye,
  Palette,
  Ruler,
  Weight,
  FileText,
  CreditCard,
  Shield,
  AlertTriangle,
  Edit,
  Trash2,
  UserPlus,
  Gavel,
  Badge
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
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [showArrestModal, setShowArrestModal] = useState(false);
  const [showWarrantModal, setShowWarrantModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Character[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Check if user has LEO or Judge access
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await dmvAPI.searchCharacters(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const handleCharacterSelect = async (characterId: number) => {
    try {
      setLoading(true);
      const data = await dmvAPI.getCharacter(characterId.toString());
      setSelectedCharacter(data);
    } catch (error) {
      console.error('Failed to fetch character details:', error);
    } finally {
      setLoading(false);
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
      handleCharacterSelect(selectedCharacter.character.id);
    } catch (error) {
      console.error('Failed to update character:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharacter) return;

    setSubmitting(true);
    try {
      await dmvAPI.addVehicle(selectedCharacter.character.id.toString(), vehicleForm);
      setShowVehicleModal(false);
      resetVehicleForm();
      handleCharacterSelect(selectedCharacter.character.id);
    } catch (error) {
      console.error('Failed to add vehicle:', error);
    } finally {
      setSubmitting(false);
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
      handleCharacterSelect(selectedCharacter.character.id);
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
      handleCharacterSelect(selectedCharacter.character.id);
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
      handleCharacterSelect(selectedCharacter.character.id);
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
        handleCharacterSelect(selectedCharacter.character.id);
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
    if (!selectedCharacter) return;
    const char = selectedCharacter.character;
    setCharacterForm({
      name: char.name,
      date_of_birth: char.date_of_birth,
      address: char.address,
      phone_number: char.phone_number || '',
      profession: char.profession,
      gender: char.gender,
      race: char.race,
      hair_color: char.hair_color,
      eye_color: char.eye_color,
      height: char.height,
      weight: char.weight,
      backstory: char.backstory || '',
      drivers_license_status: char.drivers_license_status,
      firearms_license_status: char.firearms_license_status
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'valid': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'expired': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'suspended': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'active': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'completed': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      case 'none': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      default: return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
    }
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
            Department of Motor Vehicles
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage civilian characters, vehicles, and records
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('civilian')}
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
                onClick={() => setActiveTab('leo')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'leo'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Badge className="h-5 w-5" />
                  <span>LEO</span>
                </div>
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'civilian' && (
            <div className="space-y-6">
              {!selectedCharacter ? (
                <>
                  {/* Character List */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      My Characters
                    </h2>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create Character
                    </button>
                  </div>

                  {characters.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {characters.map((character) => (
                        <div
                          key={character.id}
                          onClick={() => handleCharacterSelect(character.id)}
                          className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 cursor-pointer hover:shadow-lg"
                        >
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
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
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedCharacter(null)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      ← Back to Characters
                    </button>
                    <div className="flex space-x-2">
                      <button
                        onClick={openEditModal}
                        className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => setShowVehicleModal(true)}
                        className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                      >
                        <Car className="h-4 w-4 mr-2" />
                        Add Vehicle
                      </button>
                    </div>
                  </div>

                  {/* Character Profile */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                          {selectedCharacter.character.name}
                        </h2>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <Calendar className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                              Born {formatDate(selectedCharacter.character.date_of_birth)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                              {selectedCharacter.character.address}
                            </span>
                          </div>
                          {selectedCharacter.character.phone_number && (
                            <div className="flex items-center space-x-3">
                              <Phone className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-300">
                                {selectedCharacter.character.phone_number}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center space-x-3">
                            <Briefcase className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                              {selectedCharacter.character.profession}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Physical Description
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Gender:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.gender}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Race:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.race}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Hair:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.hair_color}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Eyes:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.eye_color}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Height:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.height}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Weight:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.weight}</span>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">Driver's License:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedCharacter.character.drivers_license_status)}`}>
                              {selectedCharacter.character.drivers_license_status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">Firearms License:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedCharacter.character.firearms_license_status)}`}>
                              {selectedCharacter.character.firearms_license_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedCharacter.character.backstory && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Backstory
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                          {selectedCharacter.character.backstory}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Vehicles */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Registered Vehicles ({selectedCharacter.vehicles.length})
                      </h3>
                    </div>
                    
                    {selectedCharacter.vehicles.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedCharacter.vehicles.map((vehicle) => (
                          <div key={vehicle.id} className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                  {vehicle.make} {vehicle.model}
                                </h4>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                  <span>Color: {vehicle.color}</span>
                                  <span>Plate: {vehicle.plate}</span>
                                </div>
                              </div>
                              <div className="flex flex-col space-y-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehicle.registration_status)}`}>
                                  Registration: {vehicle.registration_status}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehicle.insurance_status)}`}>
                                  Insurance: {vehicle.insurance_status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <Car className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No vehicles registered</p>
                      </div>
                    )}
                  </div>

                  {/* Citations */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Citations ({selectedCharacter.citations.length})
                      </h3>
                    </div>
                    
                    {selectedCharacter.citations.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedCharacter.citations.map((citation) => (
                          <div key={citation.id} className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                  {citation.violation}
                                </h4>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                  <span>Fine: {formatCurrency(citation.fine_amount)}</span>
                                  <span>Issued by: {citation.issued_by_name}</span>
                                  <span>{formatDate(citation.created_at)}</span>
                                </div>
                                {citation.notes && (
                                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    {citation.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No citations on record</p>
                      </div>
                    )}
                  </div>

                  {/* Arrests */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Arrest Records ({selectedCharacter.arrests.length})
                      </h3>
                    </div>
                    
                    {selectedCharacter.arrests.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedCharacter.arrests.map((arrest) => (
                          <div key={arrest.id} className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                  {arrest.charges}
                                </h4>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                  <span>Location: {arrest.location}</span>
                                  <span>Arrested by: {arrest.arrested_by_name}</span>
                                  <span>{formatDate(arrest.created_at)}</span>
                                </div>
                                {arrest.notes && (
                                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    {arrest.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No arrest records</p>
                      </div>
                    )}
                  </div>

                  {/* Warrants */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Warrants ({selectedCharacter.warrants.length})
                        </h3>
                        {selectedCharacter.warrants.some(w => w.status === 'Active') && (
                          <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 dark:bg-red-900/20 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                              Active Warrant(s)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {selectedCharacter.warrants.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedCharacter.warrants.map((warrant) => (
                          <div key={warrant.id} className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center space-x-3 mb-2">
                                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                    {warrant.charges}
                                  </h4>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(warrant.status)}`}>
                                    {warrant.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  Reason: {warrant.reason}
                                </p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                  <span>Issued by: {warrant.issued_by_name}</span>
                                  <span>Issued: {formatDate(warrant.created_at)}</span>
                                  {warrant.completed_at && (
                                    <>
                                      <span>Completed by: {warrant.completed_by_name}</span>
                                      <span>Completed: {formatDate(warrant.completed_at)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <Gavel className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No warrants on record</p>
                      </div>
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
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Civilian Search
                    </h2>
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or address..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {searchResults.length > 0 && (
                      <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Search Results ({searchResults.length})
                          </h3>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {searchResults.map((character) => (
                            <div
                              key={character.id}
                              onClick={() => handleCharacterSelect(character.id)}
                              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                    {character.name}
                                  </h4>
                                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    <span>DOB: {formatDate(character.date_of_birth)}</span>
                                    <span>{character.address}</span>
                                  </div>
                                </div>
                                <div className="text-gray-400">
                                  <Search className="h-5 w-5" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* LEO Character Detail View */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedCharacter(null)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      ← Back to Search
                    </button>
                    <div className="flex space-x-2">
                      {selectedCharacter.hasLEOAccess && (
                        <>
                          <button
                            onClick={() => setShowCitationModal(true)}
                            className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Issue Citation
                          </button>
                          <button
                            onClick={() => setShowArrestModal(true)}
                            className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            File Arrest
                          </button>
                        </>
                      )}
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
                            This individual has {selectedCharacter.warrants.filter(w => w.status === 'Active').length} active warrant(s).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Same character profile as civilian view but with LEO actions */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                          {selectedCharacter.character.name}
                        </h2>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <Calendar className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                              Born {formatDate(selectedCharacter.character.date_of_birth)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                              {selectedCharacter.character.address}
                            </span>
                          </div>
                          {selectedCharacter.character.phone_number && (
                            <div className="flex items-center space-x-3">
                              <Phone className="h-5 w-5 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-300">
                                {selectedCharacter.character.phone_number}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center space-x-3">
                            <Briefcase className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                              {selectedCharacter.character.profession}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Physical Description
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Gender:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.gender}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Race:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.race}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Hair:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.hair_color}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Eyes:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.eye_color}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Height:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.height}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Weight:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{selectedCharacter.character.weight}</span>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">Driver's License:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedCharacter.character.drivers_license_status)}`}>
                              {selectedCharacter.character.drivers_license_status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">Firearms License:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedCharacter.character.firearms_license_status)}`}>
                              {selectedCharacter.character.firearms_license_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Same sections as civilian view but with LEO actions for warrants */}
                  {/* Vehicles, Citations, Arrests sections... */}
                  
                  {/* Warrants with LEO actions */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Warrants ({selectedCharacter.warrants.length})
                      </h3>
                    </div>
                    
                    {selectedCharacter.warrants.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedCharacter.warrants.map((warrant) => (
                          <div key={warrant.id} className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center space-x-3 mb-2">
                                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                    {warrant.charges}
                                  </h4>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(warrant.status)}`}>
                                    {warrant.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  Reason: {warrant.reason}
                                </p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                  <span>Issued by: {warrant.issued_by_name}</span>
                                  <span>Issued: {formatDate(warrant.created_at)}</span>
                                  {warrant.completed_at && (
                                    <>
                                      <span>Completed by: {warrant.completed_by_name}</span>
                                      <span>Completed: {formatDate(warrant.completed_at)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {warrant.status === 'Active' && selectedCharacter.hasLEOAccess && (
                                <button
                                  onClick={() => handleCompleteWarrant(warrant.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm"
                                >
                                  Mark Completed
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <Gavel className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No warrants on record</p>
                      </div>
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

      {/* Add Vehicle Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Register Vehicle
              </h2>
            </div>
            
            <form onSubmit={handleAddVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                  {submitting ? <LoadingSpinner /> : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Citation Modal */}
      {showCitationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Issue Citation
              </h2>
            </div>
            
            <form onSubmit={handleIssueCitation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Violation *
                </label>
                <input
                  type="text"
                  value={citationForm.violation}
                  onChange={(e) => setCitationForm(prev => ({ ...prev, violation: e.target.value }))}
                  required
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

      {/* File Arrest Modal */}
      {showArrestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                File Arrest Report
              </h2>
            </div>
            
            <form onSubmit={handleFileArrest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Charges *
                </label>
                <input
                  type="text"
                  value={arrestForm.charges}
                  onChange={(e) => setArrestForm(prev => ({ ...prev, charges: e.target.value }))}
                  required
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
                  rows={3}
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

      {/* Issue Warrant Modal */}
      {showWarrantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Issue Arrest Warrant
              </h2>
            </div>
            
            <form onSubmit={handleIssueWarrant} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Charges *
                </label>
                <input
                  type="text"
                  value={warrantForm.charges}
                  onChange={(e) => setWarrantForm(prev => ({ ...prev, charges: e.target.value }))}
                  required
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
                  rows={3}
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

      {/* Edit Character Modal - Similar to Create but with update functionality */}
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
                  onClick={() => {
                    setShowEditModal(false);
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
                  {submitting ? <LoadingSpinner /> : 'Update Character'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};