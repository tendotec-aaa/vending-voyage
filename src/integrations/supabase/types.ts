export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      item_definitions: {
        Row: {
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          photo_url: string | null
          sku: string
          type: Database["public"]["Enums"]["item_type"]
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          photo_url?: string | null
          sku: string
          type: Database["public"]["Enums"]["item_type"]
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          sku?: string
          type?: Database["public"]["Enums"]["item_type"]
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          commission_percentage: number | null
          contact_person_email: string | null
          contact_person_name: string | null
          contact_person_number: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          contract_term: Database["public"]["Enums"]["contract_term"] | null
          created_at: string | null
          currency: string | null
          id: string
          name: string
          negotiation_type:
            | Database["public"]["Enums"]["negotiation_type"]
            | null
          rent_amount: number | null
          total_spots: number | null
        }
        Insert: {
          address?: string | null
          commission_percentage?: number | null
          contact_person_email?: string | null
          contact_person_name?: string | null
          contact_person_number?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_term?: Database["public"]["Enums"]["contract_term"] | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name: string
          negotiation_type?:
            | Database["public"]["Enums"]["negotiation_type"]
            | null
          rent_amount?: number | null
          total_spots?: number | null
        }
        Update: {
          address?: string | null
          commission_percentage?: number | null
          contact_person_email?: string | null
          contact_person_name?: string | null
          contact_person_number?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_term?: Database["public"]["Enums"]["contract_term"] | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name?: string
          negotiation_type?:
            | Database["public"]["Enums"]["negotiation_type"]
            | null
          rent_amount?: number | null
          total_spots?: number | null
        }
        Relationships: []
      }
      machine_slots: {
        Row: {
          capacity: number | null
          coin_acceptor: number | null
          created_at: string | null
          current_product_id: string | null
          current_stock: number | null
          id: string
          machine_id: string | null
          slot_number: number
        }
        Insert: {
          capacity?: number | null
          coin_acceptor?: number | null
          created_at?: string | null
          current_product_id?: string | null
          current_stock?: number | null
          id?: string
          machine_id?: string | null
          slot_number: number
        }
        Update: {
          capacity?: number | null
          coin_acceptor?: number | null
          created_at?: string | null
          current_product_id?: string | null
          current_stock?: number | null
          id?: string
          machine_id?: string | null
          slot_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "machine_slots_current_product_id_fkey"
            columns: ["current_product_id"]
            isOneToOne: false
            referencedRelation: "item_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_slots_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          cash_key: string | null
          created_at: string | null
          id: string
          model_id: string | null
          number_of_slots: number | null
          position_on_setup: number | null
          serial_number: string
          setup_id: string | null
          status: Database["public"]["Enums"]["machine_status"] | null
          toy_key: string | null
        }
        Insert: {
          cash_key?: string | null
          created_at?: string | null
          id?: string
          model_id?: string | null
          number_of_slots?: number | null
          position_on_setup?: number | null
          serial_number: string
          setup_id?: string | null
          status?: Database["public"]["Enums"]["machine_status"] | null
          toy_key?: string | null
        }
        Update: {
          cash_key?: string | null
          created_at?: string | null
          id?: string
          model_id?: string | null
          number_of_slots?: number | null
          position_on_setup?: number | null
          serial_number?: string
          setup_id?: string | null
          status?: Database["public"]["Enums"]["machine_status"] | null
          toy_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "item_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          issue_type: string
          location_id: string
          machine_id: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          product_id: string | null
          reporter_id: string | null
          resolved_at: string | null
          setup_id: string | null
          slot_id: string | null
          spot_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          visit_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          issue_type: string
          location_id: string
          machine_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          product_id?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
          setup_id?: string | null
          slot_id?: string | null
          spot_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          visit_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          issue_type?: string
          location_id?: string
          machine_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          product_id?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
          setup_id?: string | null
          slot_id?: string | null
          spot_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "item_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "machine_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "spot_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_global_fees: {
        Row: {
          amount: number
          created_at: string | null
          distribution_method: string
          fee_name: string
          id: string
          purchase_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          distribution_method?: string
          fee_name: string
          id?: string
          purchase_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          distribution_method?: string
          fee_name?: string
          id?: string
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_global_fees_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_line_fees: {
        Row: {
          amount: number
          created_at: string | null
          fee_name: string
          id: string
          purchase_line_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          fee_name: string
          id?: string
          purchase_line_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          fee_name?: string
          id?: string
          purchase_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_line_fees_purchase_line_id_fkey"
            columns: ["purchase_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_lines: {
        Row: {
          cbm: number | null
          id: string
          item_definition_id: string | null
          purchase_id: string | null
          quantity_ordered: number
          quantity_received: number | null
          unit_cost: number
        }
        Insert: {
          cbm?: number | null
          id?: string
          item_definition_id?: string | null
          purchase_id?: string | null
          quantity_ordered: number
          quantity_received?: number | null
          unit_cost: number
        }
        Update: {
          cbm?: number | null
          id?: string
          item_definition_id?: string | null
          purchase_id?: string | null
          quantity_ordered?: number
          quantity_received?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_lines_item_definition_id_fkey"
            columns: ["item_definition_id"]
            isOneToOne: false
            referencedRelation: "item_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_lines_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string | null
          currency: string | null
          expected_arrival_date: string | null
          id: string
          local_tax_rate: number | null
          purchase_order_number: string
          status: Database["public"]["Enums"]["purchase_status"] | null
          supplier_id: string | null
          total_amount: number | null
          type: Database["public"]["Enums"]["purchase_type"] | null
          warehouse_destination: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          expected_arrival_date?: string | null
          id?: string
          local_tax_rate?: number | null
          purchase_order_number: string
          status?: Database["public"]["Enums"]["purchase_status"] | null
          supplier_id?: string | null
          total_amount?: number | null
          type?: Database["public"]["Enums"]["purchase_type"] | null
          warehouse_destination?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          expected_arrival_date?: string | null
          id?: string
          local_tax_rate?: number | null
          purchase_order_number?: string
          status?: Database["public"]["Enums"]["purchase_status"] | null
          supplier_id?: string | null
          total_amount?: number | null
          type?: Database["public"]["Enums"]["purchase_type"] | null
          warehouse_destination?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      setups: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          photo_url: string | null
          spot_id: string | null
          type: Database["public"]["Enums"]["setup_type"] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          photo_url?: string | null
          spot_id?: string | null
          type?: Database["public"]["Enums"]["setup_type"] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          photo_url?: string | null
          spot_id?: string | null
          type?: Database["public"]["Enums"]["setup_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "setups_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      spot_visits: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          operator_id: string | null
          spot_id: string | null
          status: Database["public"]["Enums"]["visit_status"] | null
          total_cash_collected: number | null
          verification_photo_url: string | null
          visit_date: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          spot_id?: string | null
          status?: Database["public"]["Enums"]["visit_status"] | null
          total_cash_collected?: number | null
          verification_photo_url?: string | null
          visit_date?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          spot_id?: string | null
          status?: Database["public"]["Enums"]["visit_status"] | null
          total_cash_collected?: number | null
          verification_photo_url?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spot_visits_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_visits_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          location_id: string | null
          name: string
          status: Database["public"]["Enums"]["spot_status"] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          name: string
          status?: Database["public"]["Enums"]["spot_status"] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          name?: string
          status?: Database["public"]["Enums"]["spot_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "spots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          id: string
          lead_time_days: number | null
          name: string
          tax_id: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          lead_time_days?: number | null
          name: string
          tax_id?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          lead_time_days?: number | null
          name?: string
          tax_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_line_items: {
        Row: {
          action_type: Database["public"]["Enums"]["visit_action_type"]
          cash_collected: number | null
          created_at: string | null
          id: string
          machine_id: string | null
          meter_reading: number | null
          product_id: string | null
          quantity_added: number | null
          quantity_removed: number | null
          slot_id: string | null
          spot_visit_id: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["visit_action_type"]
          cash_collected?: number | null
          created_at?: string | null
          id?: string
          machine_id?: string | null
          meter_reading?: number | null
          product_id?: string | null
          quantity_added?: number | null
          quantity_removed?: number | null
          slot_id?: string | null
          spot_visit_id?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["visit_action_type"]
          cash_collected?: number | null
          created_at?: string | null
          id?: string
          machine_id?: string | null
          meter_reading?: number | null
          product_id?: string | null
          quantity_added?: number | null
          quantity_removed?: number | null
          slot_id?: string | null
          spot_visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_line_items_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "item_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_line_items_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "machine_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_line_items_spot_visit_id_fkey"
            columns: ["spot_visit_id"]
            isOneToOne: false
            referencedRelation: "spot_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_inventory: {
        Row: {
          average_cost: number | null
          id: string
          item_definition_id: string | null
          last_updated: string | null
          quantity_on_hand: number | null
        }
        Insert: {
          average_cost?: number | null
          id?: string
          item_definition_id?: string | null
          last_updated?: string | null
          quantity_on_hand?: number | null
        }
        Update: {
          average_cost?: number | null
          id?: string
          item_definition_id?: string | null
          last_updated?: string | null
          quantity_on_hand?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_inventory_item_definition_id_fkey"
            columns: ["item_definition_id"]
            isOneToOne: true
            referencedRelation: "item_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      view_financial_performance: {
        Row: {
          gross_profit: number | null
          location_name: string | null
          month: string | null
          total_revenue: number | null
        }
        Relationships: []
      }
      view_sales_ledger: {
        Row: {
          action_type: Database["public"]["Enums"]["visit_action_type"] | null
          cash_collected: number | null
          location_name: string | null
          operator_email: string | null
          product_name: string | null
          quantity_added: number | null
          serial_number: string | null
          setup_name: string | null
          spot_name: string | null
          visit_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      contract_term: "1_year" | "2_years" | "indefinite" | "custom"
      item_type: "machine_model" | "merchandise" | "spare_part" | "supply"
      machine_status: "in_warehouse" | "deployed" | "maintenance" | "retired"
      negotiation_type: "fixed_rent" | "commission" | "hybrid"
      purchase_status:
        | "draft"
        | "pending"
        | "in_transit"
        | "received"
        | "cancelled"
      purchase_type: "local" | "import"
      setup_type: "single" | "double" | "triple" | "quad" | "custom"
      spot_status: "active" | "inactive"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "pending" | "in_progress" | "completed"
      user_role: "admin" | "route_operator" | "warehouse_manager"
      visit_action_type: "restock" | "collection" | "service" | "swap"
      visit_status: "completed" | "flagged"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      contract_term: ["1_year", "2_years", "indefinite", "custom"],
      item_type: ["machine_model", "merchandise", "spare_part", "supply"],
      machine_status: ["in_warehouse", "deployed", "maintenance", "retired"],
      negotiation_type: ["fixed_rent", "commission", "hybrid"],
      purchase_status: [
        "draft",
        "pending",
        "in_transit",
        "received",
        "cancelled",
      ],
      purchase_type: ["local", "import"],
      setup_type: ["single", "double", "triple", "quad", "custom"],
      spot_status: ["active", "inactive"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["pending", "in_progress", "completed"],
      user_role: ["admin", "route_operator", "warehouse_manager"],
      visit_action_type: ["restock", "collection", "service", "swap"],
      visit_status: ["completed", "flagged"],
    },
  },
} as const
