<script setup lang="ts">
import { inject, ref } from "vue";
import { Plus, Document, More } from "@element-plus/icons-vue";
import type { Work, AppState } from "../types";

const appState = inject<AppState>("appState")!;
const createNewWork = inject<(title: string, description?: string) => void>("createNewWork")!;
const isWorkTitleExists = inject<(title: string) => boolean>("isWorkTitleExists")!;
const openWork = inject<(id: string) => void>("openWork")!;

const bookCovers = [
  "https://neeko-copilot.bytedance.net/api/text_to_image?prompt=fantasy%20novel%20book%20cover%20with%20magical%20elements%20and%20heroic%20character%20chinese%20style&image_size=portrait_4_3",
  "https://neeko-copilot.bytedance.net/api/text_to_image?prompt=urban%20story%20book%20cover%20with%20modern%20city%20background%20chinese%20style&image_size=portrait_4_3",
  "https://neeko-copilot.bytedance.net/api/text_to_image?prompt=historical%20novel%20book%20cover%20with%20ancient%20chinese%20palace&image_size=portrait_4_3",
  "https://neeko-copilot.bytedance.net/api/text_to_image?prompt=sci-fi%20book%20cover%20with%20space%20and%20futuristic%20elements%20chinese%20style&image_size=portrait_4_3",
];

const getBookCover = (index: number): string => {
  return bookCovers[index % bookCovers.length];
};

const getTotalWords = (work: Work): number => {
  return work.chapters.reduce((sum: number, ch: { wordCount: number }) => sum + ch.wordCount, 0);
};

const formatWordCount = (count: number): string => {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + "万字";
  }
  return count + "字";
};

const expandedMenu = ref<string | null>(null);

const toggleMenu = (workId: string) => {
  expandedMenu.value = expandedMenu.value === workId ? null : workId;
};

// 新建书籍对话框相关状态
const showCreateModal = ref(false);
const newBookTitle = ref('');
const newBookDescription = ref('');
const titleError = ref('');
const showConfirmModal = ref(false);

// 打开新建书籍对话框
const openCreateModal = () => {
  showCreateModal.value = true;
  newBookTitle.value = '';
  newBookDescription.value = '';
  titleError.value = '';
};

// 关闭新建书籍对话框
const closeCreateModal = () => {
  showCreateModal.value = false;
  newBookTitle.value = '';
  newBookDescription.value = '';
  titleError.value = '';
  showConfirmModal.value = false;
};

// 检查书名并显示确认对话框
const checkTitleAndConfirm = () => {
  const title = newBookTitle.value.trim();
  
  if (!title) {
    titleError.value = '请输入书名';
    return;
  }
  
  if (title.length > 50) {
    titleError.value = '书名不能超过50个字符';
    return;
  }
  
  if (isWorkTitleExists(title)) {
    titleError.value = '书名已存在，请输入其他名称';
    return;
  }
  
  titleError.value = '';
  showConfirmModal.value = true;
};

// 确认创建书籍
const confirmCreateBook = () => {
  try {
    createNewWork(newBookTitle.value.trim(), newBookDescription.value.trim());
    closeCreateModal();
  } catch (error) {
    titleError.value = (error as Error).message;
    showConfirmModal.value = false;
  }
};
</script>

<template>
  <div class="home-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="app-icon">
          <img src="../assets/index.png" alt="应用图标" />
        </div>
        <span class="user-name">作家助手</span>
      </div>
      
      <nav class="sidebar-nav">
        <button class="nav-item active">
          <Document class="nav-icon" />
          <span>小说作品</span>
        </button>
      </nav>
    </aside>
    
    <main class="main-content">
      <header class="main-header">
        <div class="banner-section">
        </div>
        
        <div class="action-bar">
          <button class="action-btn primary" @click="openCreateModal">
            <Plus class="action-icon" />
            <span>新建</span>
            <span class="action-hint">作品</span>
          </button>
          <button class="action-btn">
            <span>导入</span>
            <span class="action-hint">本地导入私密作品</span>
          </button>
        </div>
      </header>
      
      <section class="works-section">
        <div class="section-header">
          <div class="section-title">
            <span>全部作品</span>
            <span class="dropdown-arrow">▼</span>
          </div>
          <!-- <div class="section-actions">
            <span class="action-link">已隐藏</span>
            <span class="action-link">回收站</span>
          </div> -->
        </div>
        
        <div v-if="appState.works.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <h2>还没有作品</h2>
          <p>点击上方按钮开始创作你的第一个故事</p>
        </div>
        
        <div v-else class="works-grid">
          <div
            v-for="(work, index) in appState.works"
            :key="work.id"
            class="work-card"
          >
            <div class="work-cover" @click="openWork(work.id)">
              <img :src="getBookCover(index)" :alt="work.title" />
              <div class="work-tags">
                <span v-if="work.chapters.length > 0" class="tag serial-tag">连载中</span>
              </div>
            </div>
            <div class="work-info" @click="openWork(work.id)">
              <h3 class="work-title">{{ work.title || "未命名" }}</h3>
              <p class="work-words">{{ formatWordCount(getTotalWords(work)) }}</p>
            </div>
            <button class="work-more-btn" @click.stop="toggleMenu(work.id)">
              <More class="more-icon" />
            </button>
            
            <div v-if="expandedMenu === work.id" class="work-menu">
              <div class="menu-item">
                <span>私密作品设置</span>
              </div>
              <div class="menu-item">
                <span>书封管理</span>
              </div>
              <div class="menu-item">
                <span>发布平台设置</span>
                <span class="menu-arrow">></span>
              </div>
              <div class="menu-item">
                <span>移入分组</span>
                <span class="menu-arrow">></span>
              </div>
              <div class="menu-item">
                <span>取消置顶</span>
              </div>
              <div class="menu-item">
                <span>从桌面隐藏</span>
              </div>
              <div class="menu-item danger">
                <span>移入回收站</span>
              </div>
            </div>
          </div>
          
          <div class="work-card add-card" @click="openCreateModal">
            <div class="add-icon">+</div>
            <span class="add-text">新建作品</span>
          </div>
        </div>
      </section>
    </main>
    
    <!-- 新建书籍对话框 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>新建作品</h2>
          <button class="modal-close" @click="closeCreateModal">
            <X class="close-icon" />
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="book-title">书名 <span class="required">*</span></label>
            <input 
              id="book-title"
              v-model="newBookTitle" 
              type="text" 
              placeholder="请输入书名"
              class="form-input"
              :class="{ 'error': titleError }"
              maxlength="50"
            />
            <p v-if="titleError" class="error-message">{{ titleError }}</p>
          </div>
          
          <div class="form-group">
            <label for="book-description">简介</label>
            <textarea 
              id="book-description"
              v-model="newBookDescription" 
              placeholder="请输入作品简介（可选）"
              class="form-textarea"
              rows="4"
              maxlength="500"
            ></textarea>
            <p class="char-count">{{ newBookDescription.length }}/500</p>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-cancel" @click="closeCreateModal">取消</button>
          <button class="btn btn-primary" @click="checkTitleAndConfirm">下一步</button>
        </div>
      </div>
    </div>
    
    <!-- 二次确认对话框 -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
      <div class="modal-content confirm-modal">
        <div class="confirm-icon">📝</div>
        <h2>确认创建</h2>
        <p>您确定要创建名为《{{ newBookTitle.trim() }}》的作品吗？</p>
        
        <div v-if="newBookDescription.trim()" class="preview-section">
          <h3>作品简介：</h3>
          <p>{{ newBookDescription.trim() }}</p>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-cancel" @click="showConfirmModal = false">返回修改</button>
          <button class="btn btn-primary" @click="confirmCreateBook">确认创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  height: 100vh;
  background: #fdf8f3;
}

.sidebar {
  width: 180px;
  background: #f5f0e8;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  border-right: 1px solid #e8e4dc;
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e8e4dc;
}

.app-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.sidebar-nav {
  margin-top: 20px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 12px 24px;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #eee;
}

.nav-item.active {
  background: #e8dfd3;
  color: #c45c3e;
  font-weight: 500;
}

.nav-icon {
  width: 18px;
  height: 18px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.main-header {
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #e8e4dc;
}

.banner-section {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.banner {
  flex: 2;
  height: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  position: relative;
  overflow: hidden;
}

.banner::after {
  content: "";
  position: absolute;
  right: -50px;
  top: -50px;
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.banner-content h2 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.banner-content h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.banner-content p {
  font-size: 12px;
  opacity: 0.9;
}

.task-card {
  flex: 1;
  background: #fff9f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.task-arrow {
  color: #999;
  font-size: 12px;
}

.task-progress {
  font-size: 12px;
  color: #666;
}

.task-remaining {
  color: #c45c3e;
  margin-left: 8px;
}

.task-button {
  align-self: flex-end;
  background: #4facfe;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.task-button:hover {
  background: #3d9cef;
}

.action-bar {
  display: flex;
  gap: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 1px solid #e8e4dc;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: #c45c3e;
}

.action-btn.primary {
  background: #c45c3e;
  border-color: #c45c3e;
  color: white;
}

.action-btn.primary:hover {
  background: #a84d33;
}

.action-icon {
  width: 16px;
  height: 16px;
}

.action-hint {
  font-size: 12px;
  opacity: 0.7;
  margin-left: 4px;
}

.works-section {
  padding: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.dropdown-arrow {
  font-size: 10px;
  color: #999;
}

.section-actions {
  display: flex;
  gap: 20px;
}

.action-link {
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.action-link:hover {
  color: #c45c3e;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.work-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
}

.work-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.work-cover {
  position: relative;
  height: 220px;
}

.work-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.work-tags {
  position: absolute;
  top: 8px;
  left: 8px;
}

.tag {
  background: #ff6b6b;
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
}

.work-info {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.work-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.work-words {
  font-size: 12px;
  color: #999;
}

.work-more-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.work-card:hover .work-more-btn {
  opacity: 1;
}

.more-icon {
  width: 14px;
  height: 14px;
}

.work-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #f5f0e8;
}

.menu-item.danger {
  color: #c45c3e;
}

.menu-arrow {
  color: #999;
  font-size: 12px;
}

.serial-tag {
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
}

.genre-tag {
  background: #4facfe;
  margin-left: 4px;
}

.add-card {
  height: 268px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #e8e4dc;
  background: #faf8f5;
}

.add-icon {
  font-size: 32px;
  color: #c45c3e;
  margin-bottom: 8px;
}

.add-text {
  font-size: 13px;
  color: #999;
}

/* 对话框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 480px;
  max-width: 90%;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e8e4dc;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f5f0e8;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background 0.2s;
}

.modal-close:hover {
  background: #e8e4dc;
}

.close-icon {
  width: 16px;
  height: 16px;
  color: #666;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.required {
  color: #c45c3e;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e8e4dc;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #c45c3e;
}

.form-input.error {
  border-color: #d9534f;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e8e4dc;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: #c45c3e;
}

.error-message {
  color: #d9534f;
  font-size: 12px;
  margin-top: 6px;
  margin-bottom: 0;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 6px;
  margin-bottom: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e8e4dc;
}

.btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: #f5f0e8;
  color: #666;
}

.btn-cancel:hover {
  background: #e8e4dc;
}

.btn-primary {
  background: #c45c3e;
  color: white;
}

.btn-primary:hover {
  background: #a84c35;
}

/* 确认对话框样式 */
.confirm-modal {
  text-align: center;
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.confirm-modal h2 {
  margin-bottom: 8px;
}

.confirm-modal p {
  color: #666;
  margin-bottom: 20px;
}

.preview-section {
  background: #faf8f5;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: left;
}

.preview-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.preview-section p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}
</style>
