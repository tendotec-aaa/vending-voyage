-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('pending', 'in_progress', 'completed');

-- Create enum for priority levels
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create maintenance_tickets table
CREATE TABLE public.maintenance_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Location info (required)
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES public.spots(id) ON DELETE SET NULL,
  
  -- Ticket details
  issue_type TEXT NOT NULL,
  description TEXT,
  status public.ticket_status NOT NULL DEFAULT 'pending',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  
  -- Reporter info
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Resolution info
  resolved_at TIMESTAMP WITH TIME ZONE,
  cost NUMERIC DEFAULT 0,
  
  -- Optional references (if created from visit or linked to assets)
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES public.machine_slots(id) ON DELETE SET NULL,
  setup_id UUID REFERENCES public.setups(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.item_definitions(id) ON DELETE SET NULL,
  visit_id UUID REFERENCES public.spot_visits(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Allow read for authenticated" 
ON public.maintenance_tickets 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated" 
ON public.maintenance_tickets 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated" 
ON public.maintenance_tickets 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated" 
ON public.maintenance_tickets 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create index for common queries
CREATE INDEX idx_maintenance_tickets_status ON public.maintenance_tickets(status);
CREATE INDEX idx_maintenance_tickets_location ON public.maintenance_tickets(location_id);
CREATE INDEX idx_maintenance_tickets_priority ON public.maintenance_tickets(priority);