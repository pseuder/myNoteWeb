<template>
  <div
    class="mx-auto flex h-full w-full flex-col rounded-none border-none md:max-w-3xl md:rounded md:border md:border-gray-300"
  >
    <div
      ref="notepadContainer"
      class="flex-grow overflow-y-auto scroll-smooth border-b border-gray-300 bg-gray-100 p-4"
    >
      <div v-if="isLoading" class="p-5 text-center text-gray-500">
        載入中...
      </div>
      <div v-else-if="error" class="p-5 text-center text-red-600">
        {{ error }}
      </div>
      <div v-else class="notepad-container">
        <textarea
          v-model="noteContent"
          class="notepad-textarea"
          placeholder="在此輸入文字..."
          @keydown="handleKeyDown"
        ></textarea>
        <div v-if="isSaving" class="saving-indicator">儲存中...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from "vue";
import { ElMessage } from "element-plus";
import { fetchTopSecrets, saveTopSecrets } from "../utils";

// 筆記內容
const noteContent = ref("");
const notepadContainer = ref<HTMLDivElement | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const error = ref<string | null>(null);

// 獲取筆記內容
const fetchSecretContent = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const secretData = await fetchTopSecrets();
    if (secretData && secretData.content) {
      noteContent.value = secretData.content;
    } else {
      // 如果沒有記錄，使用空字符串
      noteContent.value = "";
    }
  } catch (err: any) {
    console.error("獲取筆記內容失敗:", err);
    error.value = err.message || "獲取筆記內容失敗";
    if (error.value) {
      ElMessage.error(error.value);
    }
  } finally {
    isLoading.value = false;
  }
};

// 保存筆記內容
const saveSecretContent = async () => {
  if (isSaving.value) return;

  isSaving.value = true;

  try {
    await saveTopSecrets(noteContent.value);
    console.log("筆記內容已保存");
  } catch (err: any) {
    console.error("保存筆記內容失敗:", err);
    ElMessage.error(err.message || "保存筆記內容失敗");
  } finally {
    isSaving.value = false;
  }
};

// 創建一個防抖函數
const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
  let timer: number | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
};

// 防抖保存函數 - 用戶停止輸入500毫秒後才保存
const debouncedSave = debounce(saveSecretContent, 500);

// 監聽筆記內容變化，自動保存
watch(noteContent, () => {
  debouncedSave();
});

// 處理鍵盤事件
const handleKeyDown = (event: KeyboardEvent) => {
  // 如果正在輸入法組字中，不處理特殊鍵
  if (event.isComposing || event.keyCode === 229) {
    return;
  }

  // 如果按下Ctrl+S或Command+S，手動保存
  if ((event.ctrlKey || event.metaKey) && event.key === "s") {
    event.preventDefault(); // 阻止瀏覽器默認的保存行為
    saveSecretContent();
    ElMessage.success("筆記內容已保存");
  }
};

// 滾動到底部
const scrollToBottom = async () => {
  await nextTick();
  if (notepadContainer.value) {
    notepadContainer.value.scrollTop = notepadContainer.value.scrollHeight;
  }
};

// 掛載時初始化
onMounted(async () => {
  await fetchSecretContent();
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
  position: relative;
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

.saving-indicator {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
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
