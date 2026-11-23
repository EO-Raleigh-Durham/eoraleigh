-- EO Chapter Manager: demo data for the public demo (EO Demo Chapter).
--
-- EVERYTHING IN THIS FILE IS FICTIONAL. The chapter, its members, companies,
-- partners, events, numbers and quotes are invented for the demo. Any likeness
-- to a real person or business is a coincidence. Never run this on a real
-- chapter: it is meant for a throwaway database whose chapter is named
-- exactly "EO Demo Chapter".
--
-- Run it through scripts/demo-reset.mjs, which empties the demo tables first
-- and then loads this file. Every date is relative to the day it runs, so the
-- demo never goes stale. Explicit ids keep it the same after every reset.

begin;

do $$
begin
  if not exists (select 1 from public.chapters where chapter_name = 'EO Demo Chapter') then
    raise exception 'demo-data.sql only runs on the EO Demo Chapter database';
  end if;
  if exists (select 1 from public.people) then
    raise exception 'people is not empty: run scripts/demo-reset.mjs, which empties the demo tables first';
  end if;
end $$;

-- Helpers for this session only (pg_temp disappears when the connection closes)
create or replace function pg_temp.u(prefix text, n int) returns uuid language sql immutable as
  $f$ select (prefix || '-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $f$;
create or replace function pg_temp.h(t text) returns int language sql immutable as
  $f$ select abs(hashtext(t)) % 100 $f$;
-- EO fiscal year (1 July to 30 June) that today falls in, by its start year
create or replace function pg_temp.fy() returns int language sql stable as
  $f$ select extract(year from (current_date - interval '6 months'))::int $f$;
create or replace function pg_temp.fy_label(y int) returns text language sql immutable as
  $f$ select right(y::text, 2) || '/' || right((y + 1)::text, 2) $f$;
-- Days since member n joined: board members are long-standing, the rest spread over eight years
create or replace function pg_temp.joined(n int) returns int language sql immutable as
  $f$ select case when n <= 12 then 1700 + n * 100 else (n * 137) % 2600 + 150 end $f$;
create or replace function pg_temp.at(days int, hours numeric) returns timestamptz language sql stable as
  $f$ select date_trunc('day', now()) + days * interval '1 day' + hours * interval '1 hour' $f$;

-- ---------------------------------------------------------------- companies
-- 1-40 member companies, 41-45 alliance partners, 51-60 prospects' companies
insert into public.companies (id, name, slug, industry, sector, website, employees, city, country, founded, fiscal_year_gross_revenue, description)
select pg_temp.u('c0000000', n), name, slug, industry, industry,
       'https://' || slug || '.example.com', employees, 'Harbor City', 'Demo Country',
       make_date(founded, 1, 1), revenue, description
from (values
  (1, 'Bluepeak Foods', 'bluepeak-foods', 'Food and Beverage', 120, 2011, 14200000, 'Packaged sauces and ready meals for regional grocers.'),
  (2, 'Northwind Logistics', 'northwind-logistics', 'Logistics', 340, 2008, 38500000, 'Freight forwarding and warehousing on the harbor.'),
  (3, 'Saltmarsh Studio', 'saltmarsh-studio', 'Design', 28, 2015, 3400000, 'Brand and packaging design studio.'),
  (4, 'Copperleaf Analytics', 'copperleaf-analytics', 'Software', 65, 2017, 8900000, 'Forecasting software for retailers.'),
  (5, 'Harborlight Clinics', 'harborlight-clinics', 'Healthcare', 210, 2012, 22000000, 'Family medical clinics across the metro area.'),
  (6, 'Quillstone Capital', 'quillstone-capital', 'Financial Services', 18, 2014, 5600000, 'Advisory for owner-run businesses raising growth capital.'),
  (7, 'Ferngrove Education', 'ferngrove-education', 'Education', 95, 2010, 7100000, 'After-school learning centers.'),
  (8, 'Amberline Apparel', 'amberline-apparel', 'Fashion', 60, 2016, 6300000, 'Workwear made from recycled fabrics.'),
  (9, 'Kestrel Robotics', 'kestrel-robotics', 'Manufacturing', 140, 2013, 19400000, 'Warehouse robots and conveyor automation.'),
  (10, 'Driftwood Hospitality', 'driftwood-hospitality', 'Hospitality', 260, 2009, 17800000, 'Boutique hotels and a beach club.'),
  (11, 'Ironbark Construction', 'ironbark-construction', 'Construction', 180, 2005, 31000000, 'Commercial fit-outs and light construction.'),
  (12, 'Lumenfield Solar', 'lumenfield-solar', 'Energy', 75, 2018, 9800000, 'Rooftop solar for factories and warehouses.'),
  (13, 'Pebblebrook Pet Care', 'pebblebrook-pet-care', 'Retail', 55, 2016, 4200000, 'Pet clinics and grooming studios.'),
  (14, 'Starling Media House', 'starling-media-house', 'Media', 42, 2014, 5100000, 'Video production and podcast studio.'),
  (15, 'Thistledown Organics', 'thistledown-organics', 'Agriculture', 88, 2012, 6700000, 'Organic produce for restaurants.'),
  (16, 'Granite Peak Engineering', 'granite-peak-engineering', 'Engineering', 120, 2007, 15300000, 'Structural and civil engineering consultancy.'),
  (17, 'Velvetine Cosmetics', 'velvetine-cosmetics', 'Consumer Goods', 70, 2017, 11200000, 'Clean skincare sold online and in pharmacies.'),
  (18, 'Wavecrest Marine Supply', 'wavecrest-marine-supply', 'Distribution', 50, 2006, 8400000, 'Parts and supplies for fishing fleets.'),
  (19, 'Orchard Lane Realty', 'orchard-lane-realty', 'Real Estate', 35, 2013, 4800000, 'Residential sales and property management.'),
  (20, 'Silverbirch Software', 'silverbirch-software', 'Software', 85, 2015, 10600000, 'Scheduling software for clinics.'),
  (21, 'Juniper Freight Co', 'juniper-freight-co', 'Logistics', 150, 2011, 16900000, 'Cross-border trucking.'),
  (22, 'Brasswood Furniture', 'brasswood-furniture', 'Manufacturing', 110, 2009, 9300000, 'Solid wood furniture for hotels.'),
  (23, 'Cloudberry Bakeries', 'cloudberry-bakeries', 'Food and Beverage', 130, 2014, 7600000, 'A chain of neighborhood bakeries.'),
  (24, 'Redfern Security', 'redfern-security', 'Professional Services', 300, 2008, 13400000, 'Guarding and alarm monitoring.'),
  (25, 'Marigold Events Agency', 'marigold-events-agency', 'Events', 25, 2016, 3100000, 'Corporate events and conferences.'),
  (26, 'Tealwater Beverages', 'tealwater-beverages', 'Food and Beverage', 64, 2018, 5900000, 'Sparkling teas and cold brew.'),
  (27, 'Fieldnote Research', 'fieldnote-research', 'Professional Services', 30, 2015, 2900000, 'Market research and customer interviews.'),
  (28, 'Hollowpine Outdoor Gear', 'hollowpine-outdoor-gear', 'Retail', 48, 2013, 6100000, 'Camping and hiking gear.'),
  (29, 'Sunmill Packaging', 'sunmill-packaging', 'Manufacturing', 160, 2006, 21500000, 'Compostable food packaging.'),
  (30, 'Larkspur Travel', 'larkspur-travel', 'Travel', 40, 2012, 4400000, 'Group and incentive travel.'),
  (31, 'Mosaic Tile Works', 'mosaic-tile-works', 'Manufacturing', 72, 2010, 5300000, 'Hand-glazed tiles.'),
  (32, 'Cinderhill Coffee Roasters', 'cinderhill-coffee-roasters', 'Food and Beverage', 38, 2017, 3600000, 'Specialty coffee roaster and cafes.'),
  (33, 'Bramblegate Wealth', 'bramblegate-wealth', 'Financial Services', 22, 2011, 4700000, 'Wealth planning for families.'),
  (34, 'Nimbus Print Lab', 'nimbus-print-lab', 'Media', 34, 2014, 2600000, 'Large-format and packaging print.'),
  (35, 'Oakhaven Senior Living', 'oakhaven-senior-living', 'Healthcare', 190, 2009, 12800000, 'Assisted living residences.'),
  (36, 'Glasswing Optics', 'glasswing-optics', 'Retail', 46, 2015, 3900000, 'Eyewear stores and an online shop.'),
  (37, 'Rivermint Health Foods', 'rivermint-health-foods', 'Food and Beverage', 52, 2019, 4100000, 'Plant-based snacks.'),
  (38, 'Tallgrass Agritech', 'tallgrass-agritech', 'Agriculture', 44, 2019, 3300000, 'Sensors and software for greenhouses.'),
  (39, 'Windrose Consulting', 'windrose-consulting', 'Professional Services', 26, 2016, 2800000, 'Operations consulting for manufacturers.'),
  (40, 'Emberly Candle Co', 'emberly-candle-co', 'Consumer Goods', 33, 2018, 2400000, 'Candles and home fragrance.'),
  (41, 'Cobalt Ledger Advisors', 'cobalt-ledger-advisors', 'Accounting', 60, 2004, null, 'Audit, tax and outsourced finance teams.'),
  (42, 'Lanternway Insurance Brokers', 'lanternway-insurance-brokers', 'Insurance', 45, 2007, null, 'Business and key-person insurance.'),
  (43, 'Meridian Desk Coworking', 'meridian-desk-coworking', 'Real Estate', 30, 2016, null, 'Coworking floors and meeting rooms.'),
  (44, 'Tidewater Private Bank', 'tidewater-private-bank', 'Banking', 400, 1998, null, 'Private banking for business owners.'),
  (45, 'Brightforge Legal', 'brightforge-legal', 'Legal', 55, 2010, null, 'Corporate and employment law.'),
  (51, 'Clearwater Dental Group', 'clearwater-dental-group', 'Healthcare', 70, 2014, 4300000, 'Dental clinics.'),
  (52, 'Foxglove Interiors', 'foxglove-interiors', 'Design', 24, 2016, 2200000, 'Office and hotel interiors.'),
  (53, 'Brightpath Tutors', 'brightpath-tutors', 'Education', 40, 2018, 1600000, 'Online tutoring.'),
  (54, 'Stonebridge Auto Parts', 'stonebridge-auto-parts', 'Distribution', 85, 2009, 9100000, 'Auto parts wholesale.'),
  (55, 'Ashgrove Florals', 'ashgrove-florals', 'Retail', 20, 2015, 1300000, 'Flowers for weddings and offices.'),
  (56, 'Quayside Fisheries', 'quayside-fisheries', 'Food and Beverage', 120, 2003, 12600000, 'Seafood processing and export.'),
  (57, 'Mapleton Steelworks', 'mapleton-steelworks', 'Manufacturing', 230, 1999, 27400000, 'Steel fabrication.'),
  (58, 'Seabright Swim Schools', 'seabright-swim-schools', 'Education', 60, 2013, 2100000, 'Swimming lessons for children.'),
  (59, 'Pinecrest Payroll', 'pinecrest-payroll', 'Software', 35, 2017, 3000000, 'Payroll software and services.'),
  (60, 'Hearthstone Kitchens', 'hearthstone-kitchens', 'Construction', 50, 2012, 4900000, 'Kitchen design and installation.')
) as c(n, name, slug, industry, employees, founded, revenue, description);

-- Revenue history for the member companies (calendar years)
insert into public.company_revenue_history (company_id, fiscal_year, revenue_usd)
select pg_temp.u('c0000000', n), (pg_temp.fy() - y)::text,
       round(c.fiscal_year_gross_revenue * (1 - 0.08 * y))
from generate_series(1, 40) n
join public.companies c on c.id = pg_temp.u('c0000000', n)
cross join (values (1), (2)) as yrs(y);

-- ---------------------------------------------------------------- forums
insert into public.forums (id, chapter_id, name)
select pg_temp.u('f0000000', n), (select id from public.chapters where chapter_name = 'EO Demo Chapter'), name
from (values (1, 'Forum Atlas'), (2, 'Forum Beacon'), (3, 'Forum Compass'),
             (4, 'Forum Delta'), (5, 'Forum Ember'), (6, 'Forum Summit')) as f(n, name);

-- ---------------------------------------------------------------- members
-- 40 members. Member 1 is the demo board sign-in, member 26 the demo member sign-in.
create temp table demo_members (n int, first text, last text, gender text, title text, interest text, bio text) on commit drop;
insert into demo_members values
  (1, 'Talia', 'Brenneman', 'female', 'Founder and CEO', 'Leader', 'Talia started Bluepeak Foods in her kitchen and now supplies sauces to grocers across the region. She joined the chapter five years ago and has chaired Learning and Membership.'),
  (2, 'Kofi', 'Arkwright', 'male', 'Managing Director', 'Leader', 'Kofi runs Northwind Logistics, the family freight business he took over at 29. He leads the chapter into next year as President-Elect.'),
  (3, 'Mirela', 'Santangelo', 'female', 'Co-founder', 'Networker', 'Mirela co-founded Saltmarsh Studio. She loves meeting founders and has brought more new members into the chapter than anyone else.'),
  (4, 'Devansh', 'Okafor', 'male', 'Founder', 'Learner', 'Devansh built Copperleaf Analytics from a side project. He runs the chapter newsletter and its social channels.'),
  (5, 'Ingrid', 'Valcourt', 'female', 'CEO', 'Networker', 'Ingrid leads Harborlight Clinics. She looks after the chapter''s strategic alliance partners.'),
  (6, 'Rafael', 'Lindqvist', 'male', 'Founding Partner', 'Leader', 'Rafael advises owner-run businesses on raising capital at Quillstone Capital and keeps the chapter books.'),
  (7, 'Yuki', 'Abernathy', 'female', 'Founder', 'Forum Fan', 'Yuki founded Ferngrove Education. She keeps the chapter bylaws and elections in order.'),
  (8, 'Leilani', 'Marchetti', 'female', 'Founder', 'Forum Fan', 'Leilani runs Amberline Apparel and trains every new forum moderator in the chapter.'),
  (9, 'Oskar', 'Nwosu', 'male', 'CEO', 'Networker', 'Oskar leads Kestrel Robotics and organizes the small-group My EO events members ask for.'),
  (10, 'Priya', 'Halvorsen', 'female', 'Managing Director', 'Learner', 'Priya runs Driftwood Hospitality and books the speakers for the chapter''s learning events.'),
  (11, 'Mateo', 'Kowalczyk', 'male', 'Founder', 'Leader', 'Mateo built Ironbark Construction. He checks in with every member at least twice a year.'),
  (12, 'Soraya', 'Pemberton', 'female', 'Founder', 'Networker', 'Soraya runs Lumenfield Solar and welcomes every visitor who comes to a chapter event.'),
  (13, 'Bastian', 'Achterberg', 'male', 'Owner', 'Leader', null),
  (14, 'Nadia', 'Fairweather', 'female', 'Founder', 'Learner', null),
  (15, 'Emeka', 'Lindholm', 'male', 'Founder', 'Forum Fan', null),
  (16, 'Chiara', 'Oyelaran', 'female', 'Managing Partner', 'Leader', null),
  (17, 'Henrik', 'Mbatha', 'male', 'Founder', 'Learner', null),
  (18, 'Ximena', 'Thorvald', 'female', 'Owner', 'Networker', null),
  (19, 'Jun-ho', 'Castellanos', 'male', 'Broker and Owner', 'Networker', null),
  (20, 'Freya', 'Adeyemi-Clarke', 'female', 'Co-founder and CTO', 'Learner', null),
  (21, 'Tobias', 'Ferreira-Lund', 'male', 'CEO', 'Forum Fan', null),
  (22, 'Amaya', 'Rosenquist', 'female', 'Owner', 'Forum Fan', null),
  (23, 'Idris', 'Vanterpool', 'male', 'Founder', 'Networker', null),
  (24, 'Saoirse', 'Delacroix', 'female', 'Managing Director', 'Leader', null),
  (25, 'Lorenzo', 'Whitlock', 'male', 'Founder', 'Networker', null),
  (26, 'Mei-Lin', 'Okoro', 'female', 'Founder', 'Learner', null),
  (27, 'Callum', 'Ivanovic', 'male', 'Founder', 'Learner', null),
  (28, 'Zainab', 'Holloway', 'female', 'Owner', 'Forum Fan', null),
  (29, 'Anders', 'Quintero', 'male', 'CEO', 'Leader', null),
  (30, 'Paloma', 'Strand', 'female', 'Founder', 'Networker', null),
  (31, 'Rohan', 'Elsworth', 'male', 'Owner', 'Forum Fan', null),
  (32, 'Greta', 'Mwangi', 'female', 'Founder', 'Learner', null),
  (33, 'Desmond', 'Achebe-Hart', 'male', 'Founding Partner', 'Leader', null),
  (34, 'Ilse', 'Moreau-Tan', 'female', 'Owner', 'Networker', null),
  (35, 'Kwame', 'Lindgren', 'male', 'CEO', 'Forum Fan', null),
  (36, 'Beatriz', 'Halloran', 'female', 'Founder', 'Learner', null),
  (37, 'Felix', 'Oduya', 'male', 'Founder', 'Learner', null),
  (38, 'Noor', 'Ashworth', 'female', 'Co-founder', 'Forum Fan', null),
  (39, 'Viktor', 'Sandoval-Reid', 'male', 'Founder', 'Networker', null),
  (40, 'Hana', 'Brightwater', 'female', 'Founder', 'Learner', null);

insert into public.people (
  id, email, name, first_name, last_name, preferred_name, gender, phone, city, country,
  company_id, headline, bio, source_site, channel_source, lifecycle_stage, personal_interest,
  member_health_status, marketing_consent, forum_id, forum_status, forum_placed_on, created_at
)
select pg_temp.u('d1000000', m.n),
       case m.n when 1 then 'demo-board@example.com' when 26 then 'demo-member@example.com'
                else lower(replace(m.first || '.' || m.last, '-', '')) || '@example.com' end,
       m.first || ' ' || m.last, m.first, m.last, null, m.gender,
       '+1 555 01' || lpad(m.n::text, 2, '0'), 'Harbor City', 'Demo Country',
       pg_temp.u('c0000000', m.n), m.title || ', ' || c.name, m.bio,
       'website', (array['Referrals', 'Referrals', 'Offline Sources', 'Organic Search', 'Direct Traffic'])[1 + m.n % 5]::channel_source,
       'Customer', m.interest::personal_interest,
       case when m.n in (29, 35) then 'At-Risk' else 'Healthy' end::member_health_status,
       'subscribed',
       case when m.n <= 36 then pg_temp.u('f0000000', 1 + (m.n - 1) % 6) end,
       case when m.n <= 36 then 'placed' when m.n = 37 then 'forum_trained' else 'waiting_ftp' end::forum_placement_status,
       case when m.n <= 36 then current_date - (pg_temp.joined(m.n) - 90) end,
       now() - pg_temp.joined(m.n) * interval '1 day'
from demo_members m
join public.companies c on c.id = pg_temp.u('c0000000', m.n);

insert into public.member_companies (person_id, company_id, role, title, ownership_pct)
select pg_temp.u('d1000000', n), pg_temp.u('c0000000', n), 'primary', m.title, 51 + (n * 7) % 49
from demo_members m;

-- Memberships: 37 to 40 joined this fiscal year; 35 is on leave; 34 holds a secondary membership
insert into public.chapter_memberships (person_id, chapter_id, membership_type, status, start_date, relationship_manager_id)
select pg_temp.u('d1000000', n),
       (select id from public.chapters where chapter_name = 'EO Demo Chapter'),
       case when n = 34 then 'Secondary Membership' else 'Primary Membership' end::chapter_membership_type,
       case when n = 35 then 'on_leave' else 'active' end::chapter_membership_status,
       case when n >= 37 then current_date - (30 + (40 - n) * 25)
            else current_date - pg_temp.joined(n) end,
       pg_temp.u('d1000000', 11)
from demo_members m;

-- Two former members (alumni)
insert into public.people (id, email, name, first_name, last_name, phone, city, company_id, source_site, lifecycle_stage, created_at)
values
  (pg_temp.u('d1000000', 601), 'garrick.holm@example.com', 'Garrick Holm', 'Garrick', 'Holm', '+1 555 0161', 'Harbor City', null, 'website', 'Customer', now() - interval '2400 days'),
  (pg_temp.u('d1000000', 602), 'petra.vinter@example.com', 'Petra Vinter', 'Petra', 'Vinter', '+1 555 0162', 'Eastport', null, 'website', 'Customer', now() - interval '2000 days');
insert into public.chapter_memberships (person_id, chapter_id, membership_type, status, start_date, end_date)
select id, (select id from public.chapters where chapter_name = 'EO Demo Chapter'), 'Primary Membership', 'elumni',
       created_at::date, current_date - 200
from public.people where id in (pg_temp.u('d1000000', 601), pg_temp.u('d1000000', 602));

-- Spouses and partners (SLPs) of three members
insert into public.people (id, email, name, first_name, last_name, phone, city, source_site, is_slp, slp_partner_id, created_at)
values
  (pg_temp.u('d1000000', 301), 'jasper.brenneman@example.com', 'Jasper Brenneman', 'Jasper', 'Brenneman', '+1 555 0131', 'Harbor City', 'website', true, pg_temp.u('d1000000', 1), now() - interval '900 days'),
  (pg_temp.u('d1000000', 302), 'anika.lindqvist@example.com', 'Anika Lindqvist', 'Anika', 'Lindqvist', '+1 555 0132', 'Harbor City', 'website', true, pg_temp.u('d1000000', 6), now() - interval '800 days'),
  (pg_temp.u('d1000000', 303), 'oren.halvorsen@example.com', 'Oren Halvorsen', 'Oren', 'Halvorsen', '+1 555 0133', 'Harbor City', 'website', true, pg_temp.u('d1000000', 10), now() - interval '700 days');
insert into public.member_relationships (member_person_id, related_person_id, relationship_type)
values (pg_temp.u('d1000000', 1), pg_temp.u('d1000000', 301), 'slp'),
       (pg_temp.u('d1000000', 6), pg_temp.u('d1000000', 302), 'slp'),
       (pg_temp.u('d1000000', 10), pg_temp.u('d1000000', 303), 'slp');

-- The chapter manager (staff, not a member)
insert into public.people (id, email, name, first_name, last_name, phone, city, source_site, is_eo_staff, headline, created_at)
values (pg_temp.u('d1000000', 401), 'sienna.rookwood@example.com', 'Sienna Rookwood', 'Sienna', 'Rookwood', '+1 555 0141', 'Harbor City', 'website', true, 'Chapter Manager', now() - interval '600 days');

-- Prospects (in the membership pipeline) and their companies
insert into public.people (id, email, name, first_name, last_name, phone, city, company_id, source_site, channel_source, lifecycle_stage, headline, created_at)
select pg_temp.u('d1000000', 100 + n), lower(first || '.' || replace(last, '-', '')) || '@example.com', first || ' ' || last, first, last,
       '+1 555 01' || (50 + n)::text, 'Harbor City', pg_temp.u('c0000000', 50 + n), 'website', src::channel_source, 'Opportunity',
       'Founder, ' || (select name from public.companies where id = pg_temp.u('c0000000', 50 + n)),
       now() - days * interval '1 day'
from (values
  (1, 'Ezra', 'Kallistrom', 'Organic Search', 12),
  (2, 'Dalia', 'Ferrante', 'Referrals', 55),
  (3, 'Arjun', 'Westerberg', 'Referrals', 48),
  (4, 'Camille', 'Osei-Brandt', 'Paid Social', 70),
  (5, 'Tomasz', 'Delgado', 'Referrals', 95),
  (6, 'Lucia', 'Ainsworth', 'Offline Sources', 110),
  (7, 'Sefa', 'Nakamura-Boyd', 'Referrals', 130),
  (8, 'Rosalind', 'Achterhof', 'Organic Search', 160),
  (9, 'Bram', 'Okeke', 'Paid Search', 140),
  (10, 'Fatima', 'Dunmore', 'Referrals', 120)
) as p(n, first, last, src, days);

-- Early leads (not yet in the pipeline)
insert into public.people (id, email, name, first_name, last_name, phone, city, source_site, channel_source, lifecycle_stage, created_at)
values
  (pg_temp.u('d1000000', 501), 'jonah.vreeland@example.com', 'Jonah Vreeland', 'Jonah', 'Vreeland', '+1 555 0171', 'Harbor City', 'website', 'Organic Search', 'Lead', now() - interval '6 days'),
  (pg_temp.u('d1000000', 502), 'odessa.kimuraplatt@example.com', 'Odessa Kimura-Platt', 'Odessa', 'Kimura-Platt', '+1 555 0172', 'Lakeside', 'website', 'Organic Social', 'Marketing Qualified Lead', now() - interval '15 days'),
  (pg_temp.u('d1000000', 503), 'ravi.thornquist@example.com', 'Ravi Thornquist', 'Ravi', 'Thornquist', '+1 555 0173', 'Harbor City', 'website', 'AI Referrals', 'Lead', now() - interval '3 days'),
  (pg_temp.u('d1000000', 504), 'elodie.sarr@example.com', 'Elodie Sarr', 'Elodie', 'Sarr', '+1 555 0174', 'Eastport', 'website', 'Referrals', 'Sales Qualified Lead', now() - interval '21 days');

-- Partner contacts (strategic alliance partners)
insert into public.people (id, email, name, first_name, last_name, phone, city, company_id, source_site, membership_type, membership_status, headline, created_at)
select pg_temp.u('d1000000', 200 + n), lower(first || '.' || last) || '@example.com', first || ' ' || last, first, last,
       '+1 555 01' || (80 + n)::text, 'Harbor City', pg_temp.u('c0000000', 40 + n), 'website', 'sap', 'not_member', title,
       now() - interval '300 days'
from (values
  (1, 'Wendell', 'Asquith', 'Partner, Cobalt Ledger Advisors'),
  (2, 'Marisol', 'Eberhardt', 'Director, Lanternway Insurance Brokers'),
  (3, 'Quentin', 'Abara', 'Community Lead, Meridian Desk Coworking'),
  (4, 'Helena', 'Voskuijlen', 'Head of Private Clients, Tidewater Private Bank'),
  (5, 'Dmitri', 'Ellacott', 'Managing Partner, Brightforge Legal')
) as s(n, first, last, title);

-- ---------------------------------------------------------------- board
-- This year's board (eleven chairs, two committee members, the chapter manager)
insert into public.board_appointments (id, person_id, board_role_id, position, scope, fiscal_year_start)
select pg_temp.u('ba000000', 100 + i), pg_temp.u('d1000000', person_n),
       (select id from public.board_roles where key = role_key), pos::board_position, 'Local', pg_temp.fy()
from (values
  (1, 1, 'president', 'Chair'), (2, 2, 'president-elect', 'Chair'), (3, 3, 'membership', 'Chair'),
  (4, 4, 'marcoms', 'Chair'), (5, 5, 'sap', 'Chair'), (6, 6, 'finance', 'Chair'),
  (7, 7, 'governance', 'Chair'), (8, 8, 'forum', 'Chair'), (9, 9, 'myeo', 'Chair'),
  (10, 10, 'learning', 'Chair'), (11, 11, 'member-engagement', 'Chair'),
  (13, 14, 'learning', 'Committee Member'), (14, 20, 'membership', 'Committee Member'),
  (15, 401, 'chapter-staff', null)
) as a(i, person_n, role_key, pos);

-- Last year's board
insert into public.board_appointments (id, person_id, board_role_id, position, scope, fiscal_year_start)
select pg_temp.u('ba000000', i), pg_temp.u('d1000000', person_n),
       (select id from public.board_roles where key = role_key), 'Chair', 'Local', pg_temp.fy() - 1
from (values
  (1, 13, 'president'), (2, 1, 'president-elect'), (3, 3, 'membership'), (4, 17, 'marcoms'),
  (5, 18, 'sap'), (6, 6, 'finance'), (7, 8, 'forum'), (8, 16, 'learning'), (9, 24, 'myeo')
) as a(i, person_n, role_key);

-- ---------------------------------------------------------------- My EO groups
insert into public.my_eo_groups (id, name, description, host_member_id)
values
  (pg_temp.u('b5000000', 1), 'Harbor Food Lovers', 'Members who eat their way around Harbor City once a quarter.', pg_temp.u('d1000000', 9)),
  (pg_temp.u('b5000000', 2), 'Trail Runners', 'Early morning runs on the coastal trail, coffee after.', pg_temp.u('d1000000', 21)),
  (pg_temp.u('b5000000', 3), 'Founder Book Club', 'One business book a month, discussed over dinner.', pg_temp.u('d1000000', 14));

-- ---------------------------------------------------------------- events
create temp table demo_events (
  n int, slug text, type text, audience text, spouses boolean, days int, hour numeric, hours numeric,
  title text, blurb text, speaker text, location text, capacity int, member_price int, guest_price int,
  rate int, featured boolean, group_n int, champion_n int
) on commit drop;
insert into demo_events values
  (1, 'scaling-without-losing-culture', 'learning', 'community', false, -150, 18, 3,
   'Scaling Without Losing Culture', 'How founders keep what made their company special while the team doubles. A practical evening on rituals, hiring and the first layer of managers.',
   'Aurelio Vance, author of The Steady Founder', 'The Lantern Rooms, Harbor City', 80, 0, 7500, 62, false, null, 10),
  (2, 'summer-family-picnic', 'social', 'member', true, -125, 11, 5,
   'Summer Family Picnic', 'Bring the whole family for games, a barbecue and a long lazy afternoon by the water.',
   null, 'Quayside Park Pavilion', 150, 0, 0, 48, false, null, 9),
  (3, 'forum-moderator-training', 'forum', 'member', false, -100, 9, 7,
   'Forum Moderator Training', 'A full-day workshop for new and returning forum moderators: running a great meeting, the gestalt protocol and handling hard conversations.',
   'Leilani Marchetti and a certified EO forum trainer', 'Copperleaf Analytics office, Harbor City', 24, 0, 0, 30, false, null, 8),
  (4, 'founder-finance-masterclass', 'learning', 'community', false, -80, 18, 3,
   'Founder Finance Masterclass', 'Cash flow, pricing and the five numbers every founder should know by heart, taught by a CFO who has sat on both sides of the table.',
   'Marguerite Oyelade-Quinn, fractional CFO', 'Harbor City Maritime Museum', 90, 0, 9500, 57, false, null, 6),
  (5, 'night-market-food-walk', 'my_eo', 'member', false, -60, 19, 3,
   'Night Market Food Walk', 'Twelve stalls, one evening. A walking dinner through the old harbor night market with the Harbor Food Lovers group.',
   null, 'Old Harbor Night Market', 20, 2500, 0, 28, false, 1, 9),
  (6, 'prospective-member-mixer', 'membership', 'community', false, -40, 18, 2.5,
   'Prospective Member Mixer', 'An easy evening for founders curious about the chapter. Meet members, hear how forum works and ask anything.',
   null, 'Driftwood Hotel rooftop, Harbor City', 60, 0, 0, 36, false, null, 3),
  (7, 'leading-through-uncertainty', 'learning', 'community', false, -25, 18, 3,
   'Leading Through Uncertainty: A Fireside Chat', 'A three-time founder on the decisions that kept his companies alive through two downturns, and what he would do differently.',
   'Casimir Tollefsen, three-time founder', 'The Lantern Rooms, Harbor City', 80, 0, 7500, 60, false, null, 10),
  (8, 'autumn-chapter-gala', 'social', 'member', true, -10, 19, 4,
   'Autumn Chapter Gala', 'Our big night of the year: dinner, a few short speeches, the member awards and dancing.',
   null, 'Old Customs House, Harbor City', 140, 12000, 0, 72, false, null, 11),
  (9, 'ai-for-operators-workshop', 'learning', 'community', false, 9, 17, 3,
   'AI for Operators Workshop', 'Bring a laptop and a real problem from your business. Leave with three working automations and a plan for your team.',
   'Imogen Strathairn, operations and automation coach', 'Meridian Desk Coworking, Harbor City', 50, 0, 0, 42, true, null, 10),
  (10, 'year-end-celebration-dinner', 'social', 'member', true, 23, 19, 4,
   'Year-End Celebration Dinner', 'Close the year with your chapter: a long table dinner, a look back at the year and a toast to what comes next.',
   null, 'Driftwood Hotel ballroom, Harbor City', 120, 0, 0, 46, false, null, 11),
  (11, 'explore-eo-open-house', 'membership', 'community', false, 38, 18, 2,
   'Explore EO: Open House for Founders', 'Running a business with more than a million in revenue? Come and see what a founder peer group can do for you.',
   null, 'Saltmarsh Studio, Harbor City', 50, 0, 0, 14, false, null, 3),
  (12, 'negotiation-lab', 'learning', 'community', false, 55, 18, 3,
   'Negotiation Lab', 'Live role plays on pricing, partnerships and hiring, with feedback from a coach who has trained sales teams on four continents.',
   'Tamsin Graylock, negotiation coach', 'The Lantern Rooms, Harbor City', 60, 0, 0, 22, false, null, 10);

insert into public.events (
  id, slug, type, status, visibility, audience, allow_spouses, title, blurb, speaker, location,
  starts_at, ends_at, capacity, price_amount, currency, featured, my_eo_group_id, champion,
  survey_enabled, allow_guests, guest_price_amount, scope, created_at
)
select pg_temp.u('e0000000', n), slug, type::event_type,
       case when days < 0 then 'completed' else 'open' end::event_status,
       case when audience = 'community' then 'public' when spouses then 'members_plus_spouses' else 'members_only' end::event_visibility,
       audience::content_audience, spouses, title, blurb, speaker, location,
       pg_temp.at(days, hour), pg_temp.at(days, hour + hours), capacity, 0, 'USD', featured,
       case when group_n is not null then pg_temp.u('b5000000', group_n) end,
       (select name from public.people where id = pg_temp.u('d1000000', champion_n)),
       true, audience = 'community', guest_price, 'local', pg_temp.at(days - 45, 10)
from demo_events;

-- Ticket types: a member ticket, plus a guest or partner ticket where the event allows one.
-- The demo has no Stripe account, so upcoming tickets are free; past events keep
-- their paid ticket history. events.price_amount stays 0 so no checkout is offered.
insert into public.event_ticket_types (id, event_id, name, description, price_amount, currency, sort_order)
select pg_temp.u('e1000000', n * 10 + 1), pg_temp.u('e0000000', n), 'Member', 'For chapter members', member_price, 'USD', 0
from demo_events
union all
select pg_temp.u('e1000000', n * 10 + 2), pg_temp.u('e0000000', n), 'Guest', 'For invited guests and prospective members', guest_price, 'USD', 1
from demo_events where audience = 'community'
union all
select pg_temp.u('e1000000', n * 10 + 2), pg_temp.u('e0000000', n), 'Spouse or partner', 'For a member''s spouse or partner', member_price, 'USD', 1
from demo_events where spouses;

-- Member registrations. Past events: attended (checked in), no-shows and a few
-- cancellations. Upcoming events: registered.
insert into public.event_registrations (
  event_id, person_id, status, ticket_type_id, ticket_type, ticket_code, created_at, confirmed_at,
  checked_in_at, cancelled_at, amount_paid, price_final_total, price_currency, paid_at, channel_source
)
select e.id, pg_temp.u('d1000000', m.n), r.status::registration_status,
       pg_temp.u('e1000000', s.n * 10 + 1), 'Member',
       upper(substr(md5(e.id::text || 'member' || m.n), 1, 12)),
       r.created, r.created,
       case when r.status = 'attended' then e.starts_at + ((pg_temp.h(s.slug || m.n || 'c') % 40) - 10) * interval '1 minute' end,
       case when r.status = 'cancelled' then r.created + interval '3 days' end,
       case when s.member_price > 0 and r.status <> 'cancelled' then s.member_price end,
       case when s.member_price > 0 and r.status <> 'cancelled' then s.member_price end,
       case when s.member_price > 0 and r.status <> 'cancelled' then 'USD' end,
       case when s.member_price > 0 and r.status <> 'cancelled' then r.created end,
       'Email Marketing'
from demo_events s
join public.events e on e.id = pg_temp.u('e0000000', s.n)
cross join demo_members m
cross join lateral (
  select case
           when s.days > 0 then case when pg_temp.h(s.slug || m.n || 's') < 95 then 'registered' else 'cancelled' end
           when pg_temp.h(s.slug || m.n || 's') < 82 then 'attended'
           when pg_temp.h(s.slug || m.n || 's') < 93 then 'no_show'
           else 'cancelled'
         end as status,
         least(e.starts_at - interval '1 day', now() - interval '1 hour')
           - (pg_temp.h(s.slug || m.n || 'd') % 28) * interval '1 day' as created
) r
where (pg_temp.h(s.slug || m.n) < s.rate or (m.n = 26 and s.n in (4, 7, 9, 10)))
  -- members who joined recently only register for events after they joined
  and (m.n < 37 or s.days > -(30 + (40 - m.n) * 25))
  -- the member on leave skips events
  and m.n <> 35;

-- Spouses and partners at the family events
insert into public.event_registrations (event_id, person_id, status, ticket_type_id, ticket_type, ticket_code, created_at, confirmed_at, checked_in_at,
  amount_paid, price_final_total, price_currency, paid_at)
select e.id, p.id, case when s.days < 0 then 'attended' else 'registered' end::registration_status,
       pg_temp.u('e1000000', s.n * 10 + 2), 'Spouse or partner', upper(substr(md5(e.id::text || p.id::text), 1, 12)),
       e.starts_at - interval '12 days', e.starts_at - interval '12 days',
       case when s.days < 0 then e.starts_at + interval '5 minutes' end,
       nullif(s.member_price, 0), nullif(s.member_price, 0), case when s.member_price > 0 then 'USD' end,
       case when s.member_price > 0 then e.starts_at - interval '12 days' end
from demo_events s
join public.events e on e.id = pg_temp.u('e0000000', s.n)
join public.people p on p.is_slp
where s.spouses;

-- Prospects at the community events (they feed the pipeline's warmth signals)
insert into public.event_registrations (event_id, person_id, status, ticket_type_id, ticket_type, ticket_code, is_prospect,
  invited_by_person_id, created_at, confirmed_at, checked_in_at, channel_source)
select e.id, pg_temp.u('d1000000', 100 + x.p), case when s.days < 0 then 'attended' else 'registered' end::registration_status,
       pg_temp.u('e1000000', s.n * 10 + 2), 'Guest', upper(substr(md5(e.id::text || 'prospect' || x.p), 1, 12)), true,
       pg_temp.u('d1000000', 3), e.starts_at - interval '9 days', e.starts_at - interval '9 days',
       case when s.days < 0 then e.starts_at + interval '8 minutes' end, 'Referrals'
from (values (6, 2), (6, 3), (6, 4), (6, 5), (6, 6), (7, 4), (7, 6), (7, 7), (4, 5), (4, 7),
             (9, 1), (9, 3), (11, 1), (11, 2), (11, 3), (11, 4)) as x(ev, p)
join demo_events s on s.n = x.ev
join public.events e on e.id = pg_temp.u('e0000000', s.n);

-- Event feedback from attendees of five past events
insert into public.event_feedback (event_id, person_id, rating_overall, rating_speaker, would_recommend, event_value_rating, loved_text, improve_text, comments, created_at)
select r.event_id, r.person_id,
       case when pg_temp.h(r.id::text) < 55 then 5 when pg_temp.h(r.id::text) < 90 then 4 else 3 end,
       case when s.speaker is not null then 4 + pg_temp.h(r.id::text || 's') % 2 end,
       pg_temp.h(r.id::text || 'r') < 92,
       case when pg_temp.h(r.id::text || 'v') < 70 then 5 when pg_temp.h(r.id::text || 'v') < 93 then 4 else 3 end,
       (array['The speaker was honest about mistakes, not just wins.',
              'Small tables made it easy to talk to people I did not know.',
              'Practical takeaways I used the next morning.',
              'Great venue and the food was excellent.',
              'Hearing how other founders handle the same problems.'])[1 + pg_temp.h(r.id::text || 'l') % 5],
       (array['Start on time.', 'More time for questions.', 'A shorter first half.',
              'Share the slides afterwards.', 'Nothing, keep it this way.'])[1 + pg_temp.h(r.id::text || 'i') % 5],
       null,
       e.starts_at + interval '1 day' + (pg_temp.h(r.id::text || 't') % 48) * interval '1 hour'
from public.event_registrations r
join public.events e on e.id = r.event_id
join demo_events s on pg_temp.u('e0000000', s.n) = e.id
where r.status = 'attended' and s.n in (1, 4, 6, 7, 8)
  and r.person_id in (select pg_temp.u('d1000000', n) from demo_members)
  and pg_temp.h(r.id::text || 'f') < 60;

update public.events e
   set aggregate_rating = f.avg_rating, survey_sent_at = e.ends_at + interval '2 hours',
       survey_sent_count = f.sent
  from (select fb.event_id, round(avg(fb.rating_overall) * 2, 1) as avg_rating,
               (select count(*) from public.event_registrations r where r.event_id = fb.event_id and r.status = 'attended') as sent
          from public.event_feedback fb group by fb.event_id) f
 where f.event_id = e.id;

-- ---------------------------------------------------------------- dues and renewals
-- This year's dues cycle: most members have renewed, a few are still pending
insert into public.member_renewals (person_id, cycle, status, completed_at, consent_at, created_at)
select pg_temp.u('d1000000', n), pg_temp.fy() || '/' || (pg_temp.fy() + 1),
       case when n in (17, 23, 29, 31, 35, 39) then 'pending' else 'complete' end::renewal_status,
       case when n not in (17, 23, 29, 31, 35, 39) then make_date(pg_temp.fy(), 5, 1) + (n * 3) % 60 end,
       case when n not in (17, 23, 29, 31, 35, 39) then make_date(pg_temp.fy(), 5, 1) + (n * 3) % 60 end,
       make_date(pg_temp.fy(), 4, 15)
from demo_members where n < 37;
insert into public.member_renewals (person_id, cycle, status, completed_at, consent_at, created_at)
select pg_temp.u('d1000000', n), (pg_temp.fy() - 1) || '/' || pg_temp.fy(), 'complete',
       make_date(pg_temp.fy() - 1, 5, 10) + (n * 5) % 50, make_date(pg_temp.fy() - 1, 5, 10) + (n * 5) % 50,
       make_date(pg_temp.fy() - 1, 4, 15)
from demo_members where n < 37 and pg_temp.joined(n) > 520;

-- Annual re-qualification (company size check) for this year
insert into public.member_requalifications (person_id, fiscal_year_start, confirmed_name, confirmed_email, confirmed_phone, confirmed_company,
  revenue_2025, employee_count, biggest_challenge, exited_over_8m, ownership_pct, submitted_at)
select p.id, pg_temp.fy(), p.name, p.email, p.phone, c.name, c.fiscal_year_gross_revenue, c.employees,
       (array['Hiring a strong second layer of managers', 'Cash flow while we grow', 'Finding time to work on the business',
              'Entering a new market', 'Succession planning'])[1 + m.n % 5],
       false, 51 + (m.n * 7) % 49, least(make_date(pg_temp.fy(), 7, 1) + (m.n * 2) % 70, current_date)
from demo_members m
join public.people p on p.id = pg_temp.u('d1000000', m.n)
join public.companies c on c.id = p.company_id
-- the demo member (26) is left out so visitors can try the re-qualification form
where m.n < 37 and m.n % 4 <> 0 and m.n <> 26;

-- ---------------------------------------------------------------- membership pipeline
-- Member Acquisition: open prospects, two lost, and the four new members as won deals
insert into public.deals (id, person_id, company_id, name, pipeline, stage, deal_status, amount, currency, close_date,
  relationship_manager_id, primary_interest, channel_source, closed_lost_description, closed_lost_reason, closed_won_reason,
  global_dues, description, ql_financial_commitment, ql_founder_controlling_owner, ql_revenue_verified, ql_time_commitment,
  last_activity_at, updated_at, created_at)
select pg_temp.u('de000000', d.i), p.id, p.company_id, p.name || ' - ' || c.name, 'Member Acquisition', d.stage,
       d.status::deal_status, 5200, 'USD',
       case when d.status = 'open' then now() + d.close_in * interval '1 day' else now() - d.close_in * interval '1 day' end,
       pg_temp.u('d1000000', case when d.i % 2 = 0 then 3 else 20 end), 'Primary Membership', p.channel_source,
       d.lost::closed_lost_description, d.lost_note, d.won_note, 3200, d.descr,
       d.q >= 2, d.q >= 1, d.q >= 3, d.q >= 2,
       now() - d.touch * interval '1 day', now() - d.touch * interval '1 day', p.created_at
from (values
  (1, 101, 'Connect & Qualify', 'open', 75, null, null, null, 4, 0, 'Found us through search. Runs three dental clinics, wants a peer group.'),
  (2, 102, 'Experience EO', 'open', 60, null, null, null, 9, 1, 'Came to the prospective member mixer with Mirela.'),
  (3, 103, 'Experience EO', 'open', 60, null, null, null, 21, 1, 'Interested in forum; invited to the AI workshop.'),
  (4, 104, 'Go <> No Go Call', 'open', 45, null, null, null, 6, 2, 'Strong fit. Call booked with the Membership Chair.'),
  (5, 105, 'Revenue Verification Sent', 'open', 35, null, null, null, 11, 2, 'Revenue documents requested.'),
  (6, 106, 'Interview', 'open', 25, null, null, null, 3, 3, 'Interview with two board members next week.'),
  (7, 107, 'Payment Request', 'open', 10, null, null, null, 2, 3, 'Approved by the board. Dues invoice sent.'),
  (8, 108, 'Connect & Qualify', 'open', 90, null, null, null, 118, 0, 'No reply since the first call.'),
  (9, 109, 'Closed Lost', 'closed_lost', 30, 'Timing', 'Opening a second factory this year; asked us to call again next year.', null, 40, 1, null),
  (10, 110, 'Closed Lost', 'closed_lost', 55, 'Price / Dues Objection', 'Felt the dues were high for now.', null, 70, 1, null)
) as d(i, person_n, stage, status, close_in, lost, lost_note, won_note, touch, q, descr)
join public.people p on p.id = pg_temp.u('d1000000', d.person_n)
join public.companies c on c.id = p.company_id;

insert into public.deals (id, person_id, company_id, name, pipeline, stage, deal_status, amount, currency, close_date,
  relationship_manager_id, primary_interest, channel_source, closed_won_reason, global_dues, membership_start_date, membership_end_date,
  ql_financial_commitment, ql_founder_controlling_owner, ql_revenue_verified, ql_time_commitment, last_activity_at, updated_at, created_at)
select pg_temp.u('de000000', 10 + m.n), p.id, p.company_id, p.name || ' - ' || c.name, 'Member Acquisition', 'Closed Won', 'closed_won',
       5200, 'USD', cm.start_date, pg_temp.u('d1000000', 3), 'Primary Membership', p.channel_source,
       'Wanted a forum and the learning calendar.', 3200, cm.start_date, make_date(pg_temp.fy() + 1, 6, 30),
       true, true, true, true, cm.start_date, cm.start_date, cm.start_date - 75
from demo_members m
join public.people p on p.id = pg_temp.u('d1000000', m.n)
join public.companies c on c.id = p.company_id
join public.chapter_memberships cm on cm.person_id = p.id
where m.n >= 37;

-- Onboarding Track for the four new members
insert into public.deals (id, person_id, company_id, name, pipeline, stage, deal_status, currency, relationship_manager_id,
  membership_start_date, last_activity_at, updated_at, created_at)
select pg_temp.u('de000000', 60 + m.n), p.id, p.company_id, p.name || ' onboarding', 'Onboarding Track',
       (array['Forum Trained', 'Awaiting Forum Training', 'President''s Call', 'Welcome Email'])[m.n - 36], 'open', 'USD',
       pg_temp.u('d1000000', 11), cm.start_date, now() - (m.n - 35) * interval '2 days', now() - (m.n - 35) * interval '2 days', cm.start_date
from demo_members m
join public.people p on p.id = pg_temp.u('d1000000', m.n)
join public.chapter_memberships cm on cm.person_id = p.id
where m.n >= 37;

-- Notes on a few prospect deals
insert into public.deal_notes (deal_kind, deal_id, met_on, title, body, next_step, created_at)
values
  ('prospect', pg_temp.u('de000000', 4), current_date - 6, 'Coffee at the harbor', 'Camille runs an 85-person auto parts wholesaler and is stretched thin. Very keen on forum. Her co-founder is also curious.', 'Go or no go call with the Membership Chair', now() - interval '6 days'),
  ('prospect', pg_temp.u('de000000', 6), current_date - 3, 'Second meeting', 'Lucia came to two learning events and met four members. Revenue verified last month.', 'Board interview next week', now() - interval '3 days'),
  ('prospect', pg_temp.u('de000000', 7), current_date - 2, 'Approved', 'Board approved Sefa at the last meeting. Invoice for initiation fee and dues sent.', 'Confirm payment and book forum training', now() - interval '2 days'),
  ('prospect', pg_temp.u('de000000', 2), current_date - 9, 'Met at the mixer', 'Dalia asked good questions about confidentiality in forum. Wants to bring her business partner to the open house.', 'Invite to Explore EO open house', now() - interval '9 days');

-- Join-form applications from the prospects
insert into public.applications (person_id, company, role, industry, revenue_bucket, why, status, channel_source, created_at, decided_at, decided_by)
select p.id, c.name, 'Founder', c.industry, a.bucket, a.why, a.status::application_status, p.channel_source, p.created_at,
       case when a.status = 'approved' then now() - interval '9 days' end,
       case when a.status = 'approved' then 'Mirela Santangelo' end
from (values
  (101, '$1M to $5M', 'I want to learn from founders who have grown past where I am now.', 'pending'),
  (102, '$1M to $5M', 'A member told me forum changed how she runs her company.', 'review'),
  (103, '$1M to $5M', 'Looking for honest peers outside my company.', 'review'),
  (104, '$1M to $5M', 'Growing fast and want people to think out loud with.', 'coffee_scheduled'),
  (105, '$5M to $10M', 'Second-generation owner, want to modernize the business.', 'coffee_complete'),
  (106, '$10M to $25M', 'I miss having peers who understand the job.', 'coffee_complete'),
  (107, '$1M to $5M', 'Ready to commit to a forum and to the chapter.', 'approved')
) as a(person_n, bucket, why, status)
join public.people p on p.id = pg_temp.u('d1000000', a.person_n)
join public.companies c on c.id = p.company_id;

-- Inquiries: a sponsor offer, a podcast guest idea and two messages to the board
insert into public.inquiries (person_id, kind, payload, status, created_at)
values
  (null, 'partner_sponsor', jsonb_build_object('company', 'Seagrass Wealth Partners', 'name', 'Lionel Avery-Sato', 'email', 'lionel.averysato@example.com',
     'message', 'We would like to sponsor a learning event next spring.'), 'new', now() - interval '4 days'),
  (null, 'podcast_guest', jsonb_build_object('name', 'Rhiannon Castellane', 'email', 'rhiannon.castellane@example.com',
     'topic', 'Selling a family business without losing the family', 'message', 'I sold my company last year and would love to share the story.'), 'new', now() - interval '11 days'),
  (pg_temp.u('d1000000', 26), 'contact', jsonb_build_object('category', 'board', 'from_name', 'Mei-Lin Okoro', 'from_email', 'demo-member@example.com',
     'subject', 'Idea for a family event', 'message', 'Could we do a family day at the aquarium in spring? Happy to help organize.'), 'new', now() - interval '2 days'),
  (pg_temp.u('d1000000', 22), 'contact', jsonb_build_object('category', 'board', 'from_name', 'Amaya Rosenquist', 'from_email', 'amaya.rosenquist@example.com',
     'subject', 'Forum retreat dates', 'message', 'Our forum would like to share a venue with another forum for our retreat. Who should I talk to?'), 'read', now() - interval '16 days');

-- ---------------------------------------------------------------- strategic alliance partners
insert into public.sap_deals (id, company_id, status, deal_type, amount_usd, cash_usd, in_kind_usd, deal_owner, introduced_by, motivation,
  notes, last_contact_at, next_followup_at, closed_won_at, pipeline_stage, stage_changed_at, next_step, referred_by_person_id, created_at)
values
  (pg_temp.u('5a000000', 1), pg_temp.u('c0000000', 41), 'active', 'gold', 15000, 10000, 5000, 'Ingrid Valcourt', 'Rafael Lindqvist',
   'Wants to meet growing owner-run businesses.', 'Sponsors the Founder Finance Masterclass and two learning events.', current_date - 12, current_date + 30,
   current_date - 120, null, now() - interval '120 days', 'Plan the spring learning event together', pg_temp.u('d1000000', 6), now() - interval '200 days'),
  (pg_temp.u('5a000000', 2), pg_temp.u('c0000000', 42), 'active', 'silver', 8000, 8000, 0, 'Ingrid Valcourt', 'Kofi Arkwright',
   'Key-person insurance for founders.', 'Hosts one breakfast talk each half year.', current_date - 30, current_date + 14,
   current_date - 90, null, now() - interval '90 days', 'Confirm the breakfast talk date', pg_temp.u('d1000000', 2), now() - interval '160 days'),
  (pg_temp.u('5a000000', 3), pg_temp.u('c0000000', 43), 'in_discussion', 'silver', 6000, 0, 6000, 'Ingrid Valcourt', 'Devansh Okafor',
   'Wants members to try its meeting rooms.', 'Offering free meeting rooms for forum meetings in exchange for a silver package.', current_date - 5, current_date + 7,
   null, 'proposal', now() - interval '10 days', 'Send the proposal back with our changes', pg_temp.u('d1000000', 4), now() - interval '45 days'),
  (pg_temp.u('5a000000', 4), pg_temp.u('c0000000', 44), 'in_discussion', 'platinum', 25000, 25000, 0, 'Ingrid Valcourt', 'Talia Brenneman',
   'Private banking clients among founders.', 'First meeting went well; they asked for member numbers and the event calendar.', current_date - 8, current_date + 10,
   null, 'meeting', now() - interval '20 days', 'Second meeting with their regional head', pg_temp.u('d1000000', 1), now() - interval '35 days'),
  (pg_temp.u('5a000000', 5), pg_temp.u('c0000000', 45), 'lead', null, 0, null, null, 'Ingrid Valcourt', 'Saoirse Delacroix',
   'Employment law workshops.', null, current_date - 18, current_date + 5,
   null, 'contacted', now() - interval '18 days', 'Call to explain the partner packages', pg_temp.u('d1000000', 24), now() - interval '18 days');

insert into public.sap_deal_stage_events (deal_id, from_status, to_status, from_stage, to_stage, changed_at)
values
  (pg_temp.u('5a000000', 1), 'in_discussion', 'active', 'proposal', null, now() - interval '120 days'),
  (pg_temp.u('5a000000', 2), 'in_discussion', 'active', 'proposal', null, now() - interval '90 days'),
  (pg_temp.u('5a000000', 3), 'lead', 'in_discussion', 'contacted', 'meeting', now() - interval '30 days'),
  (pg_temp.u('5a000000', 3), 'in_discussion', 'in_discussion', 'meeting', 'proposal', now() - interval '10 days'),
  (pg_temp.u('5a000000', 4), 'lead', 'in_discussion', 'contacted', 'meeting', now() - interval '20 days');

-- ---------------------------------------------------------------- surveys
insert into public.surveys (id, kind, slug, name, description, status, starts_at, audience, intro_text, thank_you_text, created_at)
values
  (pg_temp.u('a0000000', 1), 'transformational_growth_pulse', 'transformational-growth-pulse', 'Transformational Growth Pulse',
   'A one-question check-in each quarter: how much is the chapter helping you grow?', 'published', now() - interval '400 days', 'member',
   'One question, one minute.', 'Thank you. Your board reads every answer.', now() - interval '400 days'),
  (pg_temp.u('a0000000', 2), 'other', 'member-priorities', 'Member Priorities Survey',
   'Tell the board what you want from the chapter this year.', 'published', now() - interval '70 days', 'member',
   'Four quick questions to shape this year''s calendar.', 'Thank you. The results go to the board meeting.', now() - interval '70 days');

insert into public.survey_fields (id, survey_id, position, type, label, help_text, required, config)
values
  (pg_temp.u('a1000000', 1), pg_temp.u('a0000000', 1), 0, 'rating', 'How much is the chapter helping you grow right now?', '1 is not at all, 5 is a lot', true, '{"min": 1, "max": 5}'),
  (pg_temp.u('a1000000', 2), pg_temp.u('a0000000', 1), 1, 'long_text', 'Anything you would like the board to know?', null, false, '{}'),
  (pg_temp.u('a1000000', 11), pg_temp.u('a0000000', 2), 0, 'single_choice', 'Which learning topic matters most to you this year?', null, true,
   '{"options": ["AI and automation", "Building a leadership team", "Exit and succession", "Family and wellbeing"]}'),
  (pg_temp.u('a1000000', 12), pg_temp.u('a0000000', 2), 1, 'rating', 'How valuable is your forum to you?', '1 is low, 5 is high', true, '{"min": 1, "max": 5}'),
  (pg_temp.u('a1000000', 13), pg_temp.u('a0000000', 2), 2, 'yes_no', 'Would you host a My EO event this year?', null, false, '{}'),
  (pg_temp.u('a1000000', 14), pg_temp.u('a0000000', 2), 3, 'long_text', 'What one change would make the chapter better for you?', null, false, '{}');

-- Pulse responses: four quarters of answers from most members
insert into public.survey_responses (id, survey_id, person_id, rating, comment, submitted_at, respondent_name, respondent_email, created_at)
select pg_temp.u('a2000000', q * 100 + m.n), pg_temp.u('a0000000', 1), p.id,
       case when pg_temp.h(m.n || 'p' || q) < 45 then 5 when pg_temp.h(m.n || 'p' || q) < 80 then 4
            when pg_temp.h(m.n || 'p' || q) < 94 then 3 else 2 end,
       case when pg_temp.h(m.n || 'c' || q) < 30 then
         (array['Forum has been the most useful part of my year.', 'The learning events are strong, I just need to make more of them.',
                'Would love more family events.', 'Busy quarter at work, I have not been able to attend much.',
                'The finance masterclass changed how I look at pricing.', 'My forum is the best board I never had.'])[1 + pg_temp.h(m.n || 'x' || q) % 6]
       end,
       now() - (q * 91 + pg_temp.h(m.n || 'd' || q) % 35 + 3) * interval '1 day', p.name, p.email,
       now() - (q * 91 + pg_temp.h(m.n || 'd' || q) % 35 + 3) * interval '1 day'
from demo_members m
join public.people p on p.id = pg_temp.u('d1000000', m.n)
cross join generate_series(0, 3) q
where pg_temp.h(m.n || 'r' || q) < 72 and m.n <> 35
  and (m.n < 37 or q = 0);

insert into public.survey_answers (response_id, field_id, value)
select r.id, pg_temp.u('a1000000', 1), r.rating::text from public.survey_responses r where r.survey_id = pg_temp.u('a0000000', 1)
union all
select r.id, pg_temp.u('a1000000', 2), r.comment from public.survey_responses r where r.survey_id = pg_temp.u('a0000000', 1) and r.comment is not null;

insert into public.survey_response_topics (response_id, topic)
select r.id, (array['Forum', 'Learning', 'Family', 'Business growth', 'Leadership'])[1 + pg_temp.h(r.id::text) % 5]
from public.survey_responses r
where r.survey_id = pg_temp.u('a0000000', 1) and r.comment is not null;

-- Member priorities responses
insert into public.survey_responses (id, survey_id, person_id, submitted_at, respondent_name, respondent_email, created_at)
select pg_temp.u('a2000000', 900 + m.n), pg_temp.u('a0000000', 2), p.id,
       now() - (pg_temp.h(m.n || 'mp') % 60 + 2) * interval '1 day', p.name, p.email,
       now() - (pg_temp.h(m.n || 'mp') % 60 + 2) * interval '1 day'
from demo_members m
join public.people p on p.id = pg_temp.u('d1000000', m.n)
where pg_temp.h(m.n || 'mpr') < 65 and m.n < 37;

insert into public.survey_answers (response_id, field_id, value)
select r.id, pg_temp.u('a1000000', 11),
       (array['AI and automation', 'AI and automation', 'Building a leadership team', 'Building a leadership team', 'Exit and succession', 'Family and wellbeing'])[1 + pg_temp.h(r.id::text || 'a') % 6]
from public.survey_responses r where r.survey_id = pg_temp.u('a0000000', 2)
union all
select r.id, pg_temp.u('a1000000', 12), (3 + pg_temp.h(r.id::text || 'b') % 3)::text
from public.survey_responses r where r.survey_id = pg_temp.u('a0000000', 2)
union all
select r.id, pg_temp.u('a1000000', 13), case when pg_temp.h(r.id::text || 'c') < 40 then 'Yes' else 'No' end
from public.survey_responses r where r.survey_id = pg_temp.u('a0000000', 2)
union all
select r.id, pg_temp.u('a1000000', 14),
       (array['More small-group dinners.', 'Start events on time.', 'A retreat with spouses.', 'Pair new members with a buddy.', 'More events with other chapters.'])[1 + pg_temp.h(r.id::text || 'd') % 5]
from public.survey_responses r where r.survey_id = pg_temp.u('a0000000', 2) and pg_temp.h(r.id::text || 'e') < 55;

-- ---------------------------------------------------------------- blog
insert into public.blog_posts (id, slug, title, subtitle, excerpt, blocks, category, tags, read_time_minutes, featured, author_name, author_role,
  status, published_at, audience, event_id, created_at)
values
  (pg_temp.u('b2000000', 1), 'five-numbers-every-founder-should-know', 'Five numbers every founder should know',
   'Notes from the Founder Finance Masterclass', 'Cash runway, gross margin by product, customer payback, revenue per employee and the owner''s real salary.',
   '[{"tag": "p", "text": "Forty founders spent an evening at the Maritime Museum with a fractional CFO, and the room went quiet when she asked who could name their cash runway without opening a laptop."},
     {"tag": "tl-dr", "items": ["Know your cash runway in weeks, not months", "Track gross margin per product line", "Measure how long a customer takes to pay back", "Watch revenue per employee as you hire", "Pay yourself a real salary and count it"]},
     {"tag": "h2", "text": "Runway in weeks"},
     {"tag": "p", "text": "Months hide problems. Counting in weeks makes a slow quarter feel urgent early enough to act."},
     {"tag": "h2", "text": "Margin by product"},
     {"tag": "p", "text": "Most of the room knew their overall margin. Very few knew which product quietly loses money."},
     {"tag": "pull-quote", "text": "I found out my best seller was my worst earner.", "attribution": "A chapter member"},
     {"tag": "h2", "text": "What members did next"},
     {"tag": "p", "text": "Three forums put a numbers check-in on their next agenda, and our finance chair is running a follow-up session in spring."}]'::jsonb,
   'Learning', array['finance', 'learning events'], 4, true, 'Devansh Okafor', 'Marketing & Communications Chair',
   'published', now() - interval '74 days', 'public', pg_temp.u('e0000000', 4), now() - interval '76 days'),
  (pg_temp.u('b2000000', 2), 'what-happens-in-a-forum', 'What actually happens in a forum',
   'A plain guide for founders thinking about joining', 'Eight founders, one room, once a month. Here is what a forum meeting looks like and why members say it is the reason they stay.',
   '[{"tag": "p", "text": "Forum is the heart of the chapter: a small group of founders who meet every month, in confidence, to talk about business, family and themselves."},
     {"tag": "h2", "text": "A typical meeting"},
     {"tag": "p", "text": "Each member shares the most important thing in their life since the last meeting. The group picks one or two topics to go deeper on. Nobody gives advice; members share their own experience instead."},
     {"tag": "emphasis-box", "label": "Confidential", "text": "What is said in forum stays in forum. That rule is what lets people be honest."},
     {"tag": "h2", "text": "Why members stay"},
     {"tag": "p", "text": "Ask a long-time member and you will hear the same thing: forum is the one place where nobody needs anything from them, and everybody understands the job."},
     {"tag": "cta-button", "label": "Come to an open house", "href": "/events"}]'::jsonb,
   'Membership', array['forum', 'membership'], 3, false, 'Leilani Marchetti', 'Forum Chair',
   'published', now() - interval '20 days', 'public', null, now() - interval '22 days');

-- ---------------------------------------------------------------- chapter metrics and goals
insert into public.chapter_metrics (fiscal_year, fiscal_year_start, president, members, retention_pct, revenue_usd, revenue_per_member_usd,
  forum_count, forum_health, chapter_events, average_event_score, end_of_year_reserves_usd, eo_grants_usd, sap_usd, dues_per_member_usd, initiation_fee_usd, secondary_dues_usd, dues_open)
values
  (pg_temp.fy_label(pg_temp.fy() - 3), pg_temp.fy() - 3, 'Chiara Oyelaran', 27, 88, 71500, 2648, 4, 'Good', 17, 8.6, 18200, 9000, 6000, 2400, 1500, 1600, false),
  (pg_temp.fy_label(pg_temp.fy() - 2), pg_temp.fy() - 2, 'Chiara Oyelaran', 31, 90, 86400, 2787, 5, 'Good', 19, 8.8, 24500, 11000, 9000, 2400, 1500, 1600, false),
  (pg_temp.fy_label(pg_temp.fy() - 1), pg_temp.fy() - 1, 'Bastian Achterberg', 36, 92, 104800, 2911, 6, 'Strong', 21, 9.0, 31700, 12000, 18000, 2500, 2000, 1700, false),
  (pg_temp.fy_label(pg_temp.fy()), pg_temp.fy(), 'Talia Brenneman', null, null, null, null, 6, null, null, null, null, null, 23000, 2600, 2000, 1700, true);

insert into public.chapter_goals (fiscal_year_start, net_growth_target_pct, risk_lapse_rate, source_note)
values (pg_temp.fy(), 12, 0.45, 'Board planning day: grow by about five net members this year.');

-- ---------------------------------------------------------------- strategy, goals and priorities
insert into public.strategies (id, year, title, body_md)
values (pg_temp.u('b4000000', 1), pg_temp.fy(), 'A chapter where every founder has peers who make them better',
'## Overview

A chapter where every founder has peers who make them better.

## We are

We are a close chapter of founders who show up for each other, in forum and outside it.

## We have

We have a calendar of learning, family and small-group events that members plan their year around.

## We are known for

We are known for honest forums and for helping members grow as leaders, not just as business owners.

## We are not

We are not a networking club, a sales channel, or a place to be seen.

## Themes

- ' || pg_temp.fy() || ': Belong, grow, lead

## Pillars

### Belong

1. Forum for everyone: every member placed in a forum within 90 days of joining.
2. Families: two events a year where spouses and children are welcome.

### Grow

1. Learning: six learning events a year, each rated 8.5 or better.
2. Partners: alliance partners who bring members something useful, not just a logo.

### Lead

1. Succession: every chair has a named successor by March.
2. New voices: at least three members serve on the board for the first time each year.
');

insert into public.objectives (id, year, level, office, strategy_id, title, status, owner_person_id, sort_order)
values
  (pg_temp.u('b0000000', 1), pg_temp.fy(), 'company', 'member_value', pg_temp.u('b4000000', 1), 'Every member belongs to a strong forum', 'active', pg_temp.u('d1000000', 8), 1),
  (pg_temp.u('b0000000', 2), pg_temp.fy(), 'company', 'growth', pg_temp.u('b4000000', 1), 'Grow the chapter with founders who fit', 'active', pg_temp.u('d1000000', 3), 2),
  (pg_temp.u('b0000000', 3), pg_temp.fy(), 'company', 'leadership', pg_temp.u('b4000000', 1), 'Build the next generation of chapter leaders', 'active', pg_temp.u('d1000000', 1), 3);

insert into public.key_results (id, objective_id, title, target_value, current_value, unit, direction, accountable_person_id, status, sort_order)
values
  (pg_temp.u('b1000000', 1), pg_temp.u('b0000000', 1), 'Members placed in a forum', 100, 92, '%', 'up', pg_temp.u('d1000000', 8), 'on_track', 1),
  (pg_temp.u('b1000000', 2), pg_temp.u('b0000000', 1), 'Average pulse score', 4.5, 4.1, 'out of 5', 'up', pg_temp.u('d1000000', 11), 'at_risk', 2),
  (pg_temp.u('b1000000', 3), pg_temp.u('b0000000', 2), 'Active members', 45, 39, 'members', 'up', pg_temp.u('d1000000', 3), 'on_track', 1),
  (pg_temp.u('b1000000', 4), pg_temp.u('b0000000', 2), 'Alliance partner revenue', 40000, 23000, 'usd', 'up', pg_temp.u('d1000000', 5), 'at_risk', 2),
  (pg_temp.u('b1000000', 5), pg_temp.u('b0000000', 2), 'Average learning event score', 8.5, 8.7, 'out of 10', 'up', pg_temp.u('d1000000', 10), 'on_track', 3),
  (pg_temp.u('b1000000', 6), pg_temp.u('b0000000', 3), 'Chairs with a named successor', 11, 4, 'chairs', 'up', pg_temp.u('d1000000', 2), 'off_track', 1),
  (pg_temp.u('b1000000', 7), pg_temp.u('b0000000', 3), 'Days from joining to forum placement', 90, 74, 'days', 'down', pg_temp.u('d1000000', 8), 'on_track', 2),
  (pg_temp.u('b1000000', 8), pg_temp.u('b0000000', 2), 'Net new members this year', 6, 3, 'members', 'up', pg_temp.u('d1000000', 1), 'on_track', 4),
  (pg_temp.u('b1000000', 9), pg_temp.u('b0000000', 2), 'Newsletter open rate', 45, 52, '%', 'up', pg_temp.u('d1000000', 4), 'on_track', 5),
  (pg_temp.u('b1000000', 10), pg_temp.u('b0000000', 2), 'Months of costs in reserve', 3, 2.4, 'months', 'up', pg_temp.u('d1000000', 6), 'at_risk', 6),
  (pg_temp.u('b1000000', 11), pg_temp.u('b0000000', 1), 'My EO events held', 6, 3, 'events', 'up', pg_temp.u('d1000000', 9), 'on_track', 3),
  (pg_temp.u('b1000000', 12), pg_temp.u('b0000000', 3), 'Board seats with a written role guide', 11, 9, 'seats', 'up', pg_temp.u('d1000000', 7), 'on_track', 3);

insert into public.chapter_priorities (fiscal_year_start, position, title, detail)
values
  (pg_temp.fy(), 1, 'Belong', 'Every member in a strong forum and families included.'),
  (pg_temp.fy(), 2, 'Grow', 'Great learning and partners who add value.'),
  (pg_temp.fy(), 3, 'Lead', 'A board pipeline with successors in every seat.');

insert into public.board_priorities (board_appointment_id, position, title, detail, objective_id, key_result_id)
select pg_temp.u('ba000000', 100 + a.i), a.pos, a.title, a.detail, pg_temp.u('b0000000', a.o), pg_temp.u('b1000000', a.kr)
from (values
  (1, 1, 'Name a successor for every chair', 'One-to-ones with every chair before the March board meeting.', 3, 6),
  (2, 1, 'Plan next year''s board', 'Shortlist and invite next year''s chairs.', 3, 6),
  (3, 1, 'Reach 45 members', 'Six more joiners than leavers this year.', 2, 3),
  (3, 2, 'Faster first forum', 'Book forum training within two weeks of joining.', 1, 7),
  (5, 1, 'Two new alliance partners', 'Close the bank and the coworking proposals.', 2, 4),
  (6, 1, 'Balanced budget with reserves', 'Keep three months of costs in reserve.', 2, 4),
  (8, 1, 'Place every new member', 'Open a seventh forum if the waiting list reaches five.', 1, 1),
  (10, 1, 'Six great learning events', 'Book the spring speakers by January.', 2, 5),
  (11, 1, 'Two check-ins with every member', 'Call the at-risk members first.', 1, 2)
) as a(i, pos, title, detail, o, kr);

-- ---------------------------------------------------------------- board meetings (second Tuesday of each month)
insert into public.board_meetings (id, meeting_on, starts_at, ends_at, location, fiscal_year_start, status, previous_minutes_approved, minutes_md)
select pg_temp.u('b3000000', k + 10), d, '15:00', '17:00', 'Saltmarsh Studio, Harbor City',
       extract(year from (d - interval '6 months'))::int,
       case when d < current_date then 'held' else 'upcoming' end,
       case when d < current_date then true end,
       case when d < current_date then
         '## Decisions' || chr(10) || chr(10) || '- Approved the event calendar for the next quarter.' || chr(10) ||
         '- Approved one new member after interview.' || chr(10) || chr(10) || '## Actions' || chr(10) || chr(10) ||
         '- Finance Chair to share the half-year budget review.' || chr(10) || '- Membership Chair to follow up with two prospects.' end
from generate_series(-3, 1) k
cross join lateral (
  select (date_trunc('month', current_date) + k * interval '1 month')::date as m0
) m
cross join lateral (
  select m.m0 + ((2 - extract(dow from m.m0)::int + 7) % 7 + 7) as d
) dd;

insert into public.meeting_updates (meeting_id, board_role_id, person_id, body_md)
select bm.id, br.id, ba.person_id, u.body
from public.board_meetings bm
join (values
  ('president', 'Board planning day is booked. Two chairs still need a successor.'),
  ('membership', 'Pipeline has eight open prospects; one approved and invoiced.'),
  ('finance', 'Dues collection at 85 percent. Gala came in under budget.'),
  ('learning', 'Spring speakers shortlisted; AI workshop is nearly full.'),
  ('forum', 'Three new members waiting for forum training in January.'),
  ('sap', 'Bank proposal in second meeting; coworking proposal in review.')
) as u(role_key, body) on true
join public.board_roles br on br.key = u.role_key
join public.board_appointments ba on ba.board_role_id = br.id and ba.fiscal_year_start = pg_temp.fy() and ba.position = 'Chair'
where bm.status = 'held' and bm.meeting_on = (select max(meeting_on) from public.board_meetings where status = 'held');

-- ---------------------------------------------------------------- workboards
insert into public.board_members (board_id, person_id, role)
select b.id, pg_temp.u('d1000000', n), case when n = 1 then 'owner' else 'member' end
from public.boards b
cross join (values (1), (2), (3), (4), (5), (6), (8), (10), (11), (401)) as m(n)
where b.slug = 'board' or (b.slug = 'marketing' and m.n in (1, 4, 401));

insert into public.tasks (id, title, description, status, due_date, completed_at, assignee_id, created_by, board_id, board_column_id, position, priority, created_at)
select pg_temp.u('ac000000', t.i), t.title, t.descr,
       case when t.col = 'Done' then 'completed' when t.col = 'Doing' then 'in_progress' else 'open' end,
       current_date + t.due, case when t.col = 'Done' then now() - interval '3 days' end,
       pg_temp.u('d1000000', t.who), pg_temp.u('d1000000', 1), b.id, bc.id, t.i, t.prio, now() - (20 - t.i) * interval '1 day'
from (values
  (1, 'board', 'To do', 'Draft next year''s board shortlist', 'List two names for every chair and share before the planning day.', 2, 30, 'p2'),
  (2, 'board', 'Doing', 'Book spring learning speakers', 'Three speakers for March to May. Budget is in the finance sheet.', 10, 12, 'p1'),
  (3, 'board', 'Doing', 'Follow up on dues still pending', 'Six members still to renew. Personal calls, not email.', 6, 5, 'p1'),
  (4, 'board', 'Waiting', 'Bank partnership proposal', 'Waiting for their regional head to confirm the second meeting.', 5, 10, 'p2'),
  (5, 'board', 'To do', 'Forum training for new members', 'Three new members need forum training in January.', 8, 40, 'p2'),
  (6, 'board', 'Done', 'Gala budget wrap-up', 'Final numbers shared with the board.', 6, -3, 'p3'),
  (7, 'board', 'Done', 'Approve Q3 event calendar', null, 1, -20, 'p3'),
  (8, 'board', 'To do', 'Check in with at-risk members', 'Two members flagged at risk in the pulse. Coffee with each.', 11, 14, 'p1'),
  (9, 'board', 'Waiting', 'Interview Lucia Ainsworth', 'Two board members to interview; waiting on her dates.', 3, 7, 'p2'),
  (10, 'board', 'To do', 'Year-end dinner run of show', null, 401, 20, 'p3'),
  (11, 'marketing', 'Doing', 'Post the AI workshop on social', 'Three posts in the week before the workshop.', 4, 4, 'p2'),
  (12, 'marketing', 'To do', 'Write the gala recap', 'Photos are in the shared folder.', 4, 6, 'p3'),
  (13, 'marketing', 'To do', 'Open house invitation email', 'Send to all leads and members four weeks before.', 401, 10, 'p2'),
  (14, 'marketing', 'Done', 'Publish the forum guide post', null, 4, -18, 'p3'),
  (15, 'marketing', 'Waiting', 'New member welcome posts', 'Waiting for photos from the four new members.', 401, 9, 'p3'),
  (16, 'board', 'Doing', 'Board planning day agenda', 'Half-day session on next year''s goals and successors.', 1, 6, 'p1'),
  (17, 'board', 'To do', 'Thank-you notes to gala partners', 'Handwritten notes to Cobalt Ledger and Lanternway.', 1, 3, 'p2'),
  (18, 'board', 'Waiting', 'Approve the half-year budget review', 'Waiting for the Finance Chair''s numbers.', 1, 16, 'p2')
) as t(i, board_slug, col, title, descr, who, due, prio)
join public.boards b on b.slug = t.board_slug
join public.board_columns bc on bc.board_id = b.id and bc.name = t.col;

-- ---------------------------------------------------------------- long term plan (three years)
insert into public.long_term_plan_statements (key, section, pillar, item_no, part_no, title, body, sort_order)
values
  ('vision-1', 'vision', null, 1, 1, 'Vision', 'In three years every founder in Harbor City with a million-dollar business knows the chapter, and every member says it made them a better leader.', 1),
  ('leadership-1', 'pillar', 'leadership', 1, 1, 'Succession', 'Every chair has a named successor who shadows them for a full year.', 10),
  ('leadership-2', 'pillar', 'leadership', 2, 1, 'New voices', 'At least a third of the board serves for the first time each year.', 11),
  ('operational-1', 'pillar', 'operational_excellence', 1, 1, 'One source of truth', 'Members, events, dues and partners are run from the chapter platform, not spreadsheets.', 20),
  ('operational-2', 'pillar', 'operational_excellence', 2, 1, 'Healthy reserves', 'Three months of costs held in reserve at every year end.', 21),
  ('member-value-1', 'pillar', 'member_value', 1, 1, 'Forum first', 'Every member placed in a forum within 90 days of joining.', 30),
  ('member-value-2', 'pillar', 'member_value', 2, 1, 'Learning that sticks', 'Six learning events a year, each rated 8.5 or better.', 31),
  ('growth-1', 'pillar', 'growth', 1, 1, 'Steady growth', 'Grow to 60 members by adding the right founders, not just more of them.', 40),
  ('growth-2', 'pillar', 'growth', 2, 1, 'Useful partners', 'Alliance partners cover a third of chapter costs.', 41),
  ('resource-1', 'resource', null, 1, 1, 'People', 'A part-time chapter manager and a volunteer committee behind every chair.', 50);

insert into public.long_term_plan_metrics (metric_key, label, unit, fiscal_year_start, period_label, value_numeric, entry, sort_order)
select k.key, k.label, k.unit, pg_temp.fy() + y.o, pg_temp.fy_label(pg_temp.fy() + y.o), k.v[y.o + 2], case when y.o < 0 then 'staff' else 'input' end, k.sort
from (values
  ('members', 'Members on 1 July', 'count', array[36, 39, 48, 60], 1),
  ('joiners', 'New members', 'count', array[7, 9, 12, 14], 2),
  ('renewal_rate', 'Renewal rate', 'percent', array[0.92, 0.92, 0.93, 0.93], 3),
  ('local_dues', 'Local dues per member (USD)', 'usd', array[2500, 2600, 2600, 2700], 4),
  ('sap_revenue', 'Alliance partner revenue (USD)', 'usd', array[18000, 40000, 60000, 80000], 5)
) as k(key, label, unit, v, sort)
cross join (values (-1), (0), (1), (2)) as y(o);

-- ---------------------------------------------------------------- the board's radar
insert into public.issues (title, diagnosis, key_result_id, filed_by, assignee_person_id, status, notes_md, created_at)
values
  ('Only four chairs have a named successor', 'goal', pg_temp.u('b1000000', 6), 'Talia Brenneman', pg_temp.u('d1000000', 2), 'open',
   'Planning day is the deadline. Each chair brings one name.', now() - interval '12 days'),
  ('Alliance partner revenue behind plan', 'goal', pg_temp.u('b1000000', 4), 'Ingrid Valcourt', pg_temp.u('d1000000', 5), 'solving',
   'Bank proposal could close the gap on its own.', now() - interval '20 days'),
  ('Three new members waiting for forum training', 'execution', pg_temp.u('b1000000', 7), 'Leilani Marchetti', pg_temp.u('d1000000', 8), 'open',
   'Next training is in January; ask the regional trainer for an earlier date.', now() - interval '5 days'),
  ('Event check-in queue at the gala', 'system', null, 'Sienna Rookwood', pg_temp.u('d1000000', 401), 'open',
   'Use two check-in phones at the door for big events.', now() - interval '8 days');

-- ---------------------------------------------------------------- member newsletters
insert into public.newsletters (title, subtitle, summary, slug, sent_at, audience, status, blocks)
values
  ('The month in the chapter', 'Gala recap, spring speakers and a new forum', 'Thank you for a wonderful gala, the spring learning line-up and three new members to welcome.',
   'the-month-in-the-chapter', now() - interval '8 days', 'members', 'published',
   '[{"tag": "h2", "text": "Thank you for the gala"},
     {"tag": "p", "text": "Over a hundred of you came to the Old Customs House. The member awards went to two forums that met every single month this year."},
     {"tag": "h2", "text": "Spring speakers"},
     {"tag": "p", "text": "The learning committee has shortlisted three speakers on pricing, hiring and selling a business. Dates go out in January."},
     {"tag": "h2", "text": "Welcome"},
     {"tag": "p", "text": "Please welcome Felix, Noor, Viktor and Hana. Say hello at the year-end dinner."}]'::jsonb),
  ('Back from summer', 'The new board year starts here', 'Meet this year''s board, the theme for the year and the first events on the calendar.',
   'back-from-summer', now() - interval '110 days', 'members', 'published',
   '[{"tag": "p", "text": "A new board year has started. Our theme is simple: belong, grow, lead."},
     {"tag": "tl-dr", "items": ["Forum moderator training in August", "Founder Finance Masterclass in September", "Night market food walk with the Harbor Food Lovers"]},
     {"tag": "p", "text": "Reply to this email if you would like to help on a committee."}]'::jsonb);

commit;
