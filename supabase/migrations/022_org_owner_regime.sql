-- Dodavanje kolona za režim oporezivanja vlasnika obrta
alter table public.organizations
add column if not exists owner_tax_regime text check (owner_tax_regime in ('STVARNI_DOHODAK', 'PAUSALNI', 'OSTALI')),
add column if not exists owner_activity_category text check (owner_activity_category in ('SLOBODNA_ZANIMANJA', 'OBRT_SRODNE', 'POLJOPRIVREDA_SUMARSTVO', 'TRGOVAC_POJEDINAC'));
