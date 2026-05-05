-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Cohorts
create table cohorts (
  id uuid primary key default uuid_generate_v4(),
  start_date date not null,
  max_size int default 10,
  status text check (status in ('FORMING','ACTIVE','COMPLETED')) default 'FORMING',
  created_at timestamptz default now()
);

-- Sprints
create table sprints (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  goal_text varchar(200) not null,
  goal_category varchar(50),
  sprint_length int check (sprint_length in (7,14,30)) not null,
  visibility text check (visibility in ('PRIVATE','COHORT','PUBLIC')) default 'PRIVATE',
  status text check (status in ('WAITING','ACTIVE','COMPLETED','ABANDONED')) default 'WAITING',
  cohort_id uuid references cohorts(id) on delete set null,
  start_date date not null default current_date,
  end_date date not null,
  created_at timestamptz default now()
);

-- Tasks (AI-generated daily plan)
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  sprint_id uuid references sprints(id) on delete cascade,
  day_number int not null,
  task_text varchar(80) not null,
  task_type text check (task_type in ('build','research','review')) default 'build',
  is_completed boolean default false,
  is_revised boolean default false,
  created_at timestamptz default now()
);

-- Daily logs
create table daily_logs (
  id uuid primary key default uuid_generate_v4(),
  sprint_id uuid references sprints(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  day_number int not null,
  log_type text check (log_type in ('VERIFIED','HONEST','FAILED_VERIFICATION')) not null,
  log_text text,
  media_url text,
  ai_verification_result jsonb,
  ai_draft_post text,
  posted_to_feed boolean default false,
  verification_attempts int default 0,
  logged_at timestamptz default now()
);

-- Feed posts
create table feed_posts (
  id uuid primary key default uuid_generate_v4(),
  log_id uuid references daily_logs(id) on delete cascade,
  sprint_id uuid references sprints(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  post_text text not null,
  created_at timestamptz default now()
);

-- Reactions
create table reactions (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references feed_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  reaction_type text check (reaction_type in ('WITNESSED','FACING_THIS_TOO')) not null,
  created_at timestamptz default now(),
  unique(post_id, user_id, reaction_type)
);

-- RLS: enable on all tables
alter table profiles enable row level security;
alter table sprints enable row level security;
alter table tasks enable row level security;
alter table daily_logs enable row level security;
alter table feed_posts enable row level security;
alter table reactions enable row level security;
alter table cohorts enable row level security;

-- RLS policies: profiles
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- RLS policies: sprints
create policy "Users can manage own sprints"
  on sprints for all using (auth.uid() = user_id);
create policy "Public sprint records are viewable by all"
  on sprints for select using (visibility = 'PUBLIC');

-- RLS policies: tasks
create policy "Users can manage own tasks"
  on tasks for all using (
    auth.uid() = (select user_id from sprints where id = sprint_id)
  );

-- RLS policies: daily_logs
create policy "Users can manage own logs"
  on daily_logs for all using (auth.uid() = user_id);

-- RLS policies: feed_posts
create policy "Cohort members can view feed posts"
  on feed_posts for select using (
    auth.uid() = user_id or
    exists (
      select 1 from sprints s1
      join sprints s2 on s1.cohort_id = s2.cohort_id
      where s1.user_id = auth.uid()
      and s2.id = feed_posts.sprint_id
      and s1.cohort_id is not null
    )
  );
create policy "Users can insert own feed posts"
  on feed_posts for insert with check (auth.uid() = user_id);

-- RLS policies: reactions
create policy "Cohort members can manage reactions"
  on reactions for all using (auth.uid() = user_id);

-- RLS policies: cohorts (read-only for authenticated users)
create policy "Authenticated users can view cohorts"
  on cohorts for select using (auth.role() = 'authenticated');

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
