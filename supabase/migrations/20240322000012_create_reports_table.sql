-- Create reports table for storing generated reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'generating', 'failed')),
    parameters JSONB,
    file_size TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON public.reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON public.reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view all reports (for now - you can restrict this later)
CREATE POLICY "Users can view reports" ON public.reports
    FOR SELECT USING (true);

-- Users can insert their own reports
CREATE POLICY "Users can insert reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = generated_by);

-- Users can update their own reports
CREATE POLICY "Users can update own reports" ON public.reports
    FOR UPDATE USING (auth.uid() = generated_by);

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports" ON public.reports
    FOR DELETE USING (auth.uid() = generated_by);

-- Grant permissions
GRANT ALL ON public.reports TO authenticated;
GRANT SELECT ON public.reports TO anon;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
