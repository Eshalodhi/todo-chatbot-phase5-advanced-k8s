import type {
  Task,
  Tag,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskListResponse,
  TaskQueryParams,
  TagListResponse,
  CreateTagRequest,
  ErrorResponse,
  ChatRequest,
  ChatResponse,
  Conversation,
  Message,
} from '@/types';

// =============================================================================
// API Configuration
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// API Error Class
// =============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

// =============================================================================
// Auth Token Management
// =============================================================================

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
    return user.id;
  } catch {
    return null;
  }
}

// =============================================================================
// API Client
// =============================================================================

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = getAccessToken();

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let detail = 'An error occurred';
      try {
        const error: ErrorResponse = await response.json();
        detail = error.detail || detail;
      } catch {
        // Use default message
      }

      // Handle specific status codes
      if (response.status === 401) {
        // Clear stored auth data and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }

      throw new ApiError(response.status, detail);
    }

    // Handle empty responses (e.g., DELETE)
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  // ==========================================================================
  // Task Endpoints
  // ==========================================================================

  /**
   * Get all tasks for the current user with optional filtering/sorting
   */
  async getTasks(params?: TaskQueryParams): Promise<TaskListResponse> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');

    // Build query string from params
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.tags?.length) {
      params.tags.forEach(tag => searchParams.append('tags', tag));
    }
    if (params?.is_completed !== undefined) {
      searchParams.append('is_completed', String(params.is_completed));
    }
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.order) searchParams.append('order', params.order);

    const queryString = searchParams.toString();
    const url = `/api/${userId}/tasks${queryString ? `?${queryString}` : ''}`;

    return this.request<TaskListResponse>(url);
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: number): Promise<Task> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    return this.request<Task>(`/api/${userId}/tasks/${taskId}`);
  }

  /**
   * Create a new task
   */
  async createTask(data: CreateTaskRequest): Promise<Task> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    return this.request<Task>(`/api/${userId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: number, data: UpdateTaskRequest): Promise<Task> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    return this.request<Task>(`/api/${userId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: number): Promise<void> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    await this.request<void>(`/api/${userId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Toggle task completion status
   */
  async toggleComplete(taskId: number): Promise<Task> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    return this.request<Task>(`/api/${userId}/tasks/${taskId}/complete`, {
      method: 'PATCH',
    });
  }

  // ==========================================================================
  // Tag Endpoints (Phase V)
  // ==========================================================================

  /**
   * Get all tags for the current user
   */
  async getTags(): Promise<TagListResponse> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    return this.request<TagListResponse>(`/api/${userId}/tags`);
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagRequest): Promise<Tag> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    return this.request<Tag>(`/api/${userId}/tags`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: number): Promise<void> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    await this.request<void>(`/api/${userId}/tags/${tagId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Add a tag to a task
   */
  async addTagToTask(taskId: number, tagId: number): Promise<void> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    await this.request<void>(`/api/${userId}/tasks/${taskId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag_id: tagId }),
    });
  }

  /**
   * Remove a tag from a task
   */
  async removeTagFromTask(taskId: number, tagId: number): Promise<void> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    await this.request<void>(`/api/${userId}/tasks/${taskId}/tags/${tagId}`, {
      method: 'DELETE',
    });
  }

  // ==========================================================================
  // Chat Endpoints (Phase III)
  // ==========================================================================

  /**
   * Send a message to the AI chatbot
   */
  async sendChatMessage(message: string, conversationId?: number): Promise<ChatResponse> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');

    const body: ChatRequest = { message };
    if (conversationId) {
      body.conversation_id = conversationId;
    }

    return this.request<ChatResponse>(`/api/${userId}/chat`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Get all conversations for the current user
   */
  async getConversations(): Promise<Conversation[]> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    return this.request<Conversation[]>(`/api/${userId}/conversations`);
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(conversationId: number): Promise<Message[]> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not authenticated');
    return this.request<Message[]>(`/api/${userId}/conversations/${conversationId}/messages`);
  }
}

// =============================================================================
// Export Singleton Instance
// =============================================================================

export const api = new ApiClient();
