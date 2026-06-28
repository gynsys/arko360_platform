import { useState, useEffect, useRef } from 'react';
import { AUDIO_TRACKS } from '../constants';
import { blogService } from '../../../services/blogService';
import { getImageUrl } from '../../../../../lib/imageUtils';

export const useAudioPlayback = (activeTab, isPlaying, setIsPlaying, showToast) => {
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [customAudioUrl, setCustomAudioUrl] = useState(null);
  const [prelisteningTrack, setPrelisteningTrack] = useState(null);
  const [userAudios, setUserAudios] = useState([]);
  const [loadingAudios, setLoadingAudios] = useState(false);
  
  const audioRef = useRef(null);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    loadUserAudios();
  }, []);

  const loadUserAudios = async () => {
    try {
      setLoadingAudios(true);
      const data = await blogService.getSocialAudios();
      setUserAudios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading user audios:', error);
    } finally {
      setLoadingAudios(false);
    }
  };

  const handleUploadAudio = async (e) => {
    console.log("[GynSys] handleUploadAudio triggered");
    const file = e.target.files?.[0];
    if (!file) {
      console.log("[GynSys] No file selected");
      return;
    }
    console.log("[GynSys] File selected:", file.name);
    try {
      showToast('Subiendo audio...', 'info');
      const response = await blogService.uploadSocialAudio(file);
      console.log("[GynSys] Upload response:", response);
      showToast('Audio subido con éxito', 'success');
      
      const newAudio = response.audio || response; // Fallback if direct object returned
      console.log("[GynSys] New audio object:", newAudio);
      
      if (!newAudio || !newAudio.id) {
        console.error("[GynSys] Invalid response structure:", response);
        throw new Error("Invalid response structure");
      }
      
      setUserAudios(prev => [newAudio, ...prev]);
      
      // Select the new audio automatically
      setSelectedAudio(`User-${newAudio.id}`);
      setCustomAudioUrl(newAudio.url);
      
      return newAudio;
    } catch (error) {
      console.error("[GynSys] Error in handleUploadAudio:", error);
      showToast('Error al subir audio', 'error');
      throw error;
    }
  };

  const handleDeleteAudio = async (audioId) => {
    try {
      await blogService.deleteSocialAudio(audioId);
      setUserAudios(prev => prev.filter(a => a.id !== audioId));
      if (selectedAudio === `User-${audioId}`) {
        setSelectedAudio(null);
        setCustomAudioUrl(null);
      }
      showToast('Audio eliminado', 'success');
    } catch (error) {
      showToast('Error al eliminar audio', 'error');
    }
  };

  const getActiveAudioSrc = () => {
    if (!selectedAudio) return '';
    if (selectedAudio === 'Custom' && customAudioUrl) return customAudioUrl;
    if (selectedAudio && selectedAudio.startsWith('User-')) {
      const audioId = parseInt(selectedAudio.split('-')[1]);
      const audio = userAudios.find(a => a.id === audioId);
      if (audio) return getImageUrl(audio.url);
    }
    return getImageUrl(AUDIO_TRACKS[selectedAudio] || AUDIO_TRACKS['Medical']);
  };

  // Main Audio Effect
  useEffect(() => {
    if (audioRef.current) {
      if (activeTab === 'video' && isPlaying && selectedAudio) {
        const src = getActiveAudioSrc();
        if (src) {
          audioRef.current.src = src;
          audioRef.current.load();
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.log("[GynSys] Autoplay prevented");
            });
          }
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [activeTab, isPlaying, selectedAudio, customAudioUrl, userAudios]);

  // Prelistening Effect
  useEffect(() => {
    if (previewAudioRef.current) {
      if (prelisteningTrack) {
        setIsPlaying(false);
        let src = '';
        if (prelisteningTrack === 'Custom') {
          src = customAudioUrl;
        } else if (prelisteningTrack.startsWith('User-')) {
          const audioId = parseInt(prelisteningTrack.split('-')[1]);
          const audio = userAudios.find(a => a.id === audioId);
          src = audio ? getImageUrl(audio.url) : '';
        } else {
          src = getImageUrl(AUDIO_TRACKS[prelisteningTrack]);
        }
        
        if (src) {
          previewAudioRef.current.src = src;
          previewAudioRef.current.load();
          previewAudioRef.current.play().catch(e => console.log("Error in preview audio:", e));
        }
      } else {
        previewAudioRef.current.pause();
      }
    }
  }, [prelisteningTrack]);

  return {
    audioRef,
    previewAudioRef,
    selectedAudio,
    setSelectedAudio,
    customAudioUrl,
    setCustomAudioUrl,
    prelisteningTrack,
    setPrelisteningTrack,
    getActiveAudioSrc,
    userAudios,
    loadingAudios,
    handleUploadAudio,
    handleDeleteAudio
  };
};

