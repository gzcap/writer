<script setup lang="ts">
import { ref, watch, inject, computed } from "vue";
import { Plus, Delete, Search, User } from "@element-plus/icons-vue";
import type { Work, Character, AppState } from "../types";

const props = defineProps<{
  visible: boolean;
  work: Work | undefined;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const appState = inject<AppState>("appState")!;

const characters = ref<Character[]>([]);
const selectedCharacter = ref<Character | null>(null);
const editingCharacter = ref<Character | null>(null);
const searchQuery = ref("");
const saveStatus = ref<"saved" | "saving" | "error">("saved");
const saveTimeout = ref<number | null>(null);

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
    const chars = characters.value.filter(c => c.role === option.value);
    if (chars.length > 0) {
      groups.push({ role: option.value, label: option.label, chars });
    }
  });
  
  return groups;
});

const addCharacter = () => {
  if (!props.work) return;
  const newCharacter: Character = {
    id: Math.random().toString(36).substring(2, 11),
    name: "新角色",
    role: "supporting",
    avatar: "",
    description: "",
    personality: "",
    background: "",
    other: "",
    color: colors[props.work.characters.length % colors.length],
    updatedAt: Date.now(),
  };
  props.work.characters.push(newCharacter);
  editingCharacter.value = newCharacter;
  selectedCharacter.value = newCharacter;
};

const deleteCharacter = (charId: string) => {
  if (!props.work) return;
  props.work.characters = props.work.characters.filter((c: Character) => c.id !== charId);
  if (selectedCharacter.value?.id === charId) {
    selectedCharacter.value = null;
  }
  if (editingCharacter.value?.id === charId) {
    editingCharacter.value = null;
  }
};

// 实时保存到文件系统（独立于整体保存）
const saveCharacterToFile = async () => {
  if (!props.work || !editingCharacter.value || !appState.savePath) return;
  
  saveStatus.value = "saving";
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    // 创建书籍文件夹
    const workFolder = await join(appState.savePath, sanitizeFileName(props.work.title || "未命名作品"));
    await mkdir(workFolder, { recursive: true });
    
    // 创建角色文件夹
    const charsFolder = await join(workFolder, "角色");
    await mkdir(charsFolder, { recursive: true });
    
    // 保存角色文件
    const char = editingCharacter.value;
    const charPath = await join(charsFolder, `${sanitizeFileName(char.name || "未命名角色")}.md`);
    
    const charContent = `# ${char.name || "未命名角色"}

角色类型: ${getRoleName(char.role)}

背景:
${char.background || ""}

性格:
${char.personality || ""}

外貌:
${char.description || ""}

其他:
${char.other || ""}`;
    
    await writeTextFile(charPath, charContent);
    
    saveStatus.value = "saved";
    console.log("角色已独立保存到文件");
  } catch (error) {
    console.error("保存角色失败:", error);
    saveStatus.value = "error";
  }
};

// 监听角色数据变化，独立实时保存
watch(editingCharacter, (char) => {
  if (!char) return;
  
  // 清除之前的定时器
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value);
  }
  
  // 设置新的定时器，2秒后保存
  saveTimeout.value = window.setTimeout(() => {
    saveCharacterToFile();
  }, 2000);
}, { deep: true });

watch(() => props.visible, (val) => {
  if (val && props.work) {
    characters.value = props.work.characters;
    if (characters.value.length > 0) {
      selectedCharacter.value = characters.value[0];
      editingCharacter.value = characters.value[0];
    }
    saveStatus.value = "saved";
  }
});

watch(() => props.work?.characters, (val) => {
  if (val) {
    characters.value = val;
  }
}, { deep: true });

const selectCharacter = (char: Character) => {
  selectedCharacter.value = char;
  editingCharacter.value = char;
};
</script>

<template>
  <el-dialog
    title=""
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    width="900px"
    top="5vh"
    :show-close="false"
    class="character-modal"
  >
    <div class="character-header">
      <div class="header-left">
        <span class="header-icon">👤</span>
        <span class="header-title">角色</span>
        <span class="work-title">{{ work?.title || '未命名作品' }}</span>
      </div>
      <div class="header-right">
        <div class="save-status" :class="saveStatus">
          <span class="status-icon">
            <span v-if="saveStatus === 'saved'">✓</span>
            <span v-else-if="saveStatus === 'saving'" class="spinner">⟳</span>
            <span v-else>✗</span>
          </span>
          <span class="status-text">
            <span v-if="saveStatus === 'saved'">已同步</span>
            <span v-else-if="saveStatus === 'saving'">保存中...</span>
            <span v-else>保存失败</span>
          </span>
        </div>
        <button class="collapse-btn">
          <span>收到侧栏</span>
        </button>
      </div>
    </div>
    
    <div class="character-toolbar">
      <div class="search-box">
        <Search class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="角色"
          class="search-input"
        />
      </div>
      <div class="mode-select">
        <span class="mode-icon">📝</span>
        <span class="mode-text">文本模式</span>
        <span class="dropdown-icon">▼</span>
      </div>
      <div class="toolbar-actions">
        <el-button :icon="Plus" size="small" class="new-btn" @click="addCharacter">
          新建
        </el-button>
        <el-button size="small" class="extract-btn">
          提取
        </el-button>
      </div>
    </div>
    
    <div class="character-container">
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
        <div v-if="groupedCharacters.length === 0" class="empty-sidebar">
          暂无角色
        </div>
      </div>
      
      <div class="character-detail">
        <template v-if="editingCharacter">
          <div class="detail-tabs">
            <button class="tab-btn active">角色</button>
            <button class="tab-btn">提及章节</button>
          </div>
          
          <div class="detail-content">
            <div class="character-title-row">
              <input
                v-model="editingCharacter.name"
                class="character-name-input"
                placeholder="角色名称"
              />
              <select v-model="editingCharacter.role" class="role-select">
                <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            
            <div class="avatar-section">
              <div class="avatar-placeholder" :style="{ background: editingCharacter.color }">
                <User v-if="!editingCharacter.avatar" />
                <img v-else :src="editingCharacter.avatar" class="avatar-img" />
              </div>
              <div class="avatar-actions">
                <button class="avatar-action-btn">📷</button>
                <button class="avatar-action-btn">🗑️</button>
              </div>
            </div>
            
            <div class="info-section">
              <div class="info-item">
                <span class="info-label">背景</span>
                <textarea
                  v-model="editingCharacter.background"
                  class="info-textarea"
                  placeholder="角色背景故事..."
                ></textarea>
              </div>
              
              <div class="info-item">
                <span class="info-label">性格</span>
                <textarea
                  v-model="editingCharacter.personality"
                  class="info-textarea"
                  placeholder="角色性格特点..."
                ></textarea>
              </div>
              
              <div class="info-item">
                <span class="info-label">外貌</span>
                <textarea
                  v-model="editingCharacter.description"
                  class="info-textarea"
                  placeholder="角色外貌描述..."
                ></textarea>
              </div>
              
              <div class="info-item">
                <span class="info-label">其他</span>
                <textarea
                  v-model="editingCharacter.other"
                  class="info-textarea"
                  placeholder="其他信息（习惯、金手指等）..."
                ></textarea>
              </div>
            </div>
          </div>
          
          <div class="detail-footer">
            <span class="word-count">{{ editingCharacter.background.length + editingCharacter.personality.length + editingCharacter.description.length + editingCharacter.other.length }}/20000</span>
            <div class="footer-actions">
              <el-button :icon="Delete" size="small" type="danger" @click="deleteCharacter(editingCharacter.id)">
                删除
              </el-button>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="empty-detail">
            <User style="font-size: 48px; color: #ccc;" />
            <p>选择或添加角色查看详情</p>
          </div>
        </template>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.character-modal {
  background: #fdf5e6;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.character-modal :deep(.el-dialog__body) {
  padding: 0;
}

.character-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(180deg, #f8f4eb 0%, #f5efe6 100%);
  border-bottom: 1px solid #e8e4dc;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.work-title {
  font-size: 13px;
  color: #666;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
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

.status-icon {
  font-size: 12px;
  
  .spinner {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.collapse-btn {
  font-size: 12px;
  color: #666;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}

.collapse-btn:hover {
  color: #333;
}

.character-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #faf7f0;
  border-bottom: 1px solid #e8e4dc;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px 10px;
}

.search-icon {
  font-size: 14px;
  color: #999;
}

.search-input {
  border: none;
  outline: none;
  font-size: 13px;
  width: 120px;
  background: transparent;
}

.mode-select {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.mode-icon {
  font-size: 14px;
}

.mode-text {
  font-size: 13px;
  color: #333;
}

.dropdown-icon {
  font-size: 12px;
  color: #999;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.new-btn {
  background: #4caf50;
  border: none;
  color: white;
}

.extract-btn {
  background: transparent;
  border: 1px solid #ddd;
  color: #666;
}

.character-container {
  display: flex;
  height: calc(60vh - 80px);
  background: #fdf5e6;
  position: relative;
  overflow: hidden;
}

.character-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect fill='%23d4c4a8' width='60' height='60' rx='8'/%3E%3Ctext x='30' y='40' font-size='30' text-anchor='middle' fill='%23c4b498' opacity='0.5'%3E%E5%8F%91%3C/text%3E%3C/svg%3E");
  background-size: 120px 120px;
  background-repeat: repeat;
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
}

.character-sidebar {
  width: 200px;
  border-right: 1px solid #e8e4dc;
  overflow-y: auto;
  position: relative;
  z-index: 1;
}

.character-group {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  background: #f5f1e8;
}

.group-icon {
  font-size: 10px;
}

.group-list {
  padding: 4px 0;
}

.group-item {
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  
  &:hover {
    background: #f5f1e8;
  }
  
  &.active {
    background: #f0ebe1;
    color: #333;
    font-weight: 500;
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
  position: relative;
  z-index: 1;
}

.detail-tabs {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e4dc;
}

.tab-btn {
  padding: 4px 0;
  background: transparent;
  border: none;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  
  &.active {
    color: #333;
    font-weight: 500;
    border-bottom-color: #8b7355;
  }
}

.detail-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.character-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.character-name-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 18px;
  font-weight: 600;
  border: none;
  background: transparent;
  outline: none;
  color: #333;
  border-bottom: 2px solid #e8e4dc;
  
  &:focus {
    border-bottom-color: #8b7355;
  }
}

.role-select {
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  outline: none;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.avatar-placeholder {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
  
  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.avatar-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
  
  &:hover {
    background: #f5f5f5;
  }
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.info-textarea {
  width: 100%;
  min-height: 60px;
  padding: 10px;
  font-size: 14px;
  line-height: 1.6;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  background: #fff;
  outline: none;
  resize: vertical;
  
  &:focus {
    border-color: #8b7355;
  }
}

.detail-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid #e8e4dc;
  background: #faf7f0;
}

.word-count {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.footer-actions {
  display: flex;
  gap: 8px;
}
</style>