
import React, { useState, useEffect, useRef } from 'react';
import { FiCpu, FiInstagram, FiLoader, FiFolder, FiZap, FiVideo, FiImage, FiSave, FiX, FiPlay, FiPause, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Config & Services
import { blogService } from '../../services/blogService';
import { API_URL } from '../../../../services/api';
const ArkoLoader = () => <div className="p-8 text-center">Cargando...</div>;;
import toast from 'react-hot-toast';;
const getImageUrl = (url) => url;;
const useAuthStore = () => ({ user: { id: 1 } });;
import { AUDIO_TRACKS, DEFAULT_VIDEO_STYLES } from './constants';

// Hooks
import { useSlideDesigner } from './hooks/useSlideDesigner';
import { useDragTransform } from './hooks/useDragTransform';
import { useExport } from './hooks/useExport';
import { useVideoExport } from './hooks/useVideoExport';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useVideoPlayback } from './hooks/useVideoPlayback';
import { useMobileFullscreen } from './hooks/useMobileFullscreen';

// Components
import { SlideCanvas } from './components/SlideCanvas';
import { SlidePaginator } from './components/SlidePaginator';
import { PreviewModal } from './components/PreviewModal';
import { EnhancedSidebar } from './components/EnhancedSidebar';
const Modal = ({ isOpen, onClose, title, children }) => isOpen ? (<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><div className="bg-white p-6 rounded-lg"><h2>{title}</h2>{children}<button onClick={onClose}>Cerrar</button></div></div>) : null;

import { MobileLayout } from './components/MobileLayout';
import { ArticleSelector } from './components/ArticleSelector';
import { ProjectGrid } from './components/ProjectGrid';
import { ContextualBar } from './components/ContextualBar';

export default function SocialGenerator() {
  // --- States ---
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeMode, setActiveMode] = useState('article'); // 'article' | 'ai'
  const [aiForm, setAiForm] = useState({
    topic: '',
    pdf_file: null,
    tone: 'Profesional',
    format: 'reel'
  });
  const [generatedContent, setGeneratedContent] = useState(null);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('socialGenTab') || 'video');
  const [activeProjectName, setActiveProjectName] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [saveAsProjectName, setSaveAsProjectName] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [watermarkImage, setWatermarkImage] = useState(null);
  const [doctorLogoBase64, setDoctorLogoBase64] = useState(null);
  const [history, setHistory] = useState([]);
  const [scale, setScale] = useState(1);
  const [videoStyles, setVideoStyles] = useState(DEFAULT_VIDEO_STYLES);
  const [slideDuration, setSlideDuration] = useState(3);
  const [transitionType, setTransitionType] = useState('fade');
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [savingType, setSavingType] = useState(null); // 'save' | 'saveAs' | null
  const [saveProgress, setSaveProgress] = useState(0);
  const [lastGeneratedBlogContent, setLastGeneratedBlogContent] = useState(null);
  const saveProgressRef = useRef(null);
  const [siteConfig, setSiteConfig] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API_URL}/arko/config`);
        if (response.ok) {
           const data = await response.json();
           setSiteConfig(data);
        }
      } catch (err) {
        console.error('Error fetching config:', err);
      }
    };
    fetchConfig();
  }, []);

  // --- Refs ---
  const editorWrapperRef = useRef(null);
  const mobileEditorWrapperRef = useRef(null);

  // --- External Stores ---
  const showToast = (msg, type) => type === 'error' ? toast.error(msg) : toast.success(msg);
  const { user: doctor } = useAuthStore();

  // --- Custom Hooks ---
  const designer = useSlideDesigner();
  
  const { isPlaying, setIsPlaying, currentVideoSlide, setCurrentVideoSlide } = useVideoPlayback(
    activeTab, generatedContent, false, slideDuration
  );

  // Sync video playback slide with canvas
  useEffect(() => {
    if (activeTab === 'video') {
      designer.canvas.setCurrentSlidePage(currentVideoSlide);
    }
  }, [currentVideoSlide, activeTab]);

  useEffect(() => {
    setEditingIndex(null);
    designer.canvas.setCurrentSlidePage(0);
  }, [activeTab]);

  const { 
    audioRef, previewAudioRef, selectedAudio, setSelectedAudio, 
    customAudioUrl, setCustomAudioUrl, prelisteningTrack, setPrelisteningTrack, 
    getActiveAudioSrc, userAudios, loadingAudios, handleUploadAudio, handleDeleteAudio,
    volume, setVolume
  } = useAudioPlayback(activeTab, isPlaying, setIsPlaying, showToast);



  const { isMobileFullscreen, enterMobileFullscreen, exitMobileFullscreen } = useMobileFullscreen(
    isMobile, generatedContent
  );

  const transformer = useDragTransform(designer.canvas.updateExtraElement, scale, {
    setLogoPos: designer.design.setLogoPos,
    setDoctorNamePos: designer.design.setDoctorNamePos,
    setDividerPos: designer.design.setDividerPos
  });

  const { isExporting, exportProgress, handleExportVideo, exportStatus } = useVideoExport(
    generatedContent, videoStyles, slideDuration, transitionType, transitionDuration, selectedPost, audioRef, getActiveAudioSrc, showToast,
    designer
  );

  const exporter = useExport(selectedPost, designer, generatedContent);

  // --- Initial Data Load ---
  useEffect(() => {
    loadPosts();
    if (doctor?.logo_url) {
      fetchLogoAsBase64();
    }
  }, [doctor?.id, doctor?.logo_url]);

  // --- Responsive Logic ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleResize = (width, height) => {
      let s;
      if (activeTab === 'video') {
        s = Math.min(1, (width - 20) / 410, (height - 50) / 728);
      } else {
        s = Math.min(1, (width - 50) / 410);
      }
      setScale(Math.max(0.4, s));
    };

    const ro = new ResizeObserver((entries) => {
      for (let entry of entries) handleResize(entry.contentRect.width, entry.contentRect.height);
    });

    if (editorWrapperRef.current) ro.observe(editorWrapperRef.current);
    if (mobileEditorWrapperRef.current) ro.observe(mobileEditorWrapperRef.current);

    return () => {
      window.removeEventListener('resize', checkMobile);
      ro.disconnect();
    };
  }, []);

  // --- Handlers ---
  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await blogService.getMyPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Error al cargar artículos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogoAsBase64 = async () => {
    try {
      const url = getImageUrl(doctor.logo_url);
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => setDoctorLogoBase64(reader.result);
      reader.readAsDataURL(blob);
    } catch (e) {
      setDoctorLogoBase64(getImageUrl(doctor.logo_url));
    }
  };

  const pushToHistory = (content) => {
    setHistory(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(content))]);
  };

  const handleGenerate = async (genType, instructions = null) => {
    if (!selectedPost) {
      showToast('Selecciona un artículo primero', 'error');
      return;
    }
    setGenerating(true);
    try {
      const result = await blogService.generateSocialContent(selectedPost.id, genType, instructions, generatedContent);
      console.log(`[Arko360] AI Result (${genType}):`, result);
      
      setGeneratedContent(result);
      setCurrentVideoSlide(0);
      // REPARACIÓN: Soporte robusto para 'reel', 'video' o 'carousel'
      if (genType === 'carousel') {
        setActiveTab('carousel');
      } else {
        setActiveTab('video');
      }
      setSelectedAudio(null);
      setCustomAudioUrl(null);
      showToast(`${genType === 'carousel' ? 'Carrusel' : 'Video'} generado con éxito`, 'success');
    } catch (error) {
      console.error('Error generating content:', error);
      showToast('Error al generar contenido con IA', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAiGenerateSocial = async (aiFormOptions) => {
    setGenerating(true);
    try {
      let blogContent = lastGeneratedBlogContent;
      
      const hasTopicChanged = aiFormOptions.topic !== aiForm?.topic || aiFormOptions.pdf_file !== aiForm?.pdf_file;
      const isRefinementOnly = aiFormOptions.instructions && !hasTopicChanged && lastGeneratedBlogContent;

      if (!isRefinementOnly) {
        showToast('Generando contenido base con IA...', 'info');
        blogContent = await blogService.generateAI({
          topic: aiFormOptions.topic,
          pdf_file: aiFormOptions.pdf_file,
          tone: aiFormOptions.tone || 'Profesional',
          target_audience: 'Arquitectos e Ingenieros',
          max_words: 500
        });
        setLastGeneratedBlogContent(blogContent);
      } else {
        showToast('Aplicando mejoras al contenido social...', 'info');
      }
      
      showToast('Estructurando formato social...', 'info');
      
      const result = await blogService.generateSocialFromContent(
        blogContent.title || aiFormOptions.topic || 'Mi Contenido',
        blogContent.generated_content,
        aiFormOptions.format || 'reel',
        aiFormOptions.instructions || null,
        generatedContent
      );
      
      setGeneratedContent(result);
      setCurrentVideoSlide(0);
      
      if (aiFormOptions.format === 'carousel') {
        setActiveTab('carousel');
      } else {
        setActiveTab('video');
      }
      setSelectedAudio(null);
      setCustomAudioUrl(null);
      
      showToast('¡Contenido social creado con éxito!', 'success');
    } catch (error) {
      console.error('[Arko360] Error in handleAiGenerateSocial:', error);
      showToast(error.response?.data?.detail || 'Error al generar contenido con IA', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleConvertToVideo = async () => {
    if (!generatedContent?.slides) return;
    setGenerating(true);
    try {
      const carouselText = generatedContent.slides.map(s => `${s.title}\n${s.content}`).join('\n\n');
      const title = activeProjectName || selectedPost?.title || 'Mi Video';
      const result = await blogService.generateSocialFromContent(title, carouselText, 'video');
      setGeneratedContent(prev => ({ ...prev, video_slides: result.video_slides, music_suggestion: result.music_suggestion, type: 'video' }));
      setActiveTab('video');
      setCurrentVideoSlide(0);
      setSelectedAudio(null);
      setCustomAudioUrl(null);
      showToast('¡Carrusel convertido a video!', 'success');
    } catch (error) {
      showToast('Error al convertir a video', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadProject = (project) => {
    const content = designer.canvas.loadProject(project);
    if (content) {
      setGeneratedContent(content);
      if (content.transformerState) {
        transformer.loadState(content.transformerState);
      } else {
        transformer.loadState({});
      }
      if (content.videoSettings) {
        if (content.videoSettings.videoStyles) setVideoStyles(content.videoSettings.videoStyles);
        if (content.videoSettings.selectedAudio) setSelectedAudio(content.videoSettings.selectedAudio);
        if (content.videoSettings.slideDuration) setSlideDuration(content.videoSettings.slideDuration);
        if (content.videoSettings.customAudioUrl) setCustomAudioUrl(content.videoSettings.customAudioUrl);
        setActiveTab(content.type === 'video' || content.video_slides ? 'video' : 'carousel');
      } else {
        setActiveTab('carousel');
      }
      setActiveProjectName(project.name || null);
      setActiveProjectId(project.id || null);
      showToast(`Proyecto "${project.name}" cargado`, 'success');
    }
  };

  const startSaveProgress = () => {
    setSaveProgress(0);
    let current = 0;
    saveProgressRef.current = setInterval(() => {
      current += Math.random() * 15 + 5; // avance aleatorio entre 5-20%
      if (current >= 90) { current = 90; clearInterval(saveProgressRef.current); }
      setSaveProgress(Math.round(current));
    }, 200);
  };

  const stopSaveProgress = (success = true) => {
    clearInterval(saveProgressRef.current);
    setSaveProgress(success ? 100 : 0);
    setTimeout(() => { setSavingType(null); setSaveProgress(0); }, 600);
  };

  const handleSaveProject = async () => {
    if (!activeProjectId || !activeProjectName) {
      return handleSaveProjectAs();
    }

    setSavingType('save');
    startSaveProgress();
    try {
      const videoSettings = { videoStyles, selectedAudio, slideDuration, customAudioUrl };
      const contentToSave = { ...generatedContent, videoSettings, transformerState: transformer.state };
      const ok = await designer.canvas.saveProject(activeProjectName, contentToSave, activeProjectId);
      
      if (ok) {
        stopSaveProgress(true);
        showToast(`"${activeProjectName}" actualizado con éxito`, 'success');
      } else {
        stopSaveProgress(false);
        showToast('No se pudo actualizar el proyecto', 'error');
      }
    } catch (error) {
      console.error('[Arko360] Error updating project:', error);
      stopSaveProgress(false);
      showToast('Error crítico al actualizar el proyecto', 'error');
    }
  };

  const handleSaveProjectAs = () => {
    setSaveAsProjectName(activeProjectName || selectedPost?.title || 'Mi Carrusel');
    setIsSaveAsModalOpen(true);
  };

  const handleSaveProjectAsConfirm = async () => {
    const name = saveAsProjectName.trim();
    if (!name) return;
    
    setIsSaveAsModalOpen(false);
    setSavingType('saveAs');
    startSaveProgress();
    try {
      const videoSettings = { videoStyles, selectedAudio, slideDuration, customAudioUrl };
      const contentToSave = { ...generatedContent, videoSettings, transformerState: transformer.state };
      const ok = await designer.canvas.saveProject(name, contentToSave, null);
      
      if (ok) {
        setActiveProjectName(name);
        stopSaveProgress(true);
        showToast(`Nuevo proyecto "${name}" creado con éxito`, 'success');
      } else {
        stopSaveProgress(false);
        showToast('No se pudo crear el nuevo proyecto', 'error');
      }
    } catch (error) {
      console.error('[Arko360] Error creating new project:', error);
      stopSaveProgress(false);
      showToast('Error crítico al crear el nuevo proyecto', 'error');
    }
  };

  const handleRemoveSlide = (index) => {
    if (generatedContent.slides.length <= 1) return;
    const newSlides = generatedContent.slides.filter((_, i) => i !== index);
    setGeneratedContent({ ...generatedContent, slides: newSlides });
    designer.canvas.setCurrentSlidePage(Math.max(0, designer.canvas.currentSlidePage - 1));
  };

  const handleAddImage = (index, e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        pushToHistory(generatedContent);
        const newSlides = [...generatedContent.slides];
        if (!newSlides[index].customImages) newSlides[index].customImages = [];
        newSlides[index].customImages.push(reader.result);
        setGeneratedContent({ ...generatedContent, slides: newSlides });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (slideIndex, imgIndex) => {
    const slidesProp = activeTab === 'video' ? 'video_slides' : 'slides';
    const newSlides = [...generatedContent[slidesProp]];
    if (newSlides[slideIndex]?.customImages) {
      newSlides[slideIndex].customImages = newSlides[slideIndex].customImages.filter((_, i) => i !== imgIndex);
      setGeneratedContent({ ...generatedContent, [slidesProp]: newSlides });
    }
  };

  const handleAddImageToVideoSlide = (index, e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newSlides = [...generatedContent.video_slides];
        if (!newSlides[index].customImages) newSlides[index].customImages = [];
        newSlides[index].customImages.push(reader.result);
        setGeneratedContent({ ...generatedContent, video_slides: newSlides });
      };
      reader.readAsDataURL(file);
    }
  };



  if (isMobile) {
    return (
      <MobileLayout 
        posts={posts} selectedPost={selectedPost} setSelectedPost={setSelectedPost}
        generating={generating} generatedContent={generatedContent} setGeneratedContent={setGeneratedContent}
        handleGenerate={handleGenerate} handleTestDesign={() => { setActiveTab('carousel'); setGeneratedContent({ type: 'carousel', slides: [{ title: 'Prueba', content: 'Contenido' }] }); }}
        showProjects={showProjects} setShowProjects={setShowProjects}
        designer={designer} handleLoadProject={handleLoadProject}
        activeProjectName={activeProjectName} isMobileFullscreen={isMobileFullscreen}
        loadingProjects={designer.canvas.loadingProjects}
        exitMobileFullscreen={exitMobileFullscreen} scale={scale} doctor={doctor}
        doctorLogoBase64={doctorLogoBase64} transformer={transformer} watermarkImage={watermarkImage}
        handleRemoveSlide={handleRemoveSlide} handleAddImage={handleAddImage}
        handleRemoveImage={handleRemoveImage} setEditingIndex={setEditingIndex}
        setPreviewIndex={setPreviewIndex} showToast={showToast}
        handleConvertToVideo={handleConvertToVideo} handleSaveProject={handleSaveProject}
        handleSaveProjectAs={handleSaveProjectAs} handleSaveTemplate={() => {}}
        activeProjectId={activeProjectId} exporter={exporter}
        activeTab={activeTab} setActiveTab={setActiveTab}
        videoStyles={videoStyles} setVideoStyles={setVideoStyles}
        slideDuration={slideDuration} setSlideDuration={setSlideDuration}
        isPlaying={isPlaying} setIsPlaying={setIsPlaying}
        currentVideoSlide={currentVideoSlide} setCurrentVideoSlide={setCurrentVideoSlide}
        selectedAudio={selectedAudio} setSelectedAudio={setSelectedAudio}
        userAudios={userAudios} loadingAudios={loadingAudios}
        handleUploadAudio={handleUploadAudio} handleDeleteAudio={handleDeleteAudio}
        prelisteningTrack={prelisteningTrack} setPrelisteningTrack={setPrelisteningTrack}
        customAudioUrl={customAudioUrl} setCustomAudioUrl={setCustomAudioUrl}
        audioRef={audioRef} previewAudioRef={previewAudioRef}
        isExporting={isExporting} exportProgress={exportProgress}
        handleExportVideo={handleExportVideo} handleAddImageToVideoSlide={handleAddImageToVideoSlide}
        enterMobileFullscreen={enterMobileFullscreen}
        exportStatus={exportStatus}
        savingType={savingType} saveProgress={saveProgress}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        aiForm={aiForm}
        setAiForm={setAiForm}
        handleAiGenerateSocial={handleAiGenerateSocial}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 font-manrope">
      <div className="max-w-[1480px] mx-auto px-4 pt-6">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <FiCpu className="text-indigo-600" /> Editor Arko360
          </h1>
        </header>

        <div className="space-y-8">
          <ArticleSelector 
            posts={posts} selectedPost={selectedPost} setSelectedPost={setSelectedPost}
            setGeneratedContent={setGeneratedContent} showProjects={showProjects}
            setShowProjects={setShowProjects} handleGenerate={handleGenerate}
            handleTestDesign={() => { setActiveTab('carousel'); setGeneratedContent({ type: 'carousel', slides: [{ title: 'Prueba', content: 'Contenido' }] }); }}
            generating={generating}
            generatedContent={generatedContent}
            projects={designer.canvas.projects}
            loadingProjects={designer.canvas.loadingProjects}
            onLoadProject={(p) => { handleLoadProject(p); setShowProjects(false); }}
            onDeleteProject={designer.canvas.deleteProject}
            activeProjectId={activeProjectId}
            activeMode={activeMode}
            setActiveMode={setActiveMode}
            aiForm={aiForm}
            setAiForm={setAiForm}
            handleAiGenerateSocial={handleAiGenerateSocial}
            primaryColor={doctor?.theme_primary_color || '#4F46E5'}
          />

          {/* RESTAURACIÓN DEL LAYOUT ORIGINAL DE TABS */}
          {generatedContent && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 animate-fadeIn">
              {/* Left: Tab switcher */}
              <div className="flex bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => {
                    if (activeTab !== 'video') {
                      setActiveTab('video');
                      localStorage.setItem('socialGenTab', 'video');
                      setGeneratedContent(null);
                      setActiveProjectId(null);
                      setActiveProjectName(null);
                      setSelectedPost(null);
                      designer.canvas.setCurrentSlidePage(0);
                    }
                  }} 
                  className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'video' || activeTab === 'reel' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Editor de Video
                </button>
                <button 
                  onClick={() => {
                    if (activeTab !== 'carousel') {
                      setActiveTab('carousel');
                      localStorage.setItem('socialGenTab', 'carousel');
                      setGeneratedContent(null);
                      setActiveProjectId(null);
                      setActiveProjectName(null);
                      setSelectedPost(null);
                      designer.canvas.setCurrentSlidePage(0);
                    }
                  }} 
                  className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'carousel' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Editor de Carrusel
                </button>
              </div>

              {/* Center: Active project name */}
              {activeProjectName && (
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 max-w-xs">
                  <FiFolder className="text-indigo-500 flex-shrink-0" size={14} />
                  <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-tight truncate">{activeProjectName}</span>
                </div>
              )}

              {/* Right: Save buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={handleSaveProject} 
                  disabled={savingType !== null}
                  style={{ backgroundColor: 'rgb(205, 8, 87)' }}
                  className="relative px-8 py-3 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-pink-200 hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-80 overflow-hidden"
                >
                  {/* Animated progress bar underlay */}
                  {savingType === 'save' && (
                    <span 
                      className="absolute inset-0 bg-white/20 transition-all duration-300 origin-left"
                      style={{ transform: `scaleX(${saveProgress / 100})` }}
                    />
                  )}
                  {/* Circular spinner */}
                  {savingType === 'save' ? (
                    <>
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.8" />
                        <circle
                          cx="18" cy="18" r="15.9"
                          fill="none" stroke="white" strokeWidth="3.8"
                          strokeDasharray={`${saveProgress} 100`}
                          strokeLinecap="round"
                          transform="rotate(-90 18 18)"
                          style={{ transition: 'stroke-dasharray 0.3s ease' }}
                        />
                      </svg>
                      <span className="relative">{saveProgress}%</span>
                    </>
                  ) : (
                    <><FiSave /> Guardar</>
                  )}
                </button>
                <button 
                  onClick={handleSaveProjectAs} 
                  disabled={savingType !== null}
                  className="relative px-8 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-80 overflow-hidden"
                >
                  {/* Animated progress bar underlay */}
                  {savingType === 'saveAs' && (
                    <span 
                      className="absolute inset-0 bg-gray-200 dark:bg-gray-600 transition-all duration-300 origin-left"
                      style={{ transform: `scaleX(${saveProgress / 100})` }}
                    />
                  )}
                  {/* Circular spinner */}
                  {savingType === 'saveAs' ? (
                    <>
                      <svg className="w-4 h-4 flex-shrink-0 text-gray-400" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3.8" />
                        <circle
                          cx="18" cy="18" r="15.9"
                          fill="none" stroke="currentColor" strokeWidth="3.8"
                          strokeDasharray={`${saveProgress} 100`}
                          strokeLinecap="round"
                          transform="rotate(-90 18 18)"
                          style={{ transition: 'stroke-dasharray 0.3s ease' }}
                        />
                      </svg>
                      <span className="relative z-10">{saveProgress}%</span>
                    </>
                  ) : (
                    <><FiSave className="relative z-10" /> <span className="relative z-10">Guardar como...</span></>
                  )}
                </button>
              </div>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700">
              <ArkoLoader fullScreen={false} text="Cargando..." />
            </div>
          )}

          {generatedContent && !generating && (
            <div className="animate-fadeIn">

                <div className="flex gap-6">
                  <EnhancedSidebar 
                    design={designer.design} canvas={designer.canvas} 
                    transform={transformer.state} currentSlide={designer.canvas.currentSlidePage}
                    onAddElement={designer.canvas.addExtraElement} 
                    onDownload={activeTab === 'video' ? handleExportVideo : exporter.downloadCarousel}
                    onSave={handleSaveProject} onConvertToVideo={handleConvertToVideo}
                    isVideoMode={activeTab === 'video'}
                    selectedAudio={selectedAudio} setSelectedAudio={setSelectedAudio}
                    slideDuration={slideDuration} setSlideDuration={setSlideDuration}
                    userAudios={userAudios}
                    loadingAudios={loadingAudios}
                    handleUploadAudio={handleUploadAudio}
                    handleDeleteAudio={handleDeleteAudio}
                    isExporting={isExporting}
                    exportProgress={exportProgress}
                  />
                  <div className="flex-1 space-y-6 flex flex-col items-center justify-start pt-10">
                    <div ref={editorWrapperRef} className={`bg-white dark:bg-gray-800 rounded-[40px] ${activeTab === 'video' ? 'p-4 w-[320px] h-[570px] overflow-visible' : 'p-12 max-w-full min-h-[600px] w-full overflow-hidden'} shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center relative`}>
                      <div style={{ width: 410 * scale, height: (activeTab === 'video' ? 728 : 410) * scale }} className="relative flex items-center justify-center transition-all duration-300">
                        <div id="main-slide-canvas" className="absolute top-0 left-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
                          <SlideCanvas 
                            slide={activeTab === 'video' ? generatedContent.video_slides?.[designer.canvas.currentSlidePage] : generatedContent.slides?.[designer.canvas.currentSlidePage]}
                            index={designer.canvas.currentSlidePage}
                            doctor={doctor} doctorLogo={doctorLogoBase64}
                            siteConfig={siteConfig}
                            design={designer.design} canvas={designer.canvas}
                            transform={transformer.state} handlers={transformer.handlers}
                            watermark={watermarkImage} onEdit={setEditingIndex}
                            onPreview={setPreviewIndex} onRemove={handleRemoveSlide}
                            onAddImage={(e) => activeTab === 'video' ? handleAddImageToVideoSlide(designer.canvas.currentSlidePage, e) : handleAddImage(designer.canvas.currentSlidePage, e)}
                            isVideoMode={activeTab === 'video'}
                          />
                        </div>
                      </div>
                      
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 animate-fadeIn">
                        {/* Primary Pagination & Playback Pill */}
                        <div className="flex items-center gap-4 bg-white/95 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5">
                          <button 
                            onClick={() => designer.canvas.setCurrentSlidePage(Math.max(0, designer.canvas.currentSlidePage - 1))}
                            disabled={designer.canvas.currentSlidePage === 0}
                            className={`p-1.5 rounded-full transition-all ${designer.canvas.currentSlidePage === 0 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-white/20 active:scale-95'}`}
                          >
                            <FiChevronLeft size={16} />
                          </button>
                          <span className="text-xs font-black text-gray-700 dark:text-gray-300 min-w-[32px] text-center select-none uppercase tracking-wider">
                            {designer.canvas.currentSlidePage + 1} / {activeTab === 'video' ? (generatedContent.video_slides?.length || 0) : (generatedContent.slides?.length || 0)}
                          </span>
                          <button 
                            onClick={() => designer.canvas.setCurrentSlidePage(Math.min((activeTab === 'video' ? (generatedContent.video_slides?.length || 0) : (generatedContent.slides?.length || 0)) - 1, designer.canvas.currentSlidePage + 1))}
                            disabled={designer.canvas.currentSlidePage >= (activeTab === 'video' ? (generatedContent.video_slides?.length || 0) : (generatedContent.slides?.length || 0)) - 1}
                            className={`p-1.5 rounded-full transition-all ${designer.canvas.currentSlidePage >= (activeTab === 'video' ? (generatedContent.video_slides?.length || 0) : (generatedContent.slides?.length || 0)) - 1 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-white/20 active:scale-95'}`}
                          >
                            <FiChevronRight size={16} />
                          </button>

                          {activeTab === 'video' && (
                            <>
                              <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                              <button
                                onClick={() => {
                                  setIsPlaying(false);
                                  designer.canvas.setCurrentSlidePage(0);
                                  setCurrentVideoSlide(0);
                                }}
                                className="p-1.5 rounded-full transition-all text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-white/20 active:scale-95"
                                title="Detener y volver al inicio"
                              >
                                <div className="w-3 h-3 bg-current rounded-sm"></div>
                              </button>
                              <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className={`p-2 rounded-full transition-all ${isPlaying ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'} shadow-md transform hover:scale-105 active:scale-95`}
                                title={isPlaying ? "Pausar" : "Reproducir"}
                              >
                                {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
                              </button>
                            </>
                          )}
                        </div>

                        {/* Volume Control Pill (Separate to avoid width overlap) */}
                        {activeTab === 'video' && (
                          <div className="flex items-center gap-3 bg-white/95 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-1.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Volumen:</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.05"
                              value={volume}
                              onChange={(e) => setVolume(parseFloat(e.target.value))}
                              className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                              title={`Volumen: ${Math.round(volume * 100)}%`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      <ContextualBar 
        selectedId={designer.canvas.selectedExtraId || designer.canvas.selectedImageId}
        canvas={designer.canvas}
        updateElement={designer.canvas.updateExtraElement}
        removeElement={designer.canvas.removeExtraElement}
        deselectElement={designer.canvas.selectElement}
        isImage={!!designer.canvas.selectedImageId}
        imagePositions={transformer.state.imagePositions}
        updateImage={transformer.handlers.updateImage}
        onRemoveImage={handleRemoveImage}
      />

      {/* Edit Content Modal */}
      {editingIndex !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Editar Diapositiva {editingIndex + 1}</h3>
              <button onClick={() => setEditingIndex(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                <FiX size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Título</label>
                <input 
                  type="text"
                  value={generatedContent.slides[editingIndex]?.title || ''}
                  onChange={(e) => {
                    const newSlides = [...generatedContent.slides];
                    if (newSlides[editingIndex]) {
                      newSlides[editingIndex].title = e.target.value;
                      setGeneratedContent({ ...generatedContent, slides: newSlides });
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Contenido</label>
                <textarea 
                  rows={5}
                  value={generatedContent.slides[editingIndex]?.content || ''}
                  onChange={(e) => {
                    const newSlides = [...generatedContent.slides];
                    if (newSlides[editingIndex]) {
                      newSlides[editingIndex].content = e.target.value;
                      setGeneratedContent({ ...generatedContent, slides: newSlides });
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm leading-relaxed"
                />
              </div>
              <button 
                onClick={() => setEditingIndex(null)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      <PreviewModal 
        isOpen={previewIndex !== null} currentIndex={previewIndex}
        total={generatedContent?.slides?.length || 0} slides={generatedContent?.slides || []}
        onClose={() => setPreviewIndex(null)} onNavigate={setPreviewIndex}
        renderSlide={(slide, i, isPrev) => (
          <SlideCanvas slide={slide} index={i} isPreview={isPrev} doctor={doctor} doctorLogo={doctorLogoBase64} siteConfig={siteConfig} design={designer.design} canvas={designer.canvas} transform={transformer.state} watermark={watermarkImage} handlers={transformer.handlers} />
        )}
      />

      <Modal
        isOpen={isSaveAsModalOpen}
        onClose={() => setIsSaveAsModalOpen(false)}
        title="Guardar Como..."
        size="alert"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ingresa un nombre para el nuevo proyecto:
          </p>
          <input
            type="text"
            autoFocus
            value={saveAsProjectName}
            onChange={(e) => setSaveAsProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveProjectAsConfirm();
            }}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-500 focus:outline-none dark:text-white"
            placeholder="Nombre del proyecto..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsSaveAsModalOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveProjectAsConfirm}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
            >
              Guardar
            </button>
          </div>
        </div>
      </Modal>

      {/* Hidden audio elements for playback */}
      <audio ref={audioRef} style={{ display: 'none' }} crossOrigin="anonymous" />
      <audio ref={previewAudioRef} style={{ display: 'none' }} crossOrigin="anonymous" />
    </div>
  );
}



