<template>
  <div class="flex h-screen flex-col items-center justify-center">
    <el-tabs
      v-model="activeName"
      type="card"
      class="h-full"
      @tab-click="handleClick"
    >
      <el-tab-pane label="MyNote" name="MyNote" class="h-full"
        ><MyNote class="" v-if="isAuthenticated"
      /></el-tab-pane>
      <el-tab-pane label="MySecret" name="MySecret" class="h-full"
        ><MySecret v-if="isAuthenticated"
      /></el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { TabsPaneContext } from "element-plus";
const activeName = ref("MyNote");

import { verifyPassword } from "./utils";
import MyNote from "@/pages/MyNote.vue";
import MySecret from "./pages/MySecret.vue";

const isAuthenticated = ref(false);
const isLoading = ref(false);

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event);
};

// 掛載時的邏輯，呼叫 utils 中的 verifyPassword
onMounted(async () => {
  isLoading.value = true;
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

  // 只有在成功驗證後才設置認證狀態為 true
  isAuthenticated.value = verified;
  isLoading.value = false;
});
</script>

<style>
.el-tabs__header {
  margin: 0px !important;
}
</style>
