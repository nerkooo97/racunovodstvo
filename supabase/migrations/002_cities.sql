create table public.cities (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  municipality     text not null,
  municipality_code text not null,
  canton           text not null,
  canton_code      text not null,
  postal_code      text not null,
  entity           text not null default 'fbih'
);

create index on public.cities (name);
create index on public.cities (municipality_code);

-- No RLS — public reference data

insert into public.cities (name, municipality, municipality_code, canton, canton_code, postal_code) values

-- Kanton Sarajevo (KS)
('Sarajevo (Centar)',      'Centar Sarajevo',     '077', 'Kanton Sarajevo', 'KS', '71000'),
('Sarajevo (Stari Grad)',  'Stari Grad Sarajevo', '101', 'Kanton Sarajevo', 'KS', '71000'),
('Sarajevo (Novi Grad)',   'Novi Grad Sarajevo',  '079', 'Kanton Sarajevo', 'KS', '71000'),
('Sarajevo (Novo Sarajevo)', 'Novo Sarajevo',     '080', 'Kanton Sarajevo', 'KS', '71000'),
('Ilidža',                'Ilidža',              '070', 'Kanton Sarajevo', 'KS', '71210'),
('Vogošća',               'Vogošća',             '110', 'Kanton Sarajevo', 'KS', '71320'),
('Ilijaš',                'Ilijaš',              '071', 'Kanton Sarajevo', 'KS', '71380'),
('Hadžići',               'Hadžići',             '065', 'Kanton Sarajevo', 'KS', '71240'),
('Trnovo (KS)',           'Trnovo',              '107', 'Kanton Sarajevo', 'KS', '71267'),

-- Tuzlanski kanton (TK)
('Tuzla',                 'Tuzla',               '094', 'Tuzlanski kanton', 'TK', '75000'),
('Živinice',              'Živinice',            '114', 'Tuzlanski kanton', 'TK', '75270'),
('Gračanica',             'Gračanica',           '058', 'Tuzlanski kanton', 'TK', '75320'),
('Lukavac',               'Lukavac',             '075', 'Tuzlanski kanton', 'TK', '75300'),
('Srebrenik',             'Srebrenik',           '100', 'Tuzlanski kanton', 'TK', '75350'),
('Banovići',              'Banovići',            '005', 'Tuzlanski kanton', 'TK', '75290'),
('Kalesija',              'Kalesija',            '072', 'Tuzlanski kanton', 'TK', '75260'),
('Kladanj',               'Kladanj',             '074', 'Tuzlanski kanton', 'TK', '75280'),
('Sapna',                 'Sapna',               '099', 'Tuzlanski kanton', 'TK', '75411'),
('Čelić',                 'Čelić',               '016', 'Tuzlanski kanton', 'TK', '75246'),
('Teočak',                'Teočak',              '106', 'Tuzlanski kanton', 'TK', '75412'),

-- Zeničko-dobojski kanton (ZDK)
('Zenica',                'Zenica',              '112', 'Zeničko-dobojski kanton', 'ZDK', '72000'),
('Kakanj',                'Kakanj',              '073', 'Zeničko-dobojski kanton', 'ZDK', '72240'),
('Visoko',                'Visoko',              '111', 'Zeničko-dobojski kanton', 'ZDK', '71300'),
('Zavidovići',            'Zavidovići',          '113', 'Zeničko-dobojski kanton', 'ZDK', '72220'),
('Maglaj',                'Maglaj',              '076', 'Zeničko-dobojski kanton', 'ZDK', '74250'),
('Tešanj',                'Tešanj',              '105', 'Zeničko-dobojski kanton', 'ZDK', '74260'),
('Žepče',                 'Žepče',               '115', 'Zeničko-dobojski kanton', 'ZDK', '72230'),
('Breza',                 'Breza',               '011', 'Zeničko-dobojski kanton', 'ZDK', '72130'),
('Vareš',                 'Vareš',               '109', 'Zeničko-dobojski kanton', 'ZDK', '72330'),
('Olovo',                 'Olovo',               '083', 'Zeničko-dobojski kanton', 'ZDK', '71340'),
('Usora',                 'Usora',               '108', 'Zeničko-dobojski kanton', 'ZDK', '74230'),
('Doboj-Jug',             'Doboj-Jug',           '024', 'Zeničko-dobojski kanton', 'ZDK', '74207'),
('Doboj-Istok',           'Doboj-Istok',         '023', 'Zeničko-dobojski kanton', 'ZDK', '74207'),

-- Hercegovačko-neretvanski kanton (HNK)
('Mostar',                'Mostar',              '081', 'Hercegovačko-neretvanski kanton', 'HNK', '88000'),
('Čapljina',              'Čapljina',            '014', 'Hercegovačko-neretvanski kanton', 'HNK', '88300'),
('Čitluk',                'Čitluk',              '018', 'Hercegovačko-neretvanski kanton', 'HNK', '88260'),
('Konjic',                'Konjic',              '076', 'Hercegovačko-neretvanski kanton', 'HNK', '88400'),
('Jablanica',             'Jablanica',           '067', 'Hercegovačko-neretvanski kanton', 'HNK', '88420'),
('Stolac',                'Stolac',              '103', 'Hercegovačko-neretvanski kanton', 'HNK', '88360'),
('Neum',                  'Neum',                '082', 'Hercegovačko-neretvanski kanton', 'HNK', '88390'),
('Prozor-Rama',           'Prozor',              '092', 'Hercegovačko-neretvanski kanton', 'HNK', '88440'),
('Ravno',                 'Ravno',               '094', 'Hercegovačko-neretvanski kanton', 'HNK', '88370'),

-- Una-sanski kanton (USK)
('Bihać',                 'Bihać',               '006', 'Una-sanski kanton', 'USK', '77000'),
('Cazin',                 'Cazin',               '015', 'Una-sanski kanton', 'USK', '77220'),
('Velika Kladuša',        'Velika Kladuša',      '110', 'Una-sanski kanton', 'USK', '77230'),
('Bosanska Krupa',        'Bosanska Krupa',       '009', 'Una-sanski kanton', 'USK', '77240'),
('Sanski Most',           'Sanski Most',          '098', 'Una-sanski kanton', 'USK', '79260'),
('Ključ',                 'Ključ',               '073', 'Una-sanski kanton', 'USK', '79280'),
('Bosanski Petrovac',     'Bosanski Petrovac',    '010', 'Una-sanski kanton', 'USK', '77250'),
('Bužim',                 'Bužim',               '012', 'Una-sanski kanton', 'USK', '77245'),
('Krupa na Uni',          'Krupa na Uni',         '074', 'Una-sanski kanton', 'USK', '77240'),

-- Střednja Bosna / Kanton Središnja Bosna (SBK)
('Travnik',               'Travnik',             '107', 'Kanton Središnja Bosna', 'SBK', '72270'),
('Vitez',                 'Vitez',               '111', 'Kanton Središnja Bosna', 'SBK', '72250'),
('Bugojno',               'Bugojno',             '012', 'Kanton Središnja Bosna', 'SBK', '70230'),
('Kiseljak',              'Kiseljak',            '073', 'Kanton Središnja Bosna', 'SBK', '71250'),
('Novi Travnik',          'Novi Travnik',         '082', 'Kanton Središnja Bosna', 'SBK', '72290'),
('Busovača',              'Busovača',             '013', 'Kanton Središnja Bosna', 'SBK', '72260'),
('Gornji Vakuf-Uskoplje', 'Gornji Vakuf-Uskoplje', '057', 'Kanton Središnja Bosna', 'SBK', '70240'),
('Donji Vakuf',           'Donji Vakuf',          '026', 'Kanton Središnja Bosna', 'SBK', '70220'),
('Fojnica',               'Fojnica',             '047', 'Kanton Središnja Bosna', 'SBK', '71270'),
('Jajce',                 'Jajce',               '067', 'Kanton Središnja Bosna', 'SBK', '70101'),
('Kreševo',               'Kreševo',             '075', 'Kanton Središnja Bosna', 'SBK', '71260'),
('Dobretići',             'Dobretići',           '025', 'Kanton Središnja Bosna', 'SBK', '70220'),

-- Zapadnohercegovački kanton (ZHK)
('Široki Brijeg',         'Široki Brijeg',       '102', 'Zapadnohercegovački kanton', 'ZHK', '88220'),
('Ljubuški',              'Ljubuški',            '076', 'Zapadnohercegovački kanton', 'ZHK', '88320'),
('Grude',                 'Grude',               '059', 'Zapadnohercegovački kanton', 'ZHK', '88340'),
('Posušje',               'Posušje',             '091', 'Zapadnohercegovački kanton', 'ZHK', '88240'),

-- Bosansko-podrinjski kanton Goražde (BPK)
('Goražde',               'Goražde',             '057', 'Bosansko-podrinjski kanton', 'BPK', '73000'),
('Foča-FBiH',             'Foča-FBiH',           '047', 'Bosansko-podrinjski kanton', 'BPK', '73300'),
('Pale-FBiH',             'Pale-FBiH',           '086', 'Bosansko-podrinjski kanton', 'BPK', '73310'),

-- Posavski kanton (PK)
('Orašje',                'Orašje',              '084', 'Posavski kanton', 'PK', '76270'),
('Odžak',                 'Odžak',               '083', 'Posavski kanton', 'PK', '76290'),
('Domaljevac-Šamac',      'Domaljevac-Šamac',    '025', 'Posavski kanton', 'PK', '76270'),

-- Kanton 10 / Livanjski kanton (LK)
('Livno',                 'Livno',               '076', 'Livanjski kanton', 'LK', '80101'),
('Tomislavgrad',          'Tomislavgrad',         '107', 'Livanjski kanton', 'LK', '80240'),
('Kupres',                'Kupres',              '075', 'Livanjski kanton', 'LK', '80260'),
('Drvar',                 'Drvar',               '027', 'Livanjski kanton', 'LK', '80250'),
('Bosansko Grahovo',      'Bosansko Grahovo',    '010', 'Livanjski kanton', 'LK', '80230'),
('Glamoč',                'Glamoč',              '053', 'Livanjski kanton', 'LK', '80220');
