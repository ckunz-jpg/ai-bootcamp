export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type UserRole = 'PROPERTY_MANAGER' | 'VENDOR' | 'ADMIN'
export type ProjectType = 'CONSTRUCTION' | 'MAINTENANCE' | 'EVENT' | 'LANDSCAPING' | 'CLEANING' | 'OTHER'
export type ProjectStatus = 'DRAFT' | 'OPEN' | 'IN_REVIEW' | 'AWARDED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string | null
          company: string | null
          role: UserRole
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          company?: string | null
          role?: UserRole
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          company?: string | null
          role?: UserRole
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          state: string
          zip_code: string
          manager_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          state: string
          zip_code: string
          manager_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          state?: string
          zip_code?: string
          manager_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          title: string
          description: string
          budget: number
          timeline: string
          type: ProjectType
          status: ProjectStatus
          deadline: string
          property_id: string
          manager_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          budget: number
          timeline: string
          type: ProjectType
          status?: ProjectStatus
          deadline: string
          property_id: string
          manager_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          budget?: number
          timeline?: string
          type?: ProjectType
          status?: ProjectStatus
          deadline?: string
          property_id?: string
          manager_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      bids: {
        Row: {
          id: string
          amount: number
          description: string
          timeline: string
          notes: string | null
          status: BidStatus
          project_id: string
          vendor_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amount: number
          description: string
          timeline: string
          notes?: string | null
          status?: BidStatus
          project_id: string
          vendor_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amount?: number
          description?: string
          timeline?: string
          notes?: string | null
          status?: BidStatus
          project_id?: string
          vendor_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          file_name: string
          file_url: string
          file_size: number
          mime_type: string
          project_id: string | null
          bid_id: string | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          file_name: string
          file_url: string
          file_size: number
          mime_type: string
          project_id?: string | null
          bid_id?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          file_name?: string
          file_url?: string
          file_size?: number
          mime_type?: string
          project_id?: string | null
          bid_id?: string | null
          uploaded_by?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          content: string
          read: boolean
          project_id: string | null
          sender_id: string
          receiver_id: string
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          read?: boolean
          project_id?: string | null
          sender_id: string
          receiver_id: string
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          read?: boolean
          project_id?: string | null
          sender_id?: string
          receiver_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          title: string
          message: string
          type: string
          read: boolean
          link: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          type: string
          read?: boolean
          link?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          link?: string | null
          user_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      project_type: ProjectType
      project_status: ProjectStatus
      bid_status: BidStatus
    }
  }
}
