<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import type { Work, Character, Inspiration } from "../types";
import { Search, Delete, Plus, User, Close } from "@element-plus/icons-vue";
import Description from "./Description.vue";
import Outline from "./Outline.vue";
import { ElButton, ElMessageBox, ElMessage } from "element-plus";

// 从 URL 参数获取数据
const urlParams = new URLSearchParams(window.location.hash.slice(1));
const workId = ref(urlParams.get("workId") || "");
const viewType = ref(urlParams.get("viewType") || "character");
const workTitle = ref(decodeURIComponent(urlParams.get("title") || ""));

// 数据状态
const work = ref<Work | null>(null);
const saveStatus = ref<"idle" | "saved" | "saving" | "error">("idle");
const saveTimeout = ref<number | null>(null);
const characters = ref<Character[]>([]);
const inspirations = ref<Inspiration[]>([]);

// 角色相关
const selectedCharacter = ref<Character | null>(null);
const editingCharacter = ref<Character | null>(null);
const roleOptions = [
  { value: "protagonist", label: "主要角色" },
  { value: "supporting", label: "次要角色" },
  { value: "antagonist", label: "反派" },
  { value: "other", label: "其他" },
];

const colors = ["#c45c3e", "#4facfe", "#43e97b", "#f093fb", "#fa709a", "#a18cd1"];

const getRoleName = (role: string) => {
  const found = roleOptions.find((r: { value: string }) => r.value === role);
  return found?.label || role;
};

// 按角色类型分组
const groupedCharacters = computed(() => {
  const groups: { role: string; label: string; chars: Character[] }[] = [];
  
  roleOptions.forEach(option => {
    const chars = characters.value.filter((c: Character) => c.role === option.value);
    if (chars.length > 0) {
      groups.push({ role: option.value, label: option.label, chars });
    }
  });
  
  return groups;
});

// 角色相关方法
const addCharacter = () => {
  if (!work.value) return;
  
  const newChar: Character = {
    id: Math.random().toString(36).substring(2, 11),
    name: "",
    role: "supporting",
    avatar: "",
    background: "",
    personality: "",
    description: "",
    other: "",
    color: colors[characters.value.length % colors.length],
    updatedAt: Date.now(),
  };
  
  work.value.characters.push(newChar);
  characters.value = work.value.characters;
  editingCharacter.value = newChar;
  selectedCharacter.value = newChar;
};

const selectCharacter = (char: Character) => {
  selectedCharacter.value = char;
  editingCharacter.value = char;
};

const deleteCharacter = async (charId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该角色吗？删除后将无法恢复。',
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    if (work.value) {
      work.value.characters = work.value.characters.filter(c => c.id !== charId);
      characters.value = work.value.characters;
    }
    
    if (selectedCharacter.value?.id === charId) {
      selectedCharacter.value = null;
      editingCharacter.value = null;
    }
    
    ElMessage.success('删除成功');
    saveCharactersToFile();
  } catch {
    // 用户取消
  }
};

// 保存角色到文件
const saveCharactersToFile = async () => {
  if (!work.value) return;
  
  saveStatus.value = "saving";
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = "/Users/zmh/Downloads/writer";
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(workTitle.value || "未命名作品"));
    const charsFolder = await join(workFolder, "角色");
    await mkdir(charsFolder, { recursive: true });
    
    for (const char of characters.value) {
      const charPath = await join(charsFolder, `${sanitizeFileName(char.name || "未命名角色")}.md`);
      const charContent = `# ${char.name || "未命名角色"}\n\n角色类型: ${getRoleName(char.role)}\n\n背景:\n${char.background || ""}\n\n性格:\n${char.personality || ""}\n\n外貌:\n${char.description || ""}\n\n其他:\n${char.other || ""}`;
      await writeTextFile(charPath, charContent);
    }
    
    saveStatus.value = "saved";
  } catch (error) {
    console.error("保存角色失败:", error);
    saveStatus.value = "error";
  }
};

// 灵感相关
const addInspiration = () => {
  if (!work.value) return;
  const newInspiration: Inspiration = {
    id: Math.random().toString(36).substring(2, 11),
    title: "新灵感",
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    type: '',
    color: '#c45c3e',
  };
  work.value.inspirations.push(newInspiration);
  inspirations.value = work.value.inspirations;
  editingInspiration.value = newInspiration;
};

const deleteInspiration = async (inspId: string) => {
  const insp = inspirations.value.find(i => i.id === inspId);
  if (!insp) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除灵感 "${insp.title}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 删除本地灵感文件
    try {
      const { join } = await import("@tauri-apps/api/path");
      const { remove, exists } = await import("@tauri-apps/plugin-fs");
      
      const savePath = "/Users/zmh/Downloads/writer";
      const sanitizeFileName = (name: string) => {
        return name.replace(/[\\/:*?"<>|]/g, "_").trim();
      };
      
      const inspPath = await join(savePath, sanitizeFileName(workTitle.value || "未命名作品"), "灵感", `${sanitizeFileName(insp.title || "未命名灵感")}.md`);
      if (await exists(inspPath)) {
        await remove(inspPath);
        console.log(`已删除灵感文件: ${inspPath}`);
      }
    } catch (error) {
      console.error('删除灵感文件失败:', error);
    }
    
    inspirations.value = inspirations.value.filter(i => i.id !== inspId);
    if (editingInspiration.value?.id === inspId) {
      editingInspiration.value = null;
    }
    
    ElMessage.success('删除成功');
  } catch {
    // 用户取消
  }
};

// 保存灵感到文件
const saveInspirationsToFile = async () => {
  if (!work.value) return;
  
  saveStatus.value = "saving";
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = "/Users/zmh/Downloads/writer";
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(workTitle.value || "未命名作品"));
    const inspFolder = await join(workFolder, "灵感");
    await mkdir(inspFolder, { recursive: true });
    
    for (const insp of inspirations.value) {
      const inspPath = await join(inspFolder, `${sanitizeFileName(insp.title || "未命名灵感")}.md`);
      await writeTextFile(inspPath, `# ${insp.title}\n\n${insp.content}`);
    }
    
    saveStatus.value = "saved";
  } catch (error) {
    console.error("保存灵感失败:", error);
    saveStatus.value = "error";
  }
};

const editingInspiration = ref<Inspiration | null>(null);

const closeWindow = () => {
  window.close();
};

// 重试保存
const retrySave = async () => {
  saveStatus.value = "saving";
  if (viewType.value === "character") {
    await saveCharactersToFile();
  } else if (viewType.value === "inspiration") {
    await saveInspirationsToFile();
  }
};

onMounted(async () => {
  // 初始化工作数据
  work.value = {
    id: workId.value,
    title: workTitle.value,
    description: "",
    cover: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapters: [],
    volumes: [],
    characters: [],
    outline: [],
    inspirations: [],
    totalWordCount: 0,
  };
  
  // 根据视图类型加载数据
  if (viewType.value === "character" && work.value) {
    characters.value = work.value.characters;
  } else if (viewType.value === "inspiration" && work.value) {
    inspirations.value = work.value.inspirations;
  }
  
  // 监听角色内容变化
  if (viewType.value === "character") {
    watch([characters, editingCharacter], () => {
      if (editingCharacter.value) {
        saveStatus.value = "saving";
        if (saveTimeout.value) clearTimeout(saveTimeout.value);
        saveTimeout.value = window.setTimeout(() => {
          saveCharactersToFile();
        }, 2000);
      }
    }, { deep: true });
  }
  
  // 监听灵感内容变化
  if (viewType.value === "inspiration") {
    watch([inspirations, editingInspiration], () => {
      if (editingInspiration.value) {
        saveStatus.value = "saving";
        if (saveTimeout.value) clearTimeout(saveTimeout.value);
        saveTimeout.value = window.setTimeout(() => {
          saveInspirationsToFile();
        }, 2000);
      }
    }, { deep: true });
  }
});
</script>

<template>
  <div class="view-window">
    <!-- 标题栏 -->
    <div class="view-header" data-tauri-drag-region>
      <!-- macOS红绿灯按钮预留区域 -->
      <div class="traffic-lights-area"></div>
      <div class="header-right">
        <div v-if="saveStatus !== 'idle' && viewType !== 'description'" class="save-status" :class="saveStatus">
          <span class="status-icon">
            <span v-if="saveStatus === 'saved'">✓</span>
            <span v-else-if="saveStatus === 'saving'" class="spinner">⟳</span>
            <span v-else>✗</span>
          </span>
          <span class="status-text">
            <span v-if="saveStatus === 'saved'">已保存</span>
            <span v-else-if="saveStatus === 'saving'">正在保存...</span>
            <span v-else>保存失败</span>
          </span>
          <button v-if="saveStatus === 'error'" class="retry-btn" @click="retrySave" title="重新保存">
            <span class="retry-icon">⟳</span>
          </button>
        </div>
        <button class="close-btn" @click="closeWindow">
          <Close class="close-icon" />
        </button>
      </div>
    </div>
    
    <!-- 角色视图 -->
    <div v-if="viewType === 'character'" class="character-container">
      <div class="character-sidebar">
        <div v-for="group in groupedCharacters" :key="group.role" class="character-group">
          <div class="group-header">
            <span class="group-icon">📁</span>
            <span class="group-title">{{ group.label }}</span>
          </div>
          <div class="group-list">
            <div
              v-for="char in group.chars"
              :key="char.id"
              class="group-item"
              :class="{ active: selectedCharacter?.id === char.id }"
              @click="selectCharacter(char)"
            >
              <span class="item-name">{{ char.name || "未命名" }}</span>
            </div>
          </div>
        </div>
        <div v-if="groupedCharacters.length === 0" class="empty-sidebar">暂无角色</div>
      </div>
      
      <div class="character-detail">
        <template v-if="editingCharacter">
          <div class="detail-content">
            <div class="character-title-row">
              <input v-model="editingCharacter.name" class="character-name-input" placeholder="角色名称" />
              <select v-model="editingCharacter.role" class="role-select">
                <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="avatar-section">
              <div class="avatar-placeholder" :style="{ background: editingCharacter.color }">
                <User v-if="!editingCharacter.avatar" />
                <img v-else :src="editingCharacter.avatar" class="avatar-img" />
              </div>
            </div>
            <div class="info-section">
              <div class="info-item">
                <span class="info-label">背景</span>
                <textarea v-model="editingCharacter.background" class="info-textarea" placeholder="角色背景故事..."></textarea>
              </div>
              <div class="info-item">
                <span class="info-label">性格</span>
                <textarea v-model="editingCharacter.personality" class="info-textarea" placeholder="角色性格特点..."></textarea>
              </div>
              <div class="info-item">
                <span class="info-label">外貌</span>
                <textarea v-model="editingCharacter.description" class="info-textarea" placeholder="角色外貌描述..."></textarea>
              </div>
              <div class="info-item">
                <span class="info-label">其他</span>
                <textarea v-model="editingCharacter.other" class="info-textarea" placeholder="其他信息..."></textarea>
              </div>
            </div>
          </div>
          <div class="detail-footer">
            <span class="word-count">{{ (editingCharacter.background?.length || 0) + (editingCharacter.personality?.length || 0) + (editingCharacter.description?.length || 0) + (editingCharacter.other?.length || 0) }} 字符</span>
            <div class="footer-actions">
              <ElButton :icon="Delete" size="small" type="danger" @click="deleteCharacter(editingCharacter.id)">删除</ElButton>
            </div>
          </div>
        </template>
      </div>
      <div class="character-toolbar">
        <div class="search-box">
          <Search class="search-icon" />
          <input type="text" placeholder="搜索角色" class="search-input" />
        </div>
        <ElButton :icon="Plus" size="small" class="new-btn" @click="addCharacter">新建</ElButton>
      </div>
    </div>
    
    <!-- 简介视图 -->
    <Description v-else-if="viewType === 'description'" :work="work" :work-title="workTitle" />
    
    <!-- 大纲视图 -->
    <Outline v-else-if="viewType === 'outline'" :work="work" :work-title="workTitle" @close="closeWindow" />
    
    <!-- 灵感视图 -->
    <div v-else-if="viewType === 'inspiration'" class="inspiration-container">
      <div class="inspiration-sidebar">
        <div v-for="insp in inspirations" :key="insp.id" class="inspiration-item" :class="{ active: editingInspiration?.id === insp.id }" @click="editingInspiration = insp">
          <span class="inspiration-title">{{ insp.title }}</span>
        </div>
      </div>
      <div class="inspiration-detail">
        <template v-if="editingInspiration">
          <input v-model="editingInspiration.title" class="detail-title" placeholder="灵感标题" />
          <textarea v-model="editingInspiration.content" class="detail-content" placeholder="灵感内容..."></textarea>
          <div class="detail-footer">
            <span class="word-count">{{ editingInspiration.content?.length || 0 }} 字符</span>
            <ElButton :icon="Delete" size="small" type="danger" @click="deleteInspiration(editingInspiration.id)">删除</ElButton>
          </div>
        </template>
      </div>
      <div class="inspiration-toolbar">
        <ElButton :icon="Plus" size="small" class="new-btn" @click="addInspiration">新建</ElButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.view-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative; /* 为红绿灯区域提供定位基准 */
  background: #fdf5e6;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  padding-top: 8px; /* 红绿灯需要一点顶部空间 */
  position: relative; /* 为红绿灯区域提供定位基准 */
  /* padding: 12px 16px; */
  /* background: linear-gradient(180deg, #f8f4eb 0%, #f5efe6 100%); */
  /* border-bottom: 1px solid #e8e4dc; */
  /* box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); */
}

.traffic-lights-area {
  position: absolute;
  top: 8px;
  left: 16px;
  width: 70px;
  height: 32px;
  flex-shrink: 0;
  pointer-events: none; 
  /* macOS红绿灯按钮区域 */
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  /* padding: 4px 10px; */
  border-radius: 20px;
  font-size: 12px;
  
  &.saved {
    background: #e8f5e9;
    color: #2e7d32;
  }
  
  &.saving {
    background: #fff3e0;
    color: #e65100;
  }
  
  &.error {
    background: #ffebee;
    color: #c62828;
  }
}

.retry-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  transition: all 0.2s;
  /* -webkit-app-region: drag !important; */
  
  &:hover {
    background: #c62828;
    color: white;
  }
}

.retry-icon {
  font-size: 14px;
  
  &:hover {
    animation: spin 0.5s linear infinite;
  }
}

.status-icon .spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  /* -webkit-app-region: drag !important;  */
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.close-icon {
  font-size: 18px;
  color: #666;
}

/* 角色视图样式 */
.character-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.character-sidebar {
  width: 220px;
  border-right: 1px solid #e8e4dc;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

.character-group {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.group-icon {
  font-size: 14px;
}

.group-list {
  padding: 0 8px;
}

.group-item {
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
  /* -webkit-app-region: drag !important; */
  
  &:hover {
    background: rgba(0, 0, 0, 0.03);
  }
  
  &.active {
    background: rgba(196, 92, 62, 0.1);
    color: #c45c3e;
  }
}

.empty-sidebar {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.character-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow-y: auto;
}

.detail-content {
  flex: 1;
}

.character-title-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.character-name-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  /* -webkit-app-region: drag !important; */
}

.character-name-input:focus {
  outline: none;
  border-color: #c45c3e;
}

.role-select {
  padding: 10px 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}

.role-select:focus {
  outline: none;
  border-color: #c45c3e;
}

.avatar-section {
  margin-bottom: 16px;
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.info-textarea {
  padding: 10px 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  /* -webkit-app-region: drag !important; */
}

.info-textarea:focus {
  outline: none;
  border-color: #c45c3e;
}

.detail-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e8e4dc;
}

.word-count {
  font-size: 12px;
  color: #999;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.character-toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #faf8f5;
  border-top: 1px solid #e8e4dc;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  width: 180px;
}

.search-icon {
  font-size: 14px;
  color: #999;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  outline: none;
}

.new-btn {
  background: #c45c3e;
  color: white;
  border: none;
  /* -webkit-app-region: drag !important; */
  
  &:hover {
    background: #b34d32;
  }
}

/* 灵感视图样式 */
.inspiration-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.inspiration-sidebar {
  width: 100%;
  max-height: 200px;
  border-bottom: 1px solid #e8e4dc;
  background: #faf8f5;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  align-content: flex-start;
}

.inspiration-item {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e8e4dc;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  /* -webkit-app-region: drag !important; */
  
  &:hover {
    border-color: #c45c3e;
    color: #c45c3e;
  }
  
  &.active {
    background: #c45c3e;
    color: white;
    border-color: #c45c3e;
  }
}

.inspiration-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.detail-title {
  width: 100%;
  padding: 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.detail-title:focus {
  outline: none;
  border-color: #c45c3e;
}

.detail-content {
  flex: 1;
  width: 100%;
  padding: 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  box-sizing: border-box;
  font-family: inherit;
  /* -webkit-app-region: drag !important; */
}

.detail-content:focus {
  outline: none;
  border-color: #c45c3e;
}

.inspiration-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  background: #faf8f5;
  border-top: 1px solid #e8e4dc;
}
</style>