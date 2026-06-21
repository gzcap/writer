<script setup lang="ts">
import { ref, watch, inject } from "vue";
import type { Work, AppState } from "../App.vue";

const props = defineProps<{
  visible: boolean;
  work: Work | undefined;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const appState = inject<AppState>("appState")!;
const descriptionContent = ref("");
const saveTimeout = ref<number | null>(null);

// 监听 visible 变化，加载简介内容
watch(() => props.visible, (newVal) => {
  if (newVal && props.work) {
    descriptionContent.value = props.work.description || "";
  }
});

// 监听简介内容变化，独立实时保存
watch(descriptionContent, (newVal) => {
  if (!props.work || !appState.savePath) return;
  
  // 清除之前的定时器
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value);
  }
  
  // 设置新的定时器，2秒后保存
  saveTimeout.value = window.setTimeout(async () => {
    await saveDescriptionToFile(newVal);
  }, 2000);
});

// 独立保存简介到文件
const saveDescriptionToFile = async (content: string) => {
  if (!props.work || !appState.savePath) return;
  
  try {
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const { join } = await import("@tauri-apps/api/path");
    
    const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };
    
    // 创建书籍文件夹
    const workFolder = await join(appState.savePath, sanitizeFileName(props.work.title || "未命名作品"));
    await mkdir(workFolder, { recursive: true });
    
    // 保存简介.md
    const descPath = await join(workFolder, "简介.md");
    await writeTextFile(descPath, content);
    
    console.log("简介已独立保存到:", descPath);
  } catch (error) {
    console.error("保存简介失败:", error);
  }
};

// 立即保存
const saveImmediately = async () => {
  if (!props.work) return;
  
  // 更新作品数据
  props.work.description = descriptionContent.value;
  
  // 保存到文件
  await saveDescriptionToFile(descriptionContent.value);
};

// 关闭模态框时保存
const handleClose = async () => {
  await saveImmediately();
  emit("update:visible", false);
};
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="handleClose"
    title="简介"
    width="600px"
    :close-on-click-modal="false"
    class="description-modal"
  >
    <div class="description-content">
      <div class="save-tip">
        <span class="tip-icon">💡</span>
        <span>编辑过程中会自动保存到本地，不影响其他内容的保存</span>
      </div>
      
      <el-input
        v-model="descriptionContent"
        type="textarea"
        :rows="15"
        placeholder="请输入作品简介..."
        resize="none"
        class="description-input"
      />
      
      <div class="word-count">
        字数：{{ descriptionContent.length }}
      </div>
    </div>
    
    <template #footer>
      <div class="modal-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="saveImmediately">立即保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.description-modal {
  .description-content {
    padding: 10px 0;
  }
  
  .save-tip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f0f9ff;
    border-radius: 4px;
    margin-bottom: 16px;
    color: #0369a1;
    font-size: 13px;
    
    .tip-icon {
      font-size: 16px;
    }
  }
  
  .description-input {
    width: 100%;
    
    :deep(.el-textarea__inner) {
      font-size: 14px;
      line-height: 1.8;
      padding: 12px;
    }
  }
  
  .word-count {
    text-align: right;
    color: #666;
    font-size: 12px;
    margin-top: 8px;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}
</style>