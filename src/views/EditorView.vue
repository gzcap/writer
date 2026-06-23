<script setup lang="ts">import { ref, inject, watch, nextTick, computed } from "vue";
import { Plus, Search, User, Setting } from "@element-plus/icons-vue";
import { ElMessageBox, ElMessage } from "element-plus";
import type { Work, Chapter, Volume, AppState } from "../types";
const appState = inject<AppState>("appState")!;
const loadChapter = inject<(id: string) => void>("loadChapter")!;
const createNewChapter = inject<() => void>("createNewChapter")!;
const createNewVolume = inject<() => void>("createNewVolume")!;
const deleteVolume = inject<(volumeId: string) => void>("deleteVolume")!;
const deleteChapter = inject<(chapterId: string) => void>("deleteChapter")!;
const updateVolume = inject<(volumeId: string, title: string, description: string) => void>("updateVolume")!;
const reorderVolumes = inject<(volumeIds: string[]) => void>("reorderVolumes")!;
const reorderChapters = inject<(volumeId: string, chapterIds: string[]) => void>("reorderChapters")!;
const autoSave = inject<() => void>("autoSave")!;
const saveImmediately = inject<() => void>("saveImmediately")!;
const markChapterModified = inject<(chapterId: string) => void>("markChapterModified")!;
const moveChapter = inject<(chapterId: string, direction: 'up' | 'down') => void>("moveChapter")!;
const chapterTitle = ref("");
const wordCount = ref(0);
const currentWork = ref<Work | null>(null);
const currentChapter = ref<Chapter | null>(null);
const searchQuery = ref("");
const expandedSections = ref<Set<string>>(new Set());
const activeVolumeMenu = ref<string | null>(null);

// 分卷简介对话框
const showVolumeDescDialog = ref(false);
const editingVolumeId = ref<string | null>(null);
const editingVolumeTitle = ref("");
const editingVolumeDesc = ref("");

// 拖拽状态
const draggedVolumeId = ref<string | null>(null);
const draggedChapterId = ref<string | null>(null);
const dragOverVolumeId = ref<string | null>(null);
const dragOverChapterId = ref<string | null>(null);

// 编辑器状态
const editorRef = ref<HTMLDivElement | null>(null);
const isFullscreen = ref(false);
const isSaved = ref(true);
const lastSavedTime = ref<number | null>(null);
const saveTimer = ref<number | null>(null);

// 格式化状态
const isBold = ref(false);
const isItalic = ref(false);
const isUnderline = ref(false);
const currentFontSize = ref(16);
const currentFontFamily = ref("微软雅黑");
const currentLineHeight = ref(1.8);

// 写作统计
const writingTime = ref(0);
const writingTimer = ref<number | null>(null);
const startTime = ref<number | null>(null);

// 字数统计
const chapterCharCount = ref(0);
const chapterParagraphCount = ref(0);

// 计划字数
const planWordCount = ref(4600);

// 计算字数（中文按字，英文按词）
const calculateWordCount = (content: string) => {
  const chinese = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const english = (content.match(/[a-zA-Z]+/g) || []).join('');
  const englishWords = english ? english.split(/\s+/).filter(w => w.length > 0).length : 0;
  return chinese + englishWords;
};

// 计算段落数
const calculateParagraphCount = (content: string) => {
  if (!content.trim()) return 0;
  return content.split(/\n+/).filter(p => p.trim().length > 0).length;
};

// 编辑器格式化命令
const execCommand = (command: string, value: string | undefined = undefined) => {
  document.execCommand(command, false, value);
  editorRef.value?.focus();
  updateFormatState();
};

// 格式化状态更新
const updateFormatState = () => {
  isBold.value = document.queryCommandState('bold');
  isItalic.value = document.queryCommandState('italic');
  isUnderline.value = document.queryCommandState('underline');
};

// 格式化按钮操作
const toggleBold = () => execCommand('bold');
const toggleItalic = () => execCommand('italic');
const toggleUnderline = () => execCommand('underline');

// 设置字体大小
const setFontSize = (size: number) => {
  currentFontSize.value = size;
  execCommand('fontSize', String(size));
};

// 设置字体
const setFontFamily = (family: string) => {
  currentFontFamily.value = family;
  execCommand('fontName', family);
};

// 设置行高
const setLineHeight = (height: number) => {
  currentLineHeight.value = height;
  if (editorRef.value) {
    editorRef.value.style.lineHeight = String(height);
  }
};

// 插入分割线
const insertDivider = () => {
  const divider = document.createElement('hr');
  divider.style.border = 'none';
  divider.style.borderTop = '1px dashed #ccc';
  divider.style.margin = '16px 0';
  
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.insertNode(divider);
    range.collapse(false);
  }
};

// 一键排版
const formatContent = () => {
  if (!editorRef.value) return;
  
  let content = editorRef.value.innerHTML;
  content = content.replace(/<div><br><\/div>/g, '<div><br></div>');
  content = content.replace(/(<div><br><\/div>){3,}/g, '<div><br></div><div><br></div>');
  content = content.replace(/<div([^>]*)>　+/g, '<div$1>');
  content = content.replace(/　+/g, ' ');
  
  editorRef.value.innerHTML = content;
};

// 全屏切换
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  if (isFullscreen.value) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
};

// 获取纯文本内容
const getPlainText = () => {
  if (!editorRef.value) return '';
  return editorRef.value.innerText || editorRef.value.textContent || '';
};

// 从编辑器获取HTML内容
const getEditorContent = () => {
  if (!editorRef.value) return '';
  return editorRef.value.innerHTML;
};

// 设置编辑器内容
const setEditorContent = (content: string) => {
  if (editorRef.value) {
    editorRef.value.innerHTML = content;
    updateWordCount(getPlainText());
  }
};

// 开始写作计时
const startWritingTimer = () => {
  if (writingTimer.value) return;
  startTime.value = Date.now();
  writingTimer.value = window.setInterval(() => {
    if (startTime.value) {
      writingTime.value = Math.floor((Date.now() - startTime.value) / 1000);
    }
  }, 1000);
};

// 停止写作计时
const stopWritingTimer = () => {
  if (writingTimer.value) {
    clearInterval(writingTimer.value);
    writingTimer.value = null;
  }
};

// 格式化写作时间
const formatWritingTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}小时${minutes}分`;
  }
  if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  }
  return `${secs}秒`;
};

// 延迟保存
const debouncedSave = () => {
  if (saveTimer.value) {
    clearTimeout(saveTimer.value);
  }
  isSaved.value = false;
  saveTimer.value = window.setTimeout(() => {
    syncContentToState();
    isSaved.value = true;
    lastSavedTime.value = Date.now();
    autoSave();
  }, 1000);
};

// 同步内容到状态
const syncContentToState = () => {
  const work = getWork();
  const chapter = getChapter();
  if (work && chapter) {
    chapter.content = getEditorContent();
    chapter.wordCount = calculateWordCount(getPlainText());
    chapter.updatedAt = Date.now();
    work.updatedAt = Date.now();
    markChapterModified(chapter.id);
  }
};

// 计划进度
const planProgress = computed(() => {
  if (planWordCount.value === 0) return 0;
  return Math.min(100, Math.round((wordCount.value / planWordCount.value) * 100));
});

const getVolumeChapters = (volume: Volume) => {
  if (!currentWork.value) return [];
  return currentWork.value.chapters.filter((ch) => volume.chapterIds.includes(ch.id));
};

const getVolumeWords = (volume: Volume) => {
  const chapters = getVolumeChapters(volume);
  return chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
};

// 获取排序后的卷列表
const getSortedVolumes = () => {
  if (!currentWork.value) return [];
  return [...currentWork.value.volumes].sort((a, b) => a.order - b.order);
};

const createNewChapterInVolume = (volumeId: string) => {
  createNewChapter();
  const work = getWork();
  if (work) {
    const volume = work.volumes.find((v) => v.id === volumeId);
    if (volume && work.chapters.length > 0) {
      const newChapter = work.chapters[work.chapters.length - 1];
      if (!volume.chapterIds.includes(newChapter.id)) {
        volume.chapterIds.push(newChapter.id);
      }
    }
  }
};

const toggleVolumeMenu = (volumeId: string) => {
  activeVolumeMenu.value = activeVolumeMenu.value === volumeId ? null : volumeId;
};

const startEditVolume = (volume: Volume) => {
  editingVolumeId.value = volume.id;
  editingVolumeTitle.value = volume.title;
  editingVolumeDesc.value = volume.description || '';
  showVolumeDescDialog.value = true;
  activeVolumeMenu.value = null;
};

const saveVolumeDesc = () => {
  if (editingVolumeId.value && editingVolumeTitle.value) {
    updateVolume(editingVolumeId.value, editingVolumeTitle.value, editingVolumeDesc.value);
    showVolumeDescDialog.value = false;
    editingVolumeId.value = null;
    editingVolumeTitle.value = "";
    editingVolumeDesc.value = "";
  }
};

const cancelVolumeDesc = () => {
  showVolumeDescDialog.value = false;
  editingVolumeId.value = null;
  editingVolumeTitle.value = "";
  editingVolumeDesc.value = "";
};

// 卷拖拽处理
const onVolumeDragStart = (e: DragEvent, volumeId: string) => {
  draggedVolumeId.value = volumeId;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', volumeId);
  }
};

const onVolumeDragOver = (e: DragEvent, volumeId: string) => {
  e.preventDefault();
  if (draggedVolumeId.value && draggedVolumeId.value !== volumeId) {
    dragOverVolumeId.value = volumeId;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }
};

const onVolumeDragLeave = () => {
  dragOverVolumeId.value = null;
};

const onVolumeDrop = (e: DragEvent, targetVolumeId: string) => {
  e.preventDefault();
  if (draggedVolumeId.value && draggedVolumeId.value !== targetVolumeId) {
    const sortedVolumes = getSortedVolumes();
    const draggedIndex = sortedVolumes.findIndex(v => v.id === draggedVolumeId.value);
    const targetIndex = sortedVolumes.findIndex(v => v.id === targetVolumeId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // 重新排序
      const newOrder = [...sortedVolumes.map(v => v.id)];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedVolumeId.value);
      
      reorderVolumes(newOrder);
    }
  }
  draggedVolumeId.value = null;
  dragOverVolumeId.value = null;
};

const onVolumeDragEnd = () => {
  draggedVolumeId.value = null;
  dragOverVolumeId.value = null;
};

// 章节拖拽处理
const onChapterDragStart = (e: DragEvent, chapterId: string, volumeId: string) => {
  draggedChapterId.value = chapterId;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', chapterId);
    e.dataTransfer.setData('volumeId', volumeId);
  }
};

const onChapterDragOver = (e: DragEvent, chapterId: string) => {
  e.preventDefault();
  if (draggedChapterId.value && draggedChapterId.value !== chapterId) {
    dragOverChapterId.value = chapterId;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }
};

const onChapterDragLeave = () => {
  dragOverChapterId.value = null;
};

const onChapterDrop = (e: DragEvent, targetChapterId: string, volumeId: string) => {
  e.preventDefault();
  if (draggedChapterId.value && draggedChapterId.value !== targetChapterId) {
    const volume = currentWork.value?.volumes.find(v => v.id === volumeId);
    if (volume) {
      const chapters = getVolumeChapters(volume);
      const draggedIndex = chapters.findIndex(c => c.id === draggedChapterId.value);
      const targetIndex = chapters.findIndex(c => c.id === targetChapterId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // 重新排序
        const newOrder = [...volume.chapterIds];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedChapterId.value);
        
        reorderChapters(volumeId, newOrder);
      }
    }
  }
  draggedChapterId.value = null;
  dragOverChapterId.value = null;
};

const onChapterDragEnd = () => {
  draggedChapterId.value = null;
  dragOverChapterId.value = null;
};

const openOutlineModal = async () => {
  console.log("Outline button clicked!");
  if (!appState.currentWorkId) return;
  await openViewWindow(appState.currentWorkId, "outline");
};

const openDescriptionModal = async () => {
  console.log("Description button clicked!");
  if (!appState.currentWorkId) return;
  await openViewWindow(appState.currentWorkId, "description");
};

const openCharacterModal = async () => {
  console.log("Character button clicked!");
  if (!appState.currentWorkId) return;
  await openViewWindow(appState.currentWorkId, "character");
};

const openInspirationModal = async () => {
  console.log("Inspiration button clicked!");
  if (!appState.currentWorkId) return;
  await openViewWindow(appState.currentWorkId, "inspiration");
};

// 删除卷（带二次确认）
const handleDeleteVolume = async (volumeId: string) => {
  const volume = currentWork.value?.volumes.find(v => v.id === volumeId);
  if (!volume) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除卷 "${volume.title || '未命名卷'}" 吗？该卷下的所有章节也将被删除，删除后将无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await deleteVolume(volumeId);
    activeVolumeMenu.value = null;
    ElMessage.success('删除成功');
  } catch {
    // 用户取消
  }
};

// 删除章节（带二次确认）
const handleDeleteChapter = async (chapterId: string) => {
  const chapter = currentWork.value?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除章节 "${chapter.title || '未命名章节'}" 吗？删除后将无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await deleteChapter(chapterId);
    ElMessage.success('删除成功');
  } catch {
    // 用户取消
  }
};

// 打开新窗口显示视图
const openViewWindow = async (workId: string, viewType: string) => {
  console.log("openViewWindow called:", workId, viewType);
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const work = appState.works.find(w => w.id === workId);
    const windowTitle = {
      outline: "大纲",
      character: "角色",
      description: "简介",
      inspiration: "灵感"
    }[viewType] || "视图";
    
    const url = `/#/view?workId=${workId}&viewType=${viewType}&title=${encodeURIComponent(work?.title || '')}`;
    console.log("Creating window with URL:", url);
    
    const label = `view-${viewType}-${Date.now()}`;
    console.log("Window label:", label);
    
    new WebviewWindow(label, {
      width: 900,
      height: 600,
      resizable: true,
      minimizable: true,
      maximizable: true,
      title: windowTitle,
      url: url,
      titleBarStyle: "overlay",
      hiddenTitle: true,
    });
    
    console.log("Window created");
  } catch (error) {
    console.error("打开新窗口失败:", error);
    // Fallback: 在当前窗口打开
    window.location.hash = `/view?workId=${workId}&viewType=${viewType}`;
  }
};

const getWork = () => {
  return appState.works.find((w: Work) => w.id === appState.currentWorkId);
};

const getChapter = () => {
  const work = getWork();
  return work?.chapters.find((c: Chapter) => c.id === appState.currentChapterId);
};

const updateWordCount = (content: string) => {
  wordCount.value = calculateWordCount(content);
  chapterCharCount.value = content.length;
  chapterParagraphCount.value = calculateParagraphCount(content);
};

const loadCurrentChapter = () => {
  const work = getWork();
  const chapter = getChapter();
  currentWork.value = work || null;
  currentChapter.value = chapter || null;
  
  stopWritingTimer();
  writingTime.value = 0;
  
  if (chapter) {
    chapterTitle.value = chapter.title;
    nextTick(() => {
      setEditorContent(chapter.content);
      startWritingTimer();
    });
  } else {
    chapterTitle.value = '';
    if (editorRef.value) {
      editorRef.value.innerHTML = '';
    }
  }
};

const toggleSection = (sectionId: string) => {
  if (expandedSections.value.has(sectionId)) {
    expandedSections.value.delete(sectionId);
  } else {
    expandedSections.value.add(sectionId);
  }
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

watch(() => [appState.currentWorkId, appState.currentChapterId], () => {
  loadCurrentChapter();
}, { immediate: true });

// 章节标题变化时更新到 appState 并触发自动保存
watch(chapterTitle, (val) => {
  const work = getWork();
  const chapter = getChapter();
  if (work && chapter) {
    chapter.title = val;
    chapter.updatedAt = Date.now();
    work.updatedAt = Date.now();
    // 标记章节为已修改
    markChapterModified(chapter.id);
  }
  autoSave();
});

// 切换章节前立即保存
watch(() => appState.currentChapterId, () => {
  saveImmediately();
});
</script>

<template>
  <div class="editor-layout">
    <aside class="editor-sidebar-left">
      <div class="sidebar-header">
        <div class="search-box">
          <Search class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="全本"
            class="search-input"
          />
        </div>
        <div class="sidebar-actions">
          <el-button :icon="Plus" size="small" class="new-volume-btn" @click="createNewVolume">
            新建卷
          </el-button>
          <el-button :icon="Plus" size="small" class="new-chapter-btn-inline" @click="createNewChapter">
            新建章
          </el-button>
        </div>
      </div>
      
      <div class="sidebar-tabs">
        <button class="tab active">章节</button>
        <button class="tab">筛选</button>
      </div>
      
      <div class="chapter-tree">
        <div v-if="currentWork?.volumes.length === 0" class="empty-volume">
          <span>暂无卷</span>
        </div>
        <div 
          v-for="volume in getSortedVolumes()" 
          :key="volume.id" 
          class="volume-section"
          :class="{ dragging: draggedVolumeId === volume.id, 'drag-over': dragOverVolumeId === volume.id }"
          draggable="true"
          @dragstart="onVolumeDragStart($event, volume.id)"
          @dragover="onVolumeDragOver($event, volume.id)"
          @dragleave="onVolumeDragLeave"
          @drop="onVolumeDrop($event, volume.id)"
          @dragend="onVolumeDragEnd"
        >
          <div
            class="volume-header"
            @click="toggleSection(volume.id)"
          >
            <span class="expand-icon">{{ expandedSections.has(volume.id) ? '▼' : '▶' }}</span>
            <span class="volume-title">{{ volume.title || "未命名卷" }}</span>
            <span class="volume-count">{{ getVolumeChapters(volume).length }}章 {{ getVolumeWords(volume) }}字</span>
            <button class="volume-add-chapter" @click.stop="createNewChapterInVolume(volume.id)">
              <span class="add-icon">+</span>
            </button>
            <button
              class="volume-more-btn"
              @click.stop="toggleVolumeMenu(volume.id)"
            >
              <span class="more-icon">⋯</span>
            </button>
            <!-- 卷菜单 -->
            <div 
              v-if="activeVolumeMenu === volume.id" 
              class="volume-menu"
              @click.stop
            >
              <div class="menu-header">
                <div class="menu-title">{{ volume.title || "未命名卷" }}</div>
                <div class="menu-info">{{ getVolumeChapters(volume).length }}章 {{ getVolumeWords(volume) }}字</div>
              </div>
              <div class="menu-divider"></div>
              <div class="menu-item" @click="startEditVolume(volume)">
                分卷简介
              </div>
              <div class="menu-item" @click="createNewChapterInVolume(volume.id); activeVolumeMenu = null">
                新建章节
              </div>
              <div class="menu-item">
                合并导出章节
              </div>
              <div class="menu-divider"></div>
              <div class="menu-item danger" @click="handleDeleteVolume(volume.id)">
                删除本卷
              </div>
            </div>
          </div>
          <div v-if="expandedSections.has(volume.id)" class="chapter-nested">
            <div
              v-for="chapter in getVolumeChapters(volume)"
              :key="chapter.id"
              class="chapter-item"
              :class="{ active: chapter.id === appState.currentChapterId, dragging: draggedChapterId === chapter.id, 'drag-over': dragOverChapterId === chapter.id }"
              draggable="true"
              @dragstart="onChapterDragStart($event, chapter.id, volume.id)"
              @dragover="onChapterDragOver($event, chapter.id)"
              @dragleave="onChapterDragLeave"
              @drop="onChapterDrop($event, chapter.id, volume.id)"
              @dragend="onChapterDragEnd"
              @click="loadChapter(chapter.id)"
            >
              <span class="chapter-title">{{ chapter.title || "未命名章节" }}</span>
              <span class="chapter-words">{{ chapter.wordCount }}字</span>
              <div class="chapter-actions">
                <button class="chapter-delete-btn" @click.stop="handleDeleteChapter(chapter.id)" title="删除章节">×</button>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="currentWork && currentWork.chapters && currentWork.chapters.length > 0 && currentWork.volumes && currentWork.volumes.length === 0" class="chapter-nested">
          <div
            v-for="chapter in currentWork?.chapters"
            :key="chapter.id"
            class="chapter-item"
            :class="{ active: chapter.id === appState.currentChapterId }"
            @click="loadChapter(chapter.id)"
          >
            <span class="chapter-title">{{ chapter.title || "未命名章节" }}</span>
            <span class="chapter-words">{{ chapter.wordCount }}字</span>
            <div class="chapter-actions">
              <button class="chapter-move-btn" @click.stop="moveChapter(chapter.id, 'up')" title="上移" :disabled="currentWork?.chapters.findIndex(c => c.id === chapter.id) === 0">↑</button>
              <button class="chapter-move-btn" @click.stop="moveChapter(chapter.id, 'down')" title="下移" :disabled="currentWork?.chapters.findIndex(c => c.id === chapter.id) === currentWork?.chapters.length - 1">↓</button>
              <button class="chapter-delete-btn" @click.stop="handleDeleteChapter(chapter.id)" title="删除章节">×</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
    
    <main class="editor-main" :class="{ fullscreen: isFullscreen }">
      <header class="editor-toolbar">
        <div class="toolbar-left">
          <div class="font-controls">
            <select class="font-select" :value="currentFontFamily" @change="setFontFamily(($event.target as HTMLSelectElement).value)">
              <option value="微软雅黑">微软雅黑</option>
              <option value="宋体">宋体</option>
              <option value="黑体">黑体</option>
              <option value="楷体">楷体</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
            </select>
            <select class="font-size-select" :value="currentFontSize" @change="setFontSize(Number(($event.target as HTMLSelectElement).value))">
              <option value="14">14</option>
              <option value="16">16</option>
              <option value="18">18</option>
              <option value="20">20</option>
              <option value="22">22</option>
              <option value="24">24</option>
            </select>
          </div>
          <div class="toolbar-divider"></div>
          <button class="tool-btn" :class="{ active: isBold }" @click="toggleBold" title="加粗">
            <span>B</span>
          </button>
          <button class="tool-btn" :class="{ active: isItalic }" @click="toggleItalic" title="斜体">
            <span style="font-style: italic">I</span>
          </button>
          <button class="tool-btn" :class="{ active: isUnderline }" @click="toggleUnderline" title="下划线">
            <span style="text-decoration: underline">U</span>
          </button>
          <div class="toolbar-divider"></div>
          <div class="line-height-controls">
            <button class="tool-btn" @click="setLineHeight(Math.max(1.2, currentLineHeight - 0.2))" title="减小行距">－</button>
            <span class="line-height-label">{{ currentLineHeight.toFixed(1) }}</span>
            <button class="tool-btn" @click="setLineHeight(Math.min(3, currentLineHeight + 0.2))" title="增大行距">＋</button>
          </div>
          <div class="toolbar-divider"></div>
          <button class="tool-btn" @click="formatContent" title="一键排版">
            <span>⊛</span>
            <span class="tool-label">排版</span>
          </button>
          <button class="tool-btn" @click="insertDivider" title="插入分割线">
            <span>―</span>
            <span class="tool-label">分割</span>
          </button>
        </div>
        
        <div class="toolbar-center">
          <span class="work-name">{{ currentWork?.title || "未命名作品" }}</span>
          <span class="chapter-name">{{ currentChapter?.title ? ` - ${currentChapter.title}` : '' }}</span>
          <span class="save-status" :class="{ saved: isSaved }">{{ isSaved ? '已保存' : '保存中...' }}</span>
        </div>
        
        <div class="toolbar-right">
          <button class="tool-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
            <span>{{ isFullscreen ? '⛶' : '⊡' }}</span>
            <span class="tool-label">{{ isFullscreen ? '退出' : '全屏' }}</span>
          </button>
          <button class="tool-btn" @click="() => {}" title="查找替换">
            <span>🔍</span>
            <span class="tool-label">查找</span>
          </button>
          <button class="tool-btn" @click="() => {}" title="历史版本">
            <span>↺</span>
            <span class="tool-label">历史</span>
          </button>
        </div>
      </header>
      
      <div class="editor-content-area">
        <div class="chapter-title-area">
          <input
            v-model="chapterTitle"
            class="chapter-title-input"
            placeholder="请输入章节标题..."
          />
        </div>
        
        <div class="editor-text-area">
          <div
            ref="editorRef"
            class="editor-content"
            contenteditable="true"
            :style="{ fontSize: currentFontSize + 'px', fontFamily: currentFontFamily, lineHeight: currentLineHeight }"
            @input="debouncedSave"
            @keyup="updateFormatState"
            @mouseup="updateFormatState"
            @focus="startWritingTimer"
            @blur="stopWritingTimer"
            placeholder="开始书写你的故事..."
          ></div>
        </div>
      </div>
      
      <footer class="editor-footer">
        <div class="footer-left">
          <span class="plan-info">
            <span class="plan-progress-bar">
              <span class="plan-progress-fill" :style="{ width: planProgress + '%' }"></span>
            </span>
            <span class="plan-text">计划: {{ wordCount }} / {{ planWordCount }}</span>
          </span>
        </div>
        <div class="footer-center">
          <span class="chapter-word-count">
            本章 {{ wordCount }} 字 | {{ chapterCharCount }} 字符 | {{ chapterParagraphCount }} 段
          </span>
        </div>
        <div class="footer-right">
          <span class="writing-time">写作: {{ formatWritingTime(writingTime) }}</span>
          <span class="update-time">更新: {{ currentChapter ? formatTime(currentChapter.updatedAt) : '--' }}</span>
        </div>
      </footer>
    </main>
    
    <aside class="editor-sidebar-right">
      <div class="side-tool-item" @click="() => {}">
        <span class="tool-icon">✓</span>
        <span class="tool-name">校对</span>
      </div>
      <div class="side-tool-item" @click="openDescriptionModal">
        <span class="tool-icon">📝</span>
        <span class="tool-name">简介</span>
      </div>
      <div class="side-tool-item" @click="openOutlineModal">
        <span class="tool-icon">📋</span>
        <span class="tool-name">大纲</span>
      </div>
      <div class="side-tool-item" @click="openCharacterModal">
        <User class="tool-icon el-icon" />
        <span class="tool-name">角色</span>
      </div>
      <div class="side-tool-item" @click="appState.showSettingModal = true">
        <Setting class="tool-icon el-icon" />
        <span class="tool-name">设定</span>
      </div>
      <div class="side-tool-item" @click="openInspirationModal">
        <span class="tool-icon">💡</span>
        <span class="tool-name">灵感</span>
      </div>
      <div class="side-tool-item" @click="() => {}">
        <span class="tool-icon">📚</span>
        <span class="tool-name">属性</span>
      </div>
    </aside>
    
    <!-- 分卷简介对话框 -->
    <el-dialog
      v-model="showVolumeDescDialog"
      title="分卷简介"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="卷名">
          <el-input v-model="editingVolumeTitle" placeholder="请输入卷名" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="editingVolumeDesc"
            type="textarea"
            :rows="6"
            placeholder="请输入分卷简介"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelVolumeDesc">取消</el-button>
          <el-button type="primary" @click="saveVolumeDesc">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.editor-layout {
  display: flex;
  height: 95vh;
  background: #fdf5e6;
}

.editor-sidebar-left {
  width: 220px;
  background: #f8f4eb;
  border-right: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #e8e4dc;
}

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 4px;
  padding: 6px 10px;
  margin-bottom: 8px;
}

.search-icon {
  width: 14px;
  height: 14px;
  color: #999;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 12px;
  background: transparent;
}

.sidebar-actions {
  display: flex;
  gap: 6px;
}

.new-volume-btn {
  flex: 1;
  background: #c45c3e;
  color: white;
  border: none;
  border-radius: 4px;
}

.new-volume-btn:hover {
  background: #a84a32;
}

.new-chapter-btn-inline {
  flex: 1;
  background: #4facfe;
  color: white;
  border: none;
  border-radius: 4px;
}

.new-chapter-btn-inline:hover {
  background: #3a9ce8;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #e8e4dc;
}

.tab {
  flex: 1;
  padding: 8px;
  text-align: center;
  border: none;
  background: transparent;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  position: relative;
}

.tab.active {
  color: #c45c3e;
  font-weight: 500;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: #c45c3e;
}

.works-related {
  padding: 8px 12px;
  border-bottom: 1px solid #e8e4dc;
}

.related-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.related-icon {
  width: 14px;
  height: 14px;
}

.chapter-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.volume-section {
  margin-bottom: 4px;
}

.volume-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  color: #333;
  background: white;
  border-radius: 4px;
  margin-bottom: 2px;
  position: relative;
}

.expand-icon {
  width: 14px;
  height: 14px;
  margin-right: 6px;
  color: #999;
}

.volume-title {
  flex: 1;
}

.volume-count {
  font-size: 11px;
  color: #999;
  margin-right: 6px;
}

.edit-icon,
.delete-icon {
  width: 14px;
  height: 14px;
  color: #999;
}

.delete-icon:hover {
  color: #c45c3e;
}

.volume-add-chapter {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c45c3e;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto;
  font-size: 14px;
}

.volume-add-chapter:hover {
  background: #a84a32;
}

.add-icon {
  line-height: 1;
}

.volume-more-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 4px;
  font-size: 16px;
  color: #999;
}

.volume-more-btn:hover {
  background: #f0ebe3;
}

.more-icon {
  line-height: 1;
}

.volume-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  width: 180px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.menu-header {
  padding: 10px 12px;
  background: #f8f4eb;
}

.menu-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.menu-info {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.menu-divider {
  height: 1px;
  background: #e8e4dc;
}

.menu-item {
  padding: 8px 12px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
}

.menu-item:hover {
  background: #f5f0e8;
}

.menu-item.danger {
  color: #c45c3e;
}

.menu-item.danger:hover {
  background: #ffe4e4;
}

.chapter-title-input {
  flex: 1;
  border: 1px solid #c45c3e;
  border-radius: 2px;
  padding: 2px 4px;
  font-size: 12px;
  outline: none;
}

.empty-volume {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

.chapter-nested {
  padding-left: 20px;
}

.chapter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  margin-bottom: 2px;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.chapter-item:hover {
  background: #f5f0e8;
}

.chapter-item.active {
  background: #ffe4d4;
  border-left: 3px solid #c45c3e;
}

.chapter-item .chapter-title {
  flex: 1;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-item .chapter-words {
  font-size: 11px;
  color: #999;
  margin-left: 8px;
}

.chapter-actions {
  display: none;
  margin-left: 8px;
}

.chapter-item:hover .chapter-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chapter-delete-btn {
  width: 18px;
  height: 18px;
  border: none;
  background: #ff4d4d;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.chapter-delete-btn:hover {
  background: #ff2222;
}

.menu-item.disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

/* 拖拽样式 */
.volume-section.dragging {
  opacity: 0.5;
  background: #f0f0f0;
}

.volume-section.drag-over {
  border-top: 2px solid #409eff;
}

.chapter-item.dragging {
  opacity: 0.5;
  background: #f0f0f0;
}

.chapter-item.drag-over {
  border-top: 2px solid #409eff;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #e8e4dc;
}

.new-chapter-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 1px dashed #c45c3e;
  background: transparent;
  border-radius: 4px;
  color: #c45c3e;
  font-size: 12px;
  cursor: pointer;
}

.new-chapter-btn:hover {
  background: #ffe4d4;
}

.btn-icon {
  width: 14px;
  height: 14px;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fdf5e6;
  position: relative;
}

.editor-main.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: #fdf5e6;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #e8e4dc;
  flex-wrap: wrap;
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.font-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.font-select, .font-size-select {
  padding: 4px 8px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  background: white;
  font-size: 12px;
  cursor: pointer;
}

.font-select:focus, .font-size-select:focus {
  outline: none;
  border-color: #c45c3e;
}

.line-height-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.line-height-label {
  font-size: 11px;
  color: #666;
  min-width: 28px;
  text-align: center;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: background 0.2s;
}

.tool-btn:hover {
  background: #f5f0e8;
}

.tool-btn.active {
  background: #ffe4d4;
  color: #c45c3e;
}

.tool-btn.primary {
  background: #c45c3e;
  color: white;
}

.tool-btn.primary:hover {
  background: #a84a32;
}

.tool-label {
  font-size: 11px;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #e8e4dc;
  margin: 0 8px;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.work-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.chapter-name {
  font-size: 12px;
  color: #666;
}

.save-status {
  font-size: 11px;
  color: #999;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f5f5f5;
}

.save-status.saved {
  color: #67c23a;
  background: #f0f9eb;
}

.auto-save {
  font-size: 11px;
  color: #999;
}

.editor-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px 48px;
  overflow-y: auto;
  min-height: 0;
}

.chapter-title-area {
  margin-bottom: 20px;
}

.chapter-title-input {
  width: 100%;
  padding: 8px 0;
  font-size: 24px;
  font-weight: 600;
  border: none;
  outline: none;
  background: transparent;
  color: #333;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s;
}

.chapter-title-input:focus {
  border-bottom-color: #c45c3e;
}

.editor-text-area {
  flex: 1;
  position: relative;
  overflow-y: auto;
}

.editor-content {
  width: 100%;
  min-height: 400px;
  height: auto;
  padding: 16px;
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  border: none;
  outline: none;
  background: transparent;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
}

.editor-content:focus {
  outline: none;
}

.editor-content:empty:before {
  content: attr(placeholder);
  color: #ccc;
}

.editor-content[contenteditable="true"] {
  cursor: text;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.8);
  border-top: 1px solid #e8e4dc;
}

.footer-left, .footer-center, .footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plan-info, .chapter-word-count, .update-time, .writing-time {
  font-size: 12px;
  color: #666;
}

.plan-progress-bar {
  display: inline-block;
  width: 60px;
  height: 6px;
  background: #e8e4dc;
  border-radius: 3px;
  overflow: hidden;
  margin-right: 6px;
  vertical-align: middle;
}

.plan-progress-fill {
  display: inline-block;
  height: 100%;
  background: linear-gradient(90deg, #c45c3e, #ff9a7a);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.plan-text {
  font-size: 12px;
  color: #666;
}

.chapter-word-count {
  font-size: 12px;
  color: #666;
}

.editor-sidebar-right {
  width: 48px;
  background: #f8f4eb;
  border-left: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 16px;
}

.side-tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.side-tool-item:hover {
  background: #e8e4dc;
}

.side-tool-item.danger {
  margin-top: auto;
}

.side-tool-item.danger:hover {
  background: #ffe4e4;
}

.tool-icon {
  width: 20px;
  height: 20px;
  color: #666;
}

.tool-icon.el-icon {
  font-size: 18px;
}

.tool-name {
  font-size: 10px;
  color: #666;
}
</style>
