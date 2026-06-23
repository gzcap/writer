<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { Work } from "../types";

const props = defineProps<{
  work: Work | null;
  workTitle: string;
}>();

const descriptionContent = ref("");
const saveStatus = ref<"idle" | "saved" | "saving" | "error">("idle");
const displayStatus = ref<"idle" | "saved" | "saving" | "error">("idle");
const isLoading = ref(false);
let statusTimeout: number | null = null;

// 延迟显示状态的时间（毫秒）
const statusDelay = 1500;

// 获取存储路径
const getSavePath = () => {
  return localStorage.getItem("savePath") || "/Users/zmh/Downloads/writer";
};

// 设置显示状态（带延迟）
const setDisplayStatus = (status: "idle" | "saved" | "saving" | "error") => {
  // 清除之前的延迟
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }
  
  // 如果是正在保存状态，立即显示
  if (status === "saving") {
    displayStatus.value = status;
    return;
  }
  
  // 其他状态延迟显示
  statusTimeout = window.setTimeout(() => {
    displayStatus.value = status;
  }, statusDelay);
};

// 从文件加载简介内容
const loadDescriptionFromFile = async () => {
  if (!props.work) return;
  
  isLoading.value = true;
  saveStatus.value = "saving";
  displayStatus.value = "saving"; // 加载状态立即显示
  
  try {
    const { readTextFile, exists } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = getSavePath();
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(props.workTitle || "未命名作品"));
    const descPath = await join(workFolder, "简介.md");
    
    if (await exists(descPath)) {
      const content = await readTextFile(descPath);
      descriptionContent.value = content;
      if (props.work) {
        props.work.description = content;
      }
    } else {
      if (props.work && props.work.description) {
        descriptionContent.value = props.work.description;
      }
    }
    
    saveStatus.value = "saved";
    setDisplayStatus("saved");
  } catch (error) {
    console.error("加载简介失败:", error);
    saveStatus.value = "error";
    setDisplayStatus("error");
  } finally {
    isLoading.value = false;
  }
};

// 保存简介到文件
const saveDescriptionToFile = async () => {
  if (!props.work) return;
  
  saveStatus.value = "saving";
  displayStatus.value = "saving"; // 保存状态立即显示
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = getSavePath();
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(props.workTitle || "未命名作品"));
    await mkdir(workFolder, { recursive: true });
    
    const descPath = await join(workFolder, "简介.md");
    await writeTextFile(descPath, descriptionContent.value);
    
    props.work.description = descriptionContent.value;
    
    saveStatus.value = "saved";
    setDisplayStatus("saved");
  } catch (error) {
    console.error("保存简介失败:", error);
    saveStatus.value = "error";
    setDisplayStatus("error");
  }
};

// 重新同步
const resyncDescription = async () => {
  await loadDescriptionFromFile();
  await saveDescriptionToFile();
};

// 监听 work 变化
watch(() => props.work, (newVal) => {
  if (newVal) {
    loadDescriptionFromFile();
  }
}, { immediate: true });

// 监听内容变化，延迟保存
watch(descriptionContent, async (newVal) => {
  if (!props.work || !newVal.trim()) return;
  await new Promise(resolve => setTimeout(resolve, 1500));
  await saveDescriptionToFile();
});

// 组件挂载
onMounted(() => {
  loadDescriptionFromFile();
});
</script>

<template>
  <div class="description-container">
    <div class="description-header" data-tauri-drag-region>
      <!-- macOS红绿灯按钮预留区域 -->
      <!-- <div class="traffic-lights-area"></div> -->
      <div class="description-status">
        <span class="status-text" :class="displayStatus">
          <span v-if="isLoading">正在加载...</span>
          <span v-else-if="displayStatus === 'saving'">正在保存...</span>
          <span v-else-if="displayStatus === 'saved'">已保存</span>
          <span v-else-if="displayStatus === 'error'">保存失败</span>
          <span v-else>未保存</span>
        </span>
        <button 
          class="save-btn" 
          @click="resyncDescription" 
          :disabled="saveStatus === 'saving' || isLoading"
          title="重新同步"
        >
          <span class="save-icon" :class="{ spinning: saveStatus === 'saving' || isLoading }">⟳</span>
        </button>
      </div>
    </div>
    <textarea 
      v-model="descriptionContent" 
      class="description-textarea" 
      placeholder="请输入书籍简介..."
      :disabled="isLoading"
    ></textarea>
    <div class="description-footer">
      <span class="word-count">{{ descriptionContent.length }} 字符</span>
    </div>
  </div>
</template>

<style scoped>
.description-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  padding-top: 12px; /* 红绿灯需要一点顶部空间 */
  position: relative; /* 为红绿灯区域提供定位基准 */
}

.description-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  position: relative; /* 为红绿灯区域提供定位基准 */
}

.traffic-lights-area {
  position: absolute;
  top: -12px;
  left: -20px;
  width: 70px;
  height: 32px;
  flex-shrink: 0;
  pointer-events: none; 
  /* macOS红绿灯按钮区域 */
}

.description-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-text {
  font-size: 12px;
  
  &.saving {
    color: #e65100;
  }
  
  &.saved {
    color: #2e7d32;
  }
  
  &.error {
    color: #c62828;
  }
  
  &.idle {
    color: #999;
  }
}

.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: #f5f3ef;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  /* -webkit-app-region: drag !important; */
}

.save-btn:hover:not(:disabled) {
  background: #e8e4dc;
}

.save-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.save-icon {
  font-size: 16px;
  color: #666;
}

.save-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.description-textarea {
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

.description-textarea:focus {
  outline: none;
  border-color: #c45c3e;
}

.description-textarea:disabled {
  background: #faf8f5;
  color: #999;
}

.description-footer {
  margin-top: 12px;
  text-align: right;
}

.word-count {
  font-size: 12px;
  color: #999;
}
</style>