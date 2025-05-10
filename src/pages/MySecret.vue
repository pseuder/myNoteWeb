<template>
  <div
    class="mx-auto flex h-full w-full flex-col rounded-none border-none md:max-w-3xl md:rounded md:border md:border-gray-300"
  >
    <div
      ref="notepadContainer"
      class="flex-grow overflow-y-auto scroll-smooth border-b border-gray-300 bg-gray-100 p-4"
    >
      <div class="notepad-container">
        <textarea
          v-model="noteContent"
          class="notepad-textarea"
          placeholder="在此輸入文字..."
          @keydown="handleKeyDown"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";

// 筆記內容
const noteContent = ref("");
const notepadContainer = ref<HTMLDivElement | null>(null);

// 處理鍵盤事件
const handleKeyDown = (event: KeyboardEvent) => {
  // 如果正在輸入法組字中，不處理特殊鍵
  if (event.isComposing || event.keyCode === 229) {
    return;
  }

  // 如果按下Enter鍵，新增一行
  if (event.key === "Enter") {
    // 這裡不需要阻止默認行為，因為我們希望在textarea中正常換行
    // 在這裡可以添加自動保存邏輯，但根據用戶反饋，將來會有新的API
    // saveNoteContent();
  }
};

// 自動保存筆記內容的函數 (將來會有新的API)
// const saveNoteContent = () => {
//   console.log("保存筆記內容:", noteContent.value);
//   // 這裡將來會調用API保存筆記內容
// };

// 滾動到底部
const scrollToBottom = async () => {
  await nextTick();
  if (notepadContainer.value) {
    notepadContainer.value.scrollTop = notepadContainer.value.scrollHeight;
  }
};

// 掛載時初始化
onMounted(async () => {
  // 這裡將來會調用API獲取筆記內容
  // 暫時使用空字符串初始化
  noteContent.value = "";
  await nextTick();
  scrollToBottom();
});
</script>

<style scoped>
.notepad-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.notepad-textarea {
  width: 100%;
  height: 100%;
  min-height: 300px;
  padding: 15px;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  background-color: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  resize: none;
  outline: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.notepad-textarea:focus {
  border-color: #409eff;
}

/* 自定義滾動條樣式 */
.notepad-textarea::-webkit-scrollbar {
  width: 8px;
}

.notepad-textarea::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.notepad-textarea::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 4px;
}

.notepad-textarea::-webkit-scrollbar-thumb:hover {
  background: #909399;
}
</style>
