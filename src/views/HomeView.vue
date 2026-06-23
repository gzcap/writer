<script setup lang="ts">
import { inject, ref } from "vue";
import { Plus, Document, More, Close } from "@element-plus/icons-vue";
import type { Work, AppState } from "../types";

const appState = inject<AppState>("appState")!;
const createNewWork =
  inject<(title: string, description?: string) => void>("createNewWork")!;
const isWorkTitleExists =
  inject<(title: string) => boolean>("isWorkTitleExists")!;
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
  return work.chapters.reduce(
    (sum: number, ch: { wordCount: number }) => sum + ch.wordCount,
    0,
  );
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

const showCreateModal = ref(false);
const newBookTitle = ref("");
const newBookDescription = ref("");
const titleError = ref("");
const showConfirmModal = ref(false);

const openCreateModal = () => {
  showCreateModal.value = true;
  newBookTitle.value = "";
  newBookDescription.value = "";
  titleError.value = "";
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  newBookTitle.value = "";
  newBookDescription.value = "";
  titleError.value = "";
  showConfirmModal.value = false;
};

const checkTitleAndConfirm = () => {
  const title = newBookTitle.value.trim();

  if (!title) {
    titleError.value = "请输入书名";
    return;
  }

  if (title.length > 50) {
    titleError.value = "书名不能超过50个字符";
    return;
  }

  if (isWorkTitleExists(title)) {
    titleError.value = "书名已存在，请输入其他名称";
    return;
  }

  titleError.value = "";
  showConfirmModal.value = true;
};

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
    <div class="main-layout">
      <aside data-tauri-drag-region class="sidebar">
        <nav class="sidebar-nav">
          <button class="nav-item active">
            <Document class="nav-icon" />
            <span>小说作品</span>
          </button>
        </nav>
      </aside>

      <main class="main-content">
        <header data-tauri-drag-region class="main-header">
          <div class="banner-section"></div>

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
                  <span v-if="work.chapters.length > 0" class="tag serial-tag"
                    >连载中</span
                  >
                </div>
              </div>
              <div class="work-info" @click="openWork(work.id)">
                <h3 class="work-title">{{ work.title || "未命名" }}</h3>
                <p class="work-words">
                  {{ formatWordCount(getTotalWords(work)) }}
                </p>
              </div>
              <button class="work-more-btn" @click.stop="toggleMenu(work.id)">
                <More class="more-icon" />
              </button>

              <div v-if="expandedMenu === work.id" class="work-menu">
                <div class="menu-item"><span>私密作品设置</span></div>
                <div class="menu-item"><span>书封管理</span></div>
                <div class="menu-item">
                  <span>发布平台设置</span><span class="menu-arrow">></span>
                </div>
                <div class="menu-item">
                  <span>移入分组</span><span class="menu-arrow">></span>
                </div>
                <div class="menu-item"><span>取消置顶</span></div>
                <div class="menu-item"><span>从桌面隐藏</span></div>
                <div class="menu-item danger"><span>移入回收站</span></div>
              </div>
            </div>

            <div class="work-card add-card" @click="openCreateModal">
              <div class="add-icon">+</div>
              <span class="add-text">新建作品</span>
            </div>
          </div>
        </section>
      </main>

      <div
        v-if="showCreateModal"
        class="modal-overlay"
        @click.self="closeCreateModal"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h2>新建作品</h2>
            <button class="modal-close" @click="closeCreateModal">
              <Close class="close-icon" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="book-title"
                >书名 <span class="required">*</span></label
              >
              <input
                id="book-title"
                v-model="newBookTitle"
                type="text"
                placeholder="请输入书名"
                class="form-input"
                :class="{ error: titleError }"
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
            <button class="btn btn-cancel" @click="closeCreateModal">
              取消
            </button>
            <button class="btn btn-primary" @click="checkTitleAndConfirm">
              下一步
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showConfirmModal"
        class="modal-overlay"
        @click.self="showConfirmModal = false"
      >
        <div class="modal-content confirm-modal">
          <div class="confirm-icon">📝</div>
          <h2>确认创建</h2>
          <p>您确定要创建名为《{{ newBookTitle.trim() }}》的作品吗？</p>

          <div v-if="newBookDescription.trim()" class="preview-section">
            <h3>作品简介：</h3>
            <p>{{ newBookDescription.trim() }}</p>
          </div>

          <div class="modal-footer">
            <button class="btn btn-cancel" @click="showConfirmModal = false">
              返回修改
            </button>
            <button class="btn btn-primary" @click="confirmCreateBook">
              确认创建
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  height: 95vh;
  background: #fdf8f3;
}

.title-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 32px;
  padding: 0 12px;
  background: #f5f0e8;
  border-bottom: 1px solid #e8e4dc;
}

.traffic-lights-area {
  position: absolute;
  top: 0;
  left: 0;
  width: 70px;
  height: 32px;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.title-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.title-text {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 180px;
  background: #f5f0e8;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  border-right: 1px solid #e8e4dc;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
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
  -webkit-app-region: drag !important;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
  }

  &.active {
    background: rgba(196, 92, 62, 0.1);
    color: #c45c3e;
  }
}

.nav-icon {
  width: 18px;
  height: 18px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-header {
  padding: 24px;
  border-bottom: 1px solid #e8e4dc;
}

.banner-section {
  margin-bottom: 20px;
}

.action-bar {
  display: flex;
  gap: 12px;
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
  /* -webkit-app-region: drag !important; */

  &:hover {
    border-color: #d4cfc7;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &.primary {
    background: #c45c3e;
    border-color: #c45c3e;
    color: white;

    &:hover {
      background: #b34d32;
      border-color: #b34d32;
    }
  }
}

.action-icon {
  width: 16px;
  height: 16px;
}

.action-hint {
  font-size: 12px;
  color: #999;
  margin-left: 4px;
}

.works-section {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
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
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.dropdown-arrow {
  font-size: 12px;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: #999;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.work-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
  /* -webkit-app-region: drag !important; */

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.add-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px;
    border: 2px dashed #e8e4dc;
    background: transparent;

    &:hover {
      border-color: #c45c3e;
      background: rgba(196, 92, 62, 0.02);
    }
  }
}

.work-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  overflow: hidden;
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
  display: flex;
  gap: 4px;
}

.tag {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;

  &.serial-tag {
    background: #c45c3e;
    color: white;
  }
}

.work-info {
  padding: 12px;
}

.work-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-words {
  font-size: 12px;
  color: #999;
}

.work-more-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  /* -webkit-app-region: drag !important; */
}

.work-card:hover .work-more-btn {
  opacity: 1;
}

.more-icon {
  width: 14px;
  height: 14px;
  color: white;
}

.work-menu {
  position: absolute;
  top: 36px;
  right: 8px;
  width: 160px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 100;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  &.danger {
    color: #d32f2f;
  }
}

.menu-arrow {
  font-size: 12px;
  color: #999;
}

.add-icon {
  width: 40px;
  height: 40px;
  border: 2px dashed #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #ccc;
  margin-bottom: 12px;
}

.add-text {
  font-size: 14px;
  color: #999;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 480px;
  background: white;
  border-radius: 12px;
  overflow: hidden;

  &.confirm-modal {
    padding: 32px;
    text-align: center;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e4dc;
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  /* -webkit-app-region: drag !important; */

  &:hover {
    background: #f5f5f5;
  }
}

.close-icon {
  width: 16px;
  height: 16px;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.required {
  color: #d32f2f;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 14px;

  &.error {
    border-color: #d32f2f;
  }
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e4dc;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.error-message {
  font-size: 12px;
  color: #d32f2f;
  margin-top: 4px;
}

.char-count {
  font-size: 12px;
  color: #999;
  text-align: right;
  margin-top: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e8e4dc;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  /* -webkit-app-region: drag !important; */

  &.btn-cancel {
    background: #f5f5f5;
    color: #666;

    &:hover {
      background: #e8e8e8;
    }
  }

  &.btn-primary {
    background: #c45c3e;
    color: white;

    &:hover {
      background: #b34d32;
    }
  }
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.confirm-modal h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.confirm-modal p {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.preview-section {
  background: #f9f9f9;
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
}
</style>
