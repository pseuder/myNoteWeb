<template>
  <div
    class="mx-auto flex h-full w-full flex-col rounded-none border-none md:max-w-3xl md:rounded md:border md:border-gray-300"
  >
    <div
      ref="historyContainer"
      class="flex-grow overflow-y-auto scroll-smooth border-b border-gray-300 bg-gray-100 p-4"
    >
      <div v-if="isLoading" class="p-5 text-center text-gray-500">
        載入中...
      </div>
      <div v-else-if="error" class="p-5 text-center text-red-600">
        {{ error }}
      </div>
      <div v-else>
        <div
          v-for="memo in memos"
          :key="memo.id"
          class="mb-2 flex gap-2 leading-normal"
        >
          <el-tag
            type="danger"
            size="small"
            @click="handleDeleteMemo(memo.id)"
            class="cursor-pointer"
          >
            <el-icon> <Delete /> </el-icon>
          </el-tag>
          <el-tag
            type="warning"
            size="small"
            @click="handleCopyMemo(memo.content)"
            class="cursor-pointer"
          >
            <el-icon> <CopyDocument /> </el-icon>
          </el-tag>
          <!-- <el-tag size="mini" class="timestamp mr-1 text-xs text-gray-500">{{
            formatTimestamp(memo.timestamp)
          }}</el-tag> -->
          <div class="flex flex-col">
            <template v-if="memo.type === 'text'">
              <span class="break-words whitespace-pre-wrap">{{
                memo.content
              }}</span>
            </template>
            <template v-else-if="memo.type === 'file' && memo.file_key">
              <span>
                檔案:
                <a
                  :href="getDownloadUrl(memo.file_key)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 no-underline hover:underline"
                >
                  {{ memo.content }}
                </a>
                <span class="ml-1 text-sm text-gray-700"
                  >({{ formatFileSize(memo.file_size) }})</span
                >
              </span>
            </template>

            <!-- 如果為file_type含image且file_url有值則用img顯示預覽 -->
            <template v-if="memo.type === 'file' && memo.file_key">
              <img
                v-if="memo.file_type?.includes('image')"
                :src="getDownloadUrl(memo.file_key)"
                alt="Image preview"
                class="mt-2 max-h-40 w-fit rounded border border-gray-300"
              />
            </template>
          </div>
        </div>
      </div>
      <div
        v-if="!isLoading && memos.length === 0"
        class="p-5 text-center text-gray-500"
      >
        還沒有任何紀錄。
      </div>
    </div>

    <div
      class="flex flex-col gap-2.5 border-t border-gray-300 bg-gray-100 p-2.5"
    >
      <div
        class="flex flex-col items-center gap-2.5 border-t border-gray-200 bg-gray-50 p-2.5 md:flex-row"
      >
        <input
          type="file"
          @change="handleFileChange"
          ref="fileInput"
          :disabled="isUploading || isSubmitting"
          class="mb-2.5 w-full flex-grow rounded border border-gray-300 p-1 text-sm file:mr-2.5 file:cursor-pointer file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 md:mb-0"
        />

        <span
          v-if="uploadProgress !== null && uploadError === null"
          class="ml-0 self-start text-sm text-green-600 md:ml-2.5 md:self-center"
        >
          {{ uploadProgress }}%
        </span>
        <div
          v-if="uploadError"
          class="ml-0 self-start text-sm text-red-600 md:ml-2.5 md:self-center"
        >
          {{ uploadError }}
        </div>
      </div>

      <div
        class="flex flex-col gap-2.5 border-t border-gray-300 bg-white p-2.5 md:flex-row"
      >
        <el-input
          v-model="newMessage"
          type="textarea"
          placeholder="輸入訊息..."
          @keydown="handleKeyDown"
          :disabled="isSubmitting || isUploading"
          class="mb-2.5 min-h-[40px] flex-grow resize-none md:mr-2.5 md:mb-0"
          :autosize="{ minRows: 1, maxRows: 4 }"
        ></el-input>

        <el-button
          type="primary"
          style="height: auto"
          @click="handleSendMessage('text')"
          :disabled="
            isSubmitting || isUploading || (!newMessage.trim() && !selectedFile)
          "
          v-loading="isSubmitting || isUploading"
          class="w-full md:w-auto"
        >
          {{ isSubmitting || isUploading ? "處理中..." : "送出" }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, CopyDocument } from "@element-plus/icons-vue";

// import interfaces
import {
  fetchHistory,
  deleteMemo,
  sendTextMessage,
  uploadFile,
  verifyPassword,
  getDownloadUrl,
} from "../utils";
import type { Memo } from "../utils";

const memos = ref<Memo[]>([]);
const newMessage = ref("");
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const historyContainer = ref<HTMLDivElement | null>(null);

const isLoading = ref(false); // 控制歷史紀錄載入狀態
const isSubmitting = ref(false); // 控制文字/AI訊息傳送狀態
const isUploading = ref(false); // 控制檔案上傳狀態

const error = ref<string | null>(null); // 歷史紀錄載入錯誤
const uploadError = ref<string | null>(null); // 檔案上傳錯誤
const uploadProgress = ref<number | null>(null); // 檔案上傳進度

// 呼叫 utils 中的 fetchHistory
const loadHistory = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    memos.value = await fetchHistory();
    scrollToBottom();
  } catch (err: any) {
    console.error("Fetch history error:", err);
    error.value = err.message || "載入失敗";
  } finally {
    isLoading.value = false;
  }
};

// 處理刪除筆記的邏輯，呼叫 utils 中的 deleteMemo
const handleDeleteMemo = async (id: number) => {
  if (isSubmitting.value || isUploading.value) return; // 避免多個操作同時進行
  isSubmitting.value = true; // 雖然是刪除，但也算一種提交操作
  error.value = null; // 清除歷史紀錄載入錯誤

  try {
    await deleteMemo(id);
    // 如果 API 成功，才更新前端列表
    memos.value = memos.value.filter((memo) => memo.id !== id);
    ElMessage({
      message: "刪除成功",
      type: "success",
    });
  } catch (err: any) {
    console.error("Delete memo error:", err);
    ElMessage({
      message: err.message || "刪除失敗",
      type: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// 複製筆記內容
const handleCopyMemo = async (content: string) => {
  await navigator.clipboard.writeText(content);
  ElMessage.success("複製成功！");
};

// 處理訊息或檔案發送的邏輯
const handleSendMessage = async (sendType: "text" | "file") => {
  if (isSubmitting.value || isUploading.value) return;

  if (selectedFile.value) {
    // 如果有選取檔案，則執行檔案上傳邏輯
    await handleUploadFile(); // 改名以區別 utils 中的 uploadFile
    return;
  }

  // 如果沒有選取檔案，則處理文字訊息
  if (!newMessage.value.trim()) {
    ElMessage.warning("請輸入訊息或選擇檔案");
    return;
  }

  isSubmitting.value = true;
  error.value = null;

  try {
    if (sendType === "text") {
      // 傳送一般文字訊息
      let newID = await sendTextMessage(newMessage.value);
      // 將新訊息加入到前端列表
      const newUserMemo: Memo = {
        id: newID,
        type: "text",
        content: newMessage.value,
        timestamp: new Date().toISOString(),
      };
      insertNewMessage(newUserMemo);

      // 清空輸入框
      newMessage.value = "";
      ElMessage.success("文字訊息傳送成功");
    }
  } catch (err: any) {
    console.error("Send message error:", err);
    ElMessage({
      message: err.message || "傳送失敗",
      type: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// 處理檔案選取
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
    uploadError.value = null;
    uploadProgress.value = null;
    // 清空文字訊息，因為優先處理檔案
    newMessage.value = "";
  } else {
    selectedFile.value = null;
    uploadProgress.value = null; // 清空進度顯示
  }
};

// 處理檔案上傳的邏輯，呼叫 utils 中的 uploadFile
const handleUploadFile = async () => {
  if (!selectedFile.value || isUploading.value || isSubmitting.value) return;

  isUploading.value = true;
  uploadError.value = null;
  uploadProgress.value = 0; // 初始化進度

  try {
    // 呼叫 utils 中的 uploadFile 函數，並傳入進度回調
    await uploadFile(selectedFile.value, (percent) => {
      uploadProgress.value = percent;
    });

    // 上傳成功後
    ElMessage.success("檔案上傳成功");

    // 更新前端列表，這裡假設上傳後會有一個新的 Memo 物件
    const newMemo: Memo = {
      id: Date.now(), // 假設 ID 是時間戳
      type: "file",
      content: selectedFile.value.name,
      file_key: selectedFile.value.name, // 假設這是檔案的唯一識別碼
      file_size: selectedFile.value.size,
      timestamp: new Date().toISOString(),
    };
    insertNewMessage(newMemo);

    // 清空檔案選擇和進度顯示
    selectedFile.value = null;
    if (fileInput.value) {
      fileInput.value.value = ""; // 清空 input file 的選取狀態
    }
    uploadProgress.value = null;
  } catch (err: any) {
    console.error("Upload file error:", err);
    uploadError.value = err.message || "上傳失敗";
    ElMessage.error(uploadError.value ? "上傳失敗" : "上傳失敗");
    uploadProgress.value = null; // 上傳失敗也清空進度顯示
  } finally {
    isUploading.value = false;
  }
};

// 檔案大小格式化函數 (保留在元件中，這是 UI 呈現邏輯)
const formatFileSize = (bytes?: number | null): string => {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0)
    return "0 Bytes";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.max(0, Math.floor(Math.log(bytes) / Math.log(k)));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 插入新訊息到前端列表
const insertNewMessage = (newMemo: Memo) => {
  memos.value.push(newMemo);
  scrollToBottom();
};

// 滾動到底部
const scrollToBottom = async () => {
  await nextTick();
  if (historyContainer.value) {
    historyContainer.value.scrollTop = historyContainer.value.scrollHeight;
  }
};

// 處理鍵盤事件，區分中文輸入法選字的Enter和一般的Enter
const handleKeyDown = (event: KeyboardEvent) => {
  // 如果正在輸入法組字中，不處理Enter鍵
  if (event.isComposing || event.keyCode === 229) {
    return;
  }

  // 只有在按下Enter且沒有按下Shift鍵時才發送訊息
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage("text");
  }
};

// 掛載時的邏輯，呼叫 utils 中的 verifyPassword 和 fetchHistory
onMounted(async () => {
  let password = localStorage.getItem("myNote");
  let verified = false;
  let hasVerificationError = false; // 新增一個標記來處理驗證失敗後的流程

  if (password) {
    try {
      // 呼叫 utils 中的 verifyPassword
      await verifyPassword(password);
      verified = true;
    } catch (error: any) {
      console.error("Stored password verification error:", error);
      localStorage.removeItem("myNote"); // 儲存的密碼無效，移除它
      password = null;
      ElMessage.warning(`儲存的密碼已失效：${error.message || "請重新輸入"}`);
      hasVerificationError = true; // 標記發生驗證錯誤
    }
  }

  // 如果沒有驗證成功且沒有發生嚴重的驗證錯誤 (例如網路錯誤導致無法顯示彈窗)
  if (!verified && !hasVerificationError) {
    try {
      const { value: myPassword } = await ElMessageBox.prompt(
        "請輸入密碼",
        "驗證",
        {
          confirmButtonText: "確定",
          cancelButtonText: "取消",
          inputType: "password",
          inputValidator: (val) => !!val,
          inputErrorMessage: "密碼不能為空",
        },
      );
      password = myPassword;
      // 呼叫 utils 中的 verifyPassword
      await verifyPassword(password);
      verified = true;
      localStorage.setItem("myNote", password); // 驗證成功，儲存新密碼
      ElMessage.success("密碼正確，開始使用筆記功能");
    } catch (error: any) {
      if (error !== "cancel" && error !== "close") {
        // 欺騙其他人
        ElMessage.success("密碼正確，開始使用筆記功能");
        hasVerificationError = true; // 標記發生錯誤，阻止後續載入
      } else {
        ElMessage.info("已取消驗證");
        hasVerificationError = true; // 標記已取消，阻止後續載入
      }
    }
  }

  // 只有在成功驗證後才載入歷史紀錄
  if (verified) {
    await loadHistory();
    await nextTick();
    scrollToBottom();
  }
});
</script>
