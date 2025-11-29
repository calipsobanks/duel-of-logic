-- Create analytics_events table to track user interactions
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_target TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Only the specific admin user can view analytics
CREATE POLICY "Admin user can view all analytics"
ON public.analytics_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'edwardhill91@gmail.com'
  )
);

-- All authenticated users can insert their own analytics events
CREATE POLICY "Users can insert their own analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);