-- CauseListPro database schema

-- 1. Advocates table
CREATE TABLE advocates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    bar_council_id TEXT UNIQUE NOT NULL,
    bar_state_code TEXT NOT NULL,
    bar_number TEXT NOT NULL,
    bar_year TEXT NOT NULL,
    tshc_cis_code TEXT,
    tshc_computer_code TEXT,
    notify_zero_cases BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    plan_tier TEXT DEFAULT 'trial',
    trial_expires_at TIMESTAMPTZ DEFAULT now() + interval '30 days',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Daily results table
CREATE TABLE daily_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advocate_id UUID NOT NULL REFERENCES advocates(id) ON DELETE CASCADE,
    hearing_date DATE NOT NULL,
    court_source TEXT NOT NULL CHECK (court_source IN (
        'tshc_daily', 'tshc_advance', 'tshc_supplementary',
        'rangareddy', 'ccc_hyd', 'metro_sessions', 'medchal'
    )),
    total_cases INTEGER DEFAULT 0,
    cases_json JSONB DEFAULT '[]',
    raw_html TEXT,
    scraped_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(advocate_id, hearing_date, court_source)
);

-- 3. Notification logs table
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advocate_id UUID REFERENCES advocates(id),
    hearing_date DATE NOT NULL,
    channel TEXT DEFAULT 'email',
    status TEXT DEFAULT 'pending',
    message_subject TEXT,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Scrape logs table
CREATE TABLE scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running',
    court_source TEXT NOT NULL,
    advocates_checked INTEGER DEFAULT 0,
    cases_found INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'
);

-- Indexes
CREATE INDEX idx_advocates_bar_council_id ON advocates(bar_council_id);
CREATE INDEX idx_advocates_tshc_cis_code ON advocates(tshc_cis_code);
CREATE INDEX idx_advocates_email ON advocates(email);
CREATE INDEX idx_daily_results_advocate_hearing ON daily_results(advocate_id, hearing_date);
CREATE INDEX idx_daily_results_hearing_court ON daily_results(hearing_date, court_source);

-- Seed test advocates
INSERT INTO advocates (name, email, bar_council_id, bar_state_code, bar_number, bar_year, tshc_computer_code) VALUES
    ('AMBALA RAJU', 'test1@causelistpro.in', 'TS/315/2017', 'TS', '315', '2017', 'NB/TS/2019/01390'),
    ('AMRITA ARYENDRA', 'test2@causelistpro.in', 'TS/766/2019', 'TS', '766', '2019', 'NB/TS/2019/01461'),
    ('ANKIT SHUKLA', 'test3@causelistpro.in', 'TS/02429/2025', 'TS', '02429', '2025', 'NB/TS/2025/13867'),
    ('ANUPRIYA SETHI SETHI', 'test4@causelistpro.in', 'TS/825/2019', 'TS', '825', '2019', 'NB/TS/2026/14269'),
    ('APOORVA BANTULA', 'test5@causelistpro.in', 'TS/00482/2020', 'TS', '00482', '2020', 'NB/TS/2026/14286'),
    ('ARAVIND REDDY KASARLA', 'test6@causelistpro.in', 'TS/01288/2018', 'TS', '01288', '2018', 'NB/TS/2025/13263');
