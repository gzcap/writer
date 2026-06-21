<script setup lang="ts">
import { ref, watch } from "vue";
import { Plus, Delete, Check, Search } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

export interface SettingItem {
  id: string;
  title: string;
  content: string;
  category: string;
  order: number;
}

const props = defineProps<{
  visible: boolean;
  workId: string;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const searchQuery = ref("");
const selectedCategory = ref("all");
const selectedItem = ref<SettingItem | null>(null);
const editingContent = ref("");

const categories = [
  { id: "background", name: "背景设定" },
  { id: "sect", name: "宗门" },
  { id: "other", name: "其他设定" },
  { id: "environment", name: "境界" },
];

const defaultSettings: SettingItem[] = [
  {
    id: "world-view",
    title: "世界观",
    content: "玄元九州，广袤无垠，是中州世俗与修行界的中坚制衡势力。",
    category: "background",
    order: 0,
  },
  {
    id: "secret-origin",
    title: "秘境由来",
    content: "玄元九州：七十余座顶级秘境，常年为九州各大势力提供阵法支撑，擅长窥探天机、卜算劫数。",
    category: "background",
    order: 1,
  },
  {
    id: "nine-cauldrons",
    title: "九州九鼎",
    content: "九、九州修行界以九大宗门为正统，宗门崛起于上古古九鼎镇世之后，承继九鼎道韵、执掌一州修行秩序，与山海万族、秘境封印形成「鼎镇域、宗掌道、族守界」的三元平衡。",
    category: "sect",
    order: 0,
  },
  {
    id: "central-land",
    title: "中央元陆",
    content: "昆仑宗（中州-镇元鼎道统）宗门定位：九州修行界领袖，天道中枢守护者，万法归一之地山门：昆仑虚下「万象天宫」，与镇元鼎核心封印同脉相连核心传承：《镇元经》《万象归一诀》，掌控万物本源法则，可推演天道、调和九鼎道韵与九鼎/种族关联：镇元鼎正统传承者，与人族共生，麒麟为宗门守护神兽\n\n秘境关联：镇守中央「本源秘境」，秘境核心为镇元鼎器灵居所，藏有修复九鼎的关键秘宝\n\n.太玄书院中州顶尖人族圣宗，九州文道、剑道、大道推演第一宗门，独立于镇元宗体系之外，执掌九州修行礼法、传承上古正统道藏，人脉遍布九域，是九州公认的修士最高学府。2.璇玑洞天中州阵法、符箓、推演第一宗，专精天道演算、周天阵法、禁术符箓，坐拥中州顶级阵道秘境，专研上古灵宝修复、高阶法宝锻造、体道修复、修为固本，宗门灵药圃连片，是中州修士丹药资源核心供给地。天工坊中州器道核心宗门，与宛州河洛族深度合作，专精上古灵宝修复、高阶法宝锻造、阵器傀儡炼制，弥补中州炼器体系空缺，底蕴深厚。6.清霄门中州主流中大型宗门，主修清霄风道、御空身法，擅长远游历练、阵器傀儡炼制，弥补中州器道体系空缺。7.镇岳宗中州山岳镇守宗门，扎根中州腹地灵山，主修镇岳道体、肉身防御冠绝中州，负责镇守中州内陆山川地脉、镇压地脉余煞。8.静心斋中州特殊隐世宗门，主修道心、寂灭戾气、静心悟道，不参与俗世纷争，专门收纳道心受损、心魔缠身的高阶修士，传承稀有静心大道。\n\n二、极北永夜-寒幽宗（殇州-镇幽鼎道统）宗门定位：极寒寂灭守护者，镇煞除秽之宗，荒力封印先锋山门：葬神冰渊「永夜",
    category: "sect",
    order: 1,
  },
];

const settingItems = ref<SettingItem[]>([]);

const getCategories = () => {
  return categories;
};

const getItemsByCategory = () => {
  let filtered = settingItems.value;
  if (selectedCategory.value !== "all") {
    filtered = filtered.filter((item) => item.category === selectedCategory.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }
  return filtered.sort((a, b) => a.order - b.order);
};

const selectItem = (item: SettingItem) => {
  selectedItem.value = item;
  editingContent.value = item.content;
};

const saveItem = () => {
  if (!selectedItem.value) return;
  selectedItem.value.content = editingContent.value;
  selectedItem.value.order = Date.now();
  saveToStorage();
  ElMessage.success("保存成功");
};

const addItem = () => {
  const newItem: SettingItem = {
    id: Math.random().toString(36).substring(2, 11),
    title: "新设定",
    content: "",
    category: selectedCategory.value || "other",
    order: Date.now(),
  };
  settingItems.value.push(newItem);
  selectItem(newItem);
  saveToStorage();
};

const deleteItem = (itemId: string) => {
  settingItems.value = settingItems.value.filter((item) => item.id !== itemId);
  if (selectedItem.value?.id === itemId) {
    selectedItem.value = null;
    editingContent.value = "";
  }
  saveToStorage();
  ElMessage.success("删除成功");
};

const saveToStorage = () => {
  const saved = localStorage.getItem("writer-data");
  if (saved) {
    const data = JSON.parse(saved);
    data.settings = data.settings || {};
    data.settings[props.workId] = settingItems.value;
    localStorage.setItem("writer-data", JSON.stringify(data));
  }
};

const loadSettings = () => {
  const saved = localStorage.getItem("writer-data");
  if (saved) {
    const data = JSON.parse(saved);
    if (data.settings && data.settings[props.workId]) {
      settingItems.value = data.settings[props.workId];
    } else {
      settingItems.value = [...defaultSettings];
    }
  } else {
    settingItems.value = [...defaultSettings];
  }
};

watch(
  () => props.visible,
  (val) => {
    if (val) {
      loadSettings();
      if (settingItems.value.length > 0) {
        selectItem(settingItems.value[0]);
      }
    }
  }
);
</script>

<template>
  <el-dialog
    :visible="visible"
    :title="`设定《我的灵根是一方世界》`"
    :width="800"
    :before-close="() => emit('update:visible', false)"
    class="setting-modal"
  >
    <div class="setting-container">
      <div class="setting-sidebar">
        <div class="search-box">
          <Search class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="设定"
            class="search-input"
          />
        </div>
        
        <button class="add-btn" @click="addItem">
          <Plus class="btn-icon" />
          <span>新建</span>
        </button>
        
        <div class="category-list">
          <div
            v-for="cat in getCategories()"
            :key="cat.id"
            class="category-item"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            <span class="category-icon">📁</span>
            <span class="category-name">{{ cat.name }}</span>
          </div>
        </div>
        
        <div class="item-list">
          <div
            v-for="item in getItemsByCategory()"
            :key="item.id"
            class="item-item"
            :class="{ active: selectedItem?.id === item.id }"
            @click="selectItem(item)"
          >
            <span class="item-title">{{ item.title }}</span>
            <button class="delete-btn" @click.stop="deleteItem(item.id)">
              <Delete class="delete-icon" />
            </button>
          </div>
        </div>
      </div>
      
      <div class="setting-content">
        <div v-if="selectedItem" class="content-header">
          <input
            v-model="selectedItem.title"
            class="content-title"
            placeholder="设定标题"
          />
          <div class="content-actions">
            <span class="content-category">{{
              categories.find((c) => c.id === selectedItem?.category)?.name || "其他"
            }}</span>
            <span class="content-label">提及章节</span>
          </div>
        </div>
        
        <div v-if="selectedItem" class="content-body">
          <textarea
            v-model="editingContent"
            class="content-textarea"
            placeholder="输入设定内容..."
          ></textarea>
        </div>
        
        <div v-if="selectedItem" class="content-footer">
          <span class="word-count">{{ editingContent.length }}/50000</span>
          <button class="save-btn" @click="saveItem">
            <Check class="save-icon" />
            <span>保存</span>
          </button>
        </div>
        
        <div v-else class="empty-state">
          <span class="empty-icon">📋</span>
          <p>选择或新建一个设定</p>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.setting-modal {
  .el-dialog__header {
    background: #fdf5e6;
    border-bottom: 1px solid #e8e4dc;
  }
  
  .el-dialog__body {
    padding: 0;
    background: #fdf5e6;
  }
  
  .el-dialog__title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
}

.setting-container {
  display: flex;
  height: 500px;
}

.setting-sidebar {
  width: 220px;
  background: #f8f4eb;
  border-right: 1px solid #e8e4dc;
  display: flex;
  flex-direction: column;
  padding: 12px;
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

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  background: #c45c3e;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 12px;
}

.add-btn:hover {
  background: #a84a32;
}

.btn-icon {
  width: 14px;
  height: 14px;
}

.category-list {
  margin-bottom: 12px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.category-item:hover {
  background: #e8e4dc;
}

.category-item.active {
  background: #ffe4d4;
  color: #c45c3e;
}

.category-icon {
  font-size: 12px;
}

.item-list {
  flex: 1;
  overflow-y: auto;
}

.item-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: white;
  border-radius: 4px;
  margin-bottom: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #333;
}

.item-item:hover {
  background: #f5f0e8;
}

.item-item.active {
  background: #ffe4d4;
  border-left: 3px solid #c45c3e;
}

.item-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.delete-btn:hover {
  background: #ffe4e4;
  color: #c45c3e;
}

.delete-icon {
  width: 14px;
  height: 14px;
}

.setting-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.content-header {
  margin-bottom: 12px;
}

.content-title {
  width: 100%;
  padding: 8px;
  font-size: 18px;
  font-weight: 600;
  border: none;
  outline: none;
  background: transparent;
  color: #333;
}

.content-actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.content-category,
.content-label {
  font-size: 12px;
  color: #999;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
}

.content-body {
  flex: 1;
}

.content-textarea {
  width: 100%;
  height: 100%;
  min-height: 300px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  border: none;
  outline: none;
  background: white;
  border-radius: 8px;
  resize: none;
  color: #333;
}

.content-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.word-count {
  font-size: 12px;
  color: #999;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #c45c3e;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.save-btn:hover {
  background: #a84a32;
}

.save-icon {
  width: 14px;
  height: 14px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
</style>
