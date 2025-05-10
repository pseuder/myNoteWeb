import axios from 'axios';

// 定義 API 的基礎 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// 定義 Memo 介面，方便型別檢查
export interface Memo {
  id: number;
  type: "text" | "file";
  content: string;
  file_key?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  file_url?: string | null;
  timestamp: string;
}

// ================================================================
// IMPORTANT: 設定 Axios 請求攔截器，自動攜帶 JWT Token
// ================================================================
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('myNote');
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + encodeURIComponent(token);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to handle consistent API responses and errors
const handleApiResponse = async <T>(
    promise: Promise<any>,
    errorMessage: string
): Promise<T> => {
    try {
        const response = await promise;
        if (response.data && response.data.success) {
             return (response.data.data !== undefined ? response.data.data : true) as T;
        } else {
            const apiErrorMessage = response.data?.error || `API 錯誤: ${response.status}`;
            console.error("API Request failed:", response.status, response.statusText, response.data);
            throw new Error(apiErrorMessage);
        }
    } catch (error: any) {
        console.error("Axios Request failed:", error);
        if (axios.isAxiosError(error)) {
             const apiErrorMessage = error.response?.data?.error;
             if (apiErrorMessage) {
                 throw new Error(apiErrorMessage);
             } else if (error.response) {
                 throw new Error(`請求失敗: ${error.response.status} ${error.response.statusText}`);
             } else if (error.request) {
                 throw new Error("無法連接到伺服器，請檢查網路");
             }
        } else if (error instanceof Error) {
             throw error;
        }
        throw new Error(errorMessage);
    }
};


/**
 * 獲取歷史紀錄
 * @returns Promise<Memo[]>
 */
export const fetchHistory = async (): Promise<Memo[]> => {
  // 這個請求會經過攔截器，自動帶上 Authorization header (如果 localStorage 有 token)
  return handleApiResponse<Memo[]>(
    axios.get(`${API_BASE_URL}/history`),
    "載入歷史紀錄失敗"
  );
};

/**
 * 刪除指定 ID 的筆記
 * @param id 筆記 ID
 * @returns Promise<void>
 */
export const deleteMemo = async (id: number): Promise<void> => {
  // 這個請求會經過攔截器，自動帶上 Authorization header (如果 localStorage 有 token)
  return handleApiResponse<void>(
    axios.delete(`${API_BASE_URL}/messages/${id}`),
    "刪除筆記失敗"
  );
};

/**
 * 發送文字訊息
 * @param text 訊息內容
 * @returns Promise<number>
 */
export const sendTextMessage = async (text: string): Promise<number> => {
    // 這個請求會經過攔截器，自動帶上 Authorization header (如果 localStorage 有 token)
    const res = await handleApiResponse<{ id: number }>( 
        axios.post(`${API_BASE_URL}/messages`, { text }),
        "傳送文字訊息失敗"
    );
    return res.id;
};

/**
 * 發送訊息給 AI 服務 (WorkersAI 或 AutoRAG)
 * @param type 'WorkersAI' | 'AutoRAG'
 * @param text 訊息內容
 * @returns Promise<string> - AI 回應的文字內容
 */
export const sendAIMessage = async (type: 'WorkersAI' | 'AutoRAG', text: string): Promise<string> => {
    const endpoint = type === 'WorkersAI' ? '/workersai' : '/autorag';
    // 這個請求會經過攔截器，自動帶上 Authorization header (如果 localStorage 有 token)
    return handleApiResponse<string>(
        axios.post(`${API_BASE_URL}${endpoint}`, { text }),
        `傳送訊息給 ${type} 失敗`
    );
};

/**
 * 上傳檔案
 * @param file 要上傳的檔案
 * @param onProgress 上傳進度回調函數 (接收百分比 0-100)
 * @returns Promise<void>
 */
export const uploadFile = async (file: File, onProgress: (percent: number) => void): Promise<void> => {
  const formData = new FormData();
  formData.append("file", file);

  // 這個請求會經過攔截器，自動帶上 Authorization header (如果 localStorage 有 token)
  return handleApiResponse<void>(
    axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        // 注意：Content-Type 設置在這裡是必要的，因為是 multipart/form-data
        // 攔截器只負責添加 Authorization，不會影響其他你手動設置的 header
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percentCompleted);
        }
      },
    }),
    "檔案上傳失敗"
  );
};

/**
 * 驗證密碼
 * @param password 要驗證的密碼
 * @returns Promise<void>
 */
export const verifyPassword = async (password: string): Promise<void> => {
    return handleApiResponse<void>(
        axios.post(`${API_BASE_URL}/verifyPassword`, { password }),
        "密碼驗證失敗"
    );
};


/**
 * 獲取檔案下載 URL
 * @param fileKey 檔案儲存的 key
 * @returns 檔案下載的 URL 字串
 */
export const getDownloadUrl = (fileKey: string): string => {
  return `${API_BASE_URL}/download/${fileKey}`;
};
