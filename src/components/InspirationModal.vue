<script setup lang="ts">
import { ref, watch } from "vue";
import { Plus, Delete, Check } from "@element-plus/icons-vue";
import type { Work, Inspiration } from "../types";
import { ElMessage } from "element-plus";

const props = defineProps<{
  visible: boolean;
  work: Work | undefined;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const inspirations = ref<Inspiration[]>([]);
const selectedInspiration = ref<Inspiration | null>(null);
const editingInspiration = ref<Inspiration | null>(null);

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
};

const addInspiration = () => {
  if (!props.work) return;
  const newInspiration: Inspiration = {
    id: Math.random().toString(36).substring(2, 11),
    title: "",
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    type: '',
    color: '#c45c3e',
  };
  props.work.inspirations.unshift(newInspiration);
  editingInspiration.value = newInspiration;
  selectedInspiration.value = newInspiration;
};

const deleteInspiration = (inspId: string) => {
  if (!props.work) return;
  props.work.inspirations = props.work.inspirations.filter((i: Inspiration) => i.id !== inspId);
  if (selectedInspiration.value?.id === inspId) {
    selectedInspiration.value = null;
  }
  if (editingInspiration.value?.id === inspId) {
    editingInspiration.value = null;
  }
  ElMessage.success("删除成功");
};

const saveInspiration = () => {
  if (!editingInspiration.value) return;
  if (props.work) {
    props.work.updatedAt = Date.now();
  }
  ElMessage.success("保存成功");
};

watch(() => props.visible, (val) => {
  if (val && props.work) {
    inspirations.value = props.work.inspirations;
  }
});

watch(() => props.work?.inspirations, (val) => {
  if (val) {
    inspirations.value = val;
  }
}, { deep: true });
</script>

<template>
  <el-dialog
    title="灵感"
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    width="800px"
    top="5vh"
  >
    <div class="inspiration-container">
      <div class="inspiration-list">
        <div class="list-header">
          <h3>灵感笔记</h3>
          <el-button :icon="Plus" size="small" @click="addInspiration">
            添加
          </el-button>
        </div>
        <div class="inspiration-card-list">
          <div
            v-for="insp in inspirations"
            :key="insp.id"
            class="inspiration-card"
            :class="{ active: selectedInspiration?.id === insp.id }"
            @click="selectedInspiration = insp; editingInspiration = insp"
          >
            <div class="card-header">
              <span class="card-title">{{ insp.title || "无标题" }}</span>
              <span class="card-date">{{ formatDate(insp.createdAt) }}</span>
            </div>
            <div class="card-content">
              {{ insp.content.slice(0, 50) }}{{ insp.content.length > 50 ? "..." : "" }}
            </div>
            <div v-if="insp.type" class="card-tags">
              <span class="tag">{{ insp.type }}</span>
            </div>
            <div class="card-actions">
              <el-button :icon="Delete" size="small" type="danger" @click.stop="deleteInspiration(insp.id)">
                删除
              </el-button>
            </div>
          </div>
          <div v-if="inspirations.length === 0" class="empty-hint">
            <span class="empty-icon">💡</span>
            <p>暂无灵感</p>
            <p class="hint-text">记录你的创作灵感</p>
          </div>
        </div>
      </div>
      
      <div class="inspiration-detail">
        <template v-if="editingInspiration">
          <div class="detail-header">
            <span>编辑灵感</span>
            <el-button :icon="Check" size="small" type="primary" @click="saveInspiration">
              保存
            </el-button>
          </div>
          <div class="form-group">
            <label>灵感标题</label>
            <input
              v-model="editingInspiration.title"
              class="form-input"
              placeholder="请输入灵感标题"
            />
          </div>
          <div class="form-group">
            <label>灵感内容</label>
            <textarea
              v-model="editingInspiration.content"
              class="form-textarea"
              placeholder="记录你的灵感..."
            ></textarea>
          </div>
          <div class="form-group">
            <label>类型</label>
            <input 
              v-model="editingInspiration.type" 
              type="text" 
              placeholder="输入灵感类型"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>创建时间</label>
            <span class="form-text">{{ formatDate(editingInspiration.createdAt) }}</span>
          </div>
        </template>
        <template v-else>
          <div class="empty-detail">
            <Lightbulb style="font-size: 48px; color: #ccc;" />
            <p>选择或添加灵感</p>
          </div>
        </template>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.inspiration-container {
  display: flex;
  height: 500px;
}

.inspiration-list {
  width: 280px;
  border-right: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #e8e4dc;
}

.list-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.inspiration-card-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.inspiration-card {
  background: white;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.inspiration-card:hover {
  background: #faf8f5;
}

.inspiration-card.active {
  border-left: 3px solid #c45c3e;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.card-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.card-date {
  font-size: 11px;
  color: #999;
}

.card-content {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tag {
  padding: 2px 8px;
  font-size: 10px;
  color: #c45c3e;
  background: rgba(196, 92, 62, 0.1);
  border-radius: 10px;
}

.tag.more {
  background: #f0ebe4;
  color: #999;
}

.card-actions {
  border-top: 1px dashed #e8e4dc;
  padding-top: 8px;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: #999;
}

.empty-hint p {
  margin-top: 12px;
  font-size: 13px;
}

.hint-text {
  font-size: 12px !important;
  color: #ccc !important;
}

.inspiration-detail {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e4dc;
}

.detail-header span {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}

.form-input:focus {
  border-color: #c45c3e;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: vertical;
  min-height: 120px;
  outline: none;
  line-height: 1.6;
}

.form-textarea:focus {
  border-color: #c45c3e;
}

.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #c45c3e;
  background: rgba(196, 92, 62, 0.1);
  border-radius: 4px;
}

.tag-remove {
  cursor: pointer;
  color: #999;
  font-size: 14px;
}

.tag-remove:hover {
  color: #c45c3e;
}

.add-tag-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  color: #666;
  background: #f5f3ef;
  border: 1px dashed #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.add-tag-btn:hover {
  border-color: #c45c3e;
  color: #c45c3e;
}

.form-text {
  font-size: 13px;
  color: #999;
}

.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.empty-detail p {
  margin-top: 16px;
  font-size: 14px;
}
</style>
