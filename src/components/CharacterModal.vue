<script setup lang="ts">
import { ref, watch } from "vue";
import { Plus, Delete, User, Check } from "@element-plus/icons-vue";
import type { Work, Character } from "../App.vue";
import { ElMessage } from "element-plus";

const props = defineProps<{
  visible: boolean;
  work: Work | undefined;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const characters = ref<Character[]>([]);
const selectedCharacter = ref<Character | null>(null);
const editingCharacter = ref<Character | null>(null);

const roleOptions = [
  { value: "protagonist", label: "主角" },
  { value: "supporting", label: "配角" },
  { value: "antagonist", label: "反派" },
  { value: "other", label: "其他" },
];

const colors = ["#c45c3e", "#4facfe", "#43e97b", "#f093fb", "#fa709a", "#a18cd1"];

const getRoleName = (role: string) => {
  const found = roleOptions.find((r: { value: string }) => r.value === role);
  return found?.label || role;
};

const addCharacter = () => {
  if (!props.work) return;
  const newCharacter: Character = {
    id: Math.random().toString(36).substring(2, 11),
    name: "",
    role: "other",
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
  ElMessage.success("删除成功");
};

const saveCharacter = () => {
  if (!editingCharacter.value) return;
  editingCharacter.value.updatedAt = Date.now();
  if (props.work) {
    props.work.updatedAt = Date.now();
  }
  ElMessage.success("保存成功");
};

watch(() => props.visible, (val) => {
  if (val && props.work) {
    characters.value = props.work.characters;
    if (characters.value.length > 0) {
      selectedCharacter.value = characters.value[0];
    }
  }
});

watch(() => props.work?.characters, (val) => {
  if (val) {
    characters.value = val;
  }
}, { deep: true });
</script>

<template>
  <el-dialog
    title="角色"
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    width="800px"
    top="5vh"
  >
    <div class="character-container">
      <div class="character-list">
        <div class="list-header">
          <h3>角色卡片</h3>
          <el-button :icon="Plus" size="small" @click="addCharacter">
            添加
          </el-button>
        </div>
        <div class="character-card-list">
          <div
            v-for="char in characters"
            :key="char.id"
            class="character-card"
            :class="{ active: selectedCharacter?.id === char.id, editing: editingCharacter?.id === char.id }"
            @click="selectedCharacter = char"
          >
            <div class="card-header" :style="{ borderColor: char.color }">
              <div class="avatar-wrapper" :style="{ background: char.color }">
                <User v-if="!char.avatar" />
                <img v-else :src="char.avatar" class="avatar" />
              </div>
              <div class="card-info">
                <div class="card-name">{{ char.name || "未命名" }}</div>
                <div class="card-role" :style="{ background: char.color }">
                  {{ getRoleName(char.role) }}
                </div>
              </div>
            </div>
            <div class="card-actions" v-if="editingCharacter?.id === char.id">
              <el-button :icon="Delete" size="small" type="danger" @click.stop="deleteCharacter(char.id)">
                删除
              </el-button>
            </div>
          </div>
          <div v-if="characters.length === 0" class="empty-hint">
            暂无角色
          </div>
        </div>
      </div>
      
      <div class="character-detail">
        <template v-if="editingCharacter">
          <div class="detail-header">
            <span>编辑角色</span>
            <el-button :icon="Check" size="small" type="primary" @click="saveCharacter">
              保存
            </el-button>
          </div>
          <div class="form-group">
            <label>角色名称</label>
            <input v-model="editingCharacter.name" class="form-input" placeholder="请输入角色名称" />
          </div>
          <div class="form-group">
            <label>角色定位</label>
            <select v-model="editingCharacter.role" class="form-select">
              <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>角色颜色</label>
            <div class="color-picker">
              <div
                v-for="color in colors"
                :key="color"
                class="color-option"
                :class="{ active: editingCharacter.color === color }"
                :style="{ background: color }"
                @click="editingCharacter.color = color"
              ></div>
            </div>
          </div>
          <div class="form-group">
            <label>角色描述</label>
            <textarea v-model="editingCharacter.description" class="form-textarea" placeholder="请输入角色描述"></textarea>
          </div>
          <div class="form-group">
            <label>性格特点</label>
            <textarea v-model="editingCharacter.personality" class="form-textarea" placeholder="请输入性格特点"></textarea>
          </div>
          <div class="form-group">
            <label>背景故事</label>
            <textarea v-model="editingCharacter.background" class="form-textarea" placeholder="请输入背景故事"></textarea>
          </div>
          <div class="form-group">
            <label>其他信息</label>
            <textarea v-model="editingCharacter.other" class="form-textarea" placeholder="其他信息"></textarea>
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
.character-container {
  display: flex;
  height: 550px;
}

.character-list {
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

.character-card-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.character-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.character-card:hover {
  transform: translateX(4px);
}

.character-card.active {
  border-left: 3px solid #c45c3e;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 2px solid;
}

.avatar-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.card-info {
  flex: 1;
}

.card-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.card-role {
  display: inline-block;
  padding: 2px 8px;
  font-size: 10px;
  color: white;
  border-radius: 10px;
  margin-top: 2px;
}

.card-actions {
  padding: 8px 10px;
  border-top: 1px solid #f0ebe4;
}

.empty-hint {
  text-align: center;
  padding: 30px;
  color: #999;
}

.character-detail {
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

.form-select {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
}

.color-picker {
  display: flex;
  gap: 8px;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  box-shadow: 0 0 0 3px rgba(196, 92, 62, 0.3);
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: vertical;
  min-height: 60px;
  outline: none;
  line-height: 1.5;
}

.form-textarea:focus {
  border-color: #c45c3e;
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
