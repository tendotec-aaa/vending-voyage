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
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_info: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          default_currency: string | null
          email: string | null
          id: string
          logo_url: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          registration_number: string | null
          state_province: string | null
          tax_id: string | null
          trade_name: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          default_currency?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          registration_number?: string | null
          state_province?: string | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          default_currency?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          registration_number?: string | null
          state_province?: string | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          item_detail_id: string | null
          last_updated: string | null
          quantity_on_hand: number | null
          slot_id: string | null
          spot_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          id?: string
          item_detail_id?: string | null
          last_updated?: string | null
          quantity_on_hand?: number | null
          slot_id?: string | null
          spot_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          id?: string
          item_detail_id?: string | null
          last_updated?: string | null
          quantity_on_hand?: number | null
          slot_id?: string | null
          spot_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "machine_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_inventory_item_definition_id_fkey"
            columns: ["item_detail_id"]
            isOneToOne: false
            referencedRelation: "item_details"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          actual_quantity: number
          adjustment_type: string
          created_at: string
          difference: number
          expected_quantity: number
          id: string
          item_detail_id: string
          slot_id: string
          visit_id: string
        }
        Insert: {
          actual_quantity: number
          adjustment_type: string
          created_at?: string
          difference: number
          expected_quantity: number
          id?: string
          item_detail_id: string
          slot_id: string
          visit_id: string
        }
        Update: {
          actual_quantity?: number
          adjustment_type?: string
          created_at?: string
          difference?: number
          expected_quantity?: number
          id?: string
          item_detail_id?: string
          slot_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_item_detail_id_fkey"
            columns: ["item_detail_id"]
            isOneToOne: false
            referencedRelation: "item_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "machine_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "spot_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_ledger: {
        Row: {
          created_at: string
          id: string
          item_detail_id: string
          movement_type: string
          notes: string | null
          performed_by: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          running_balance: number
          slot_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_detail_id: string
          movement_type: string
          notes?: string | null
          performed_by?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          running_balance: number
          slot_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_detail_id?: string
          movement_type?: string
          notes?: string | null
          performed_by?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number
          slot_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_ledger_item_detail_id_fkey"
            columns: ["item_detail_id"]
            isOneToOne: false
            referencedRelation: "item_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "machine_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      item_details: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          photo_url: string | null
          sku: string
          subcategory_id: string | null
          type: Database["public"]["Enums"]["item_type"]
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          photo_url?: string | null
          sku: string
          subcategory_id?: string | null
          type: Database["public"]["Enums"]["item_type"]
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          sku?: string
          subcategory_id?: string | null
          type?: Database["public"]["Enums"]["item_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_definitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_definitions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "item_details"
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
          model_type: string | null
          number_of_slots: number | null
          position_on_setup: number | null
          serial_generation: string | null
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
          model_type?: string | null
          number_of_slots?: number | null
          position_on_setup?: number | null
          serial_generation?: string | null
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
          model_type?: string | null
          number_of_slots?: number | null
          position_on_setup?: number | null
          serial_generation?: string | null
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
            referencedRelation: "item_details"
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
            referencedRelation: "item_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      purchase_items: {
        Row: {
          active_item: boolean | null
          arrival_order: number | null
          cbm: number | null
          created_at: string | null
          final_unit_cost: number | null
          global_fees_allocated: number | null
          id: string
          inventory_id: string | null
          item_detail_id: string | null
          landed_unit_cost: number | null
          line_fees_total: number | null
          purchase_id: string | null
          quantity_ordered: number
          quantity_received: number | null
          quantity_remaining: number | null
          tax_allocated: number | null
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          active_item?: boolean | null
          arrival_order?: number | null
          cbm?: number | null
          created_at?: string | null
          final_unit_cost?: number | null
          global_fees_allocated?: number | null
          id?: string
          inventory_id?: string | null
          item_detail_id?: string | null
          landed_unit_cost?: number | null
          line_fees_total?: number | null
          purchase_id?: string | null
          quantity_ordered: number
          quantity_received?: number | null
          quantity_remaining?: number | null
          tax_allocated?: number | null
          unit_cost: number
          updated_at?: string | null
        }
        Update: {
          active_item?: boolean | null
          arrival_order?: number | null
          cbm?: number | null
          created_at?: string | null
          final_unit_cost?: number | null
          global_fees_allocated?: number | null
          id?: string
          inventory_id?: string | null
          item_detail_id?: string | null
          landed_unit_cost?: number | null
          line_fees_total?: number | null
          purchase_id?: string | null
          quantity_ordered?: number
          quantity_received?: number | null
          quantity_remaining?: number | null
          tax_allocated?: number | null
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_lines_item_definition_id_fkey"
            columns: ["item_detail_id"]
            isOneToOne: false
            referencedRelation: "item_details"
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
            referencedRelation: "purchase_items"
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
          received_at: string | null
          received_inventory: boolean | null
          status: Database["public"]["Enums"]["purchase_status"] | null
          supplier_id: string | null
          total_amount: number | null
          type: Database["public"]["Enums"]["purchase_type"] | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          expected_arrival_date?: string | null
          id?: string
          local_tax_rate?: number | null
          purchase_order_number: string
          received_at?: string | null
          received_inventory?: boolean | null
          status?: Database["public"]["Enums"]["purchase_status"] | null
          supplier_id?: string | null
          total_amount?: number | null
          type?: Database["public"]["Enums"]["purchase_type"] | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          expected_arrival_date?: string | null
          id?: string
          local_tax_rate?: number | null
          purchase_order_number?: string
          received_at?: string | null
          received_inventory?: boolean | null
          status?: Database["public"]["Enums"]["purchase_status"] | null
          supplier_id?: string | null
          total_amount?: number | null
          type?: Database["public"]["Enums"]["purchase_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_allocations: {
        Row: {
          created_at: string
          id: string
          purchase_id: string
          purchase_item_id: string
          quantity: number
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          purchase_id: string
          purchase_item_id: string
          quantity: number
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          purchase_id?: string
          purchase_item_id?: string
          quantity?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_allocations_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_allocations_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_allocations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_notes: {
        Row: {
          created_at: string
          created_by: string | null
          difference: number
          id: string
          note: string | null
          purchase_id: string
          purchase_item_id: string
          quantity_expected: number
          quantity_received: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difference: number
          id?: string
          note?: string | null
          purchase_id: string
          purchase_item_id: string
          quantity_expected: number
          quantity_received: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difference?: number
          id?: string
          note?: string | null
          purchase_id?: string
          purchase_item_id?: string
          quantity_expected?: number
          quantity_received?: number
        }
        Relationships: [
          {
            foreignKeyName: "receiving_notes_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_notes_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
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
          visit_type: string | null
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
          visit_type?: string | null
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
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spot_visits_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
      user_profiles: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string | null
          driver_license_expiry_date: string | null
          driver_license_type: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          employed_since: string | null
          first_names: string | null
          has_driver_license: boolean | null
          id: string
          last_names: string | null
          personal_id_number: string | null
          phone_number: string | null
          profile_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          driver_license_expiry_date?: string | null
          driver_license_type?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          employed_since?: string | null
          first_names?: string | null
          has_driver_license?: boolean | null
          id: string
          last_names?: string | null
          personal_id_number?: string | null
          phone_number?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string | null
          driver_license_expiry_date?: string | null
          driver_license_type?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          employed_since?: string | null
          first_names?: string | null
          has_driver_license?: boolean | null
          id?: string
          last_names?: string | null
          personal_id_number?: string | null
          phone_number?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
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
          computed_current_stock: number | null
          created_at: string | null
          false_coins: number
          id: string
          jam_status: string
          machine_id: string | null
          meter_reading: number | null
          photo_url: string | null
          product_id: string | null
          quantity_added: number | null
          quantity_removed: number | null
          slot_id: string | null
          spot_visit_id: string | null
          units_sold: number | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["visit_action_type"]
          cash_collected?: number | null
          computed_current_stock?: number | null
          created_at?: string | null
          false_coins?: number
          id?: string
          jam_status?: string
          machine_id?: string | null
          meter_reading?: number | null
          photo_url?: string | null
          product_id?: string | null
          quantity_added?: number | null
          quantity_removed?: number | null
          slot_id?: string | null
          spot_visit_id?: string | null
          units_sold?: number | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["visit_action_type"]
          cash_collected?: number | null
          computed_current_stock?: number | null
          created_at?: string | null
          false_coins?: number
          id?: string
          jam_status?: string
          machine_id?: string | null
          meter_reading?: number | null
          photo_url?: string | null
          product_id?: string | null
          quantity_added?: number | null
          quantity_removed?: number | null
          slot_id?: string | null
          spot_visit_id?: string | null
          units_sold?: number | null
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
            referencedRelation: "item_details"
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
      visit_slot_snapshots: {
        Row: {
          created_at: string
          id: string
          previous_capacity: number
          previous_coin_acceptor: number
          previous_product_id: string | null
          previous_stock: number
          slot_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          previous_capacity?: number
          previous_coin_acceptor?: number
          previous_product_id?: string | null
          previous_stock?: number
          slot_id: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          previous_capacity?: number
          previous_coin_acceptor?: number
          previous_product_id?: string | null
          previous_stock?: number
          slot_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_slot_snapshots_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "machine_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_slot_snapshots_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "spot_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
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
        | "arrived"
        | "received"
        | "cancelled"
      purchase_type: "local" | "import"
      setup_type: "single" | "double" | "triple" | "quad" | "custom"
      spot_status: "active" | "inactive"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "pending" | "in_progress" | "completed"
      user_role: "admin" | "route_operator" | "warehouse_manager"
      visit_action_type: "restock" | "collection" | "service" | "swap"
      visit_status: "completed" | "flagged" | "reversed"
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
        "arrived",
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
      visit_status: ["completed", "flagged", "reversed"],
    },
  },
} as const
