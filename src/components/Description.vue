<script setup lang="ts">
import { ref, watch } from "vue";
import type { Work } from "../types";

const props = defineProps<{
  work: Work | null;
  workTitle: string;
}>();

const descriptionContent = ref("");
const saveStatus = ref<"idle" | "saved" | "saving" | "error">("idle");

// 监听 work 变化，加载简介内容
watch(() => props.work, (newVal) => {
  if (newVal) {
    descriptionContent.value = newVal.description || "";
  }
}, { immediate: true });

// 监听内容变化，自动保存
watch(descriptionContent, async (newVal) => {
  if (!props.work) return;
  await saveDescriptionToFile();
});

// 保存简介到文件
const saveDescriptionToFile = async () => {
  if (!props.work) return;
  
  saveStatus.value = "saving";
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const savePath = "/Users/zmh/Downloads/writer";
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    const workFolder = await join(savePath, sanitizeFileName(props.workTitle || "未命名作品"));
    await mkdir(workFolder, { recursive: true });
    
    const descPath = await join(workFolder, "简介.md");
    await writeTextFile(descPath, descriptionContent.value);
    
    // 更新 work 中的 description
    props.work.description = descriptionContent.value;
    
    saveStatus.value = "saved";
  } catch (error) {
    console.error("保存简介失败:", error);
    saveStatus.value = "error";
  }
};
</script>

<template>
  <div class="description-container">
    <div class="description-header">
      <h2 class="description-title">书籍简介</h2>
      <div class="description-status">
        <span class="status-text">{{ saveStatus === 'saving' ? '正在保存...' : '已保存' }}</span>
        <button class="save-btn" @click="saveDescriptionToFile" :disabled="saveStatus === 'saving'" title="保存到本地">
          <span class="save-icon" :class="{ spinning: saveStatus === 'saving' }">⟳</span>
        </button>
      </div>
    </div>
    <textarea v-model="descriptionContent" class="description-textarea" placeholder="请输入书籍简介..."></textarea>
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
}

.description-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.description-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.description-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-text {
  font-size: 12px;
  color: #999;
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
  transition: background 0.2s;
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
}

.description-textarea:focus {
  outline: none;
  border-color: #c45c3e;
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